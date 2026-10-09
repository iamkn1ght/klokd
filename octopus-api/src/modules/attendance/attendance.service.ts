import { randomInt } from 'crypto';
import prisma from '../../config/database';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { calculateDistance, toGeoHash } from '../../utils/geoUtils';
import { logAudit } from '../../utils/auditLogger';
import { complianceService } from '../compliance/compliance.service';
import { notificationService } from '../notification/notification.service';

/**
 * Attendance — the Uber-style on-site flow:
 *
 *   ARRIVED      worker taps "I've arrived"; server checks time window, WIBA,
 *                geofence + GPS accuracy, tells the employer      (≈ "driver arrived")
 *   STARTED      worker enters the employer's 4-digit start PIN   (≈ trip PIN)
 *                — or the employer starts it with a reason (OVERRIDE_START)
 *   CLOCKED_OUT  location recorded but never blocks; settlement created
 *                with a dispute window, then auto-approved          (≈ end trip, fare)
 *
 * Plus the no-show watcher (LATE_WARNING → NO_SHOW → employer resolves) and
 * the admin review queue. Every step is an append-only AttendanceEvent; the
 * server clock is the only clock. Raw coordinates are never stored (D-14).
 */

export type AttendanceType =
  | 'ARRIVED'
  | 'STARTED'
  | 'OVERRIDE_START'
  | 'PIN_LOCKED'
  | 'CLOCKED_OUT'
  | 'LATE_WARNING'
  | 'NO_SHOW'
  | 'NO_SHOW_RESOLVED';

export interface LocationEvidence {
  lat?: number;
  lng?: number;
  accuracy?: number;
  mocked?: boolean;
}

export const OVERRIDE_REASONS = ['GPS_FAILED', 'PIN_LOCKED', 'WORKER_PHONE_ISSUE', 'OTHER'] as const;
export type OverrideReason = (typeof OVERRIDE_REASONS)[number];

const A = () => config.attendance;
const minutes = (n: number) => n * 60_000;

function newPin(): string {
  return String(randomInt(0, 10_000)).padStart(4, '0');
}

function workerDisplayName(w: { firstName: string; lastName: string } | null | undefined): string {
  return w ? `${w.firstName} ${w.lastName.charAt(0)}.`.trim() : 'Your worker';
}

export class AttendanceService {
  // ─── Helpers ────────────────────────────────────────────

  private async record(data: {
    tenantId: string;
    shiftId: string;
    workerId: string | null;
    employerId: string;
    type: AttendanceType;
    method: string;
    actorId: string;
    geoHash?: string | null;
    distanceM?: number | null;
    accuracyM?: number | null;
    geofenceResult?: string | null;
    flags?: string[];
    reason?: string | null;
  }) {
    return prisma.attendanceEvent.create({
      data: { ...data, flags: JSON.stringify(data.flags ?? []) },
    });
  }

  private async loadWorkerShift(shiftId: string, userId: string) {
    const worker = await prisma.worker.findUnique({ where: { userId } });
    const shift = await prisma.shift.findUnique({ where: { id: shiftId }, include: { employer: true } });
    if (!worker || !shift || shift.workerId !== worker.id) {
      throw new AppError(404, 'Shift not found');
    }
    return { worker, shift };
  }

  private async loadEmployerShift(shiftId: string, userId: string) {
    const employer = await prisma.employer.findUnique({ where: { userId } });
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { worker: true, employer: true },
    });
    if (!employer || !shift || shift.employerId !== employer.id) {
      throw new AppError(404, 'Shift not found');
    }
    return { employer, shift };
  }

  /** Compliance gates an override can never bypass. */
  private async complianceGates(shift: { employerId: string; tenantId: string }, worker: { verificationStatus: string }) {
    if (worker.verificationStatus !== 'APPROVED') {
      throw new AppError(403, 'The worker’s ID verification isn’t complete.', true, 'KYC_TIER_INSUFFICIENT');
    }
    const wiba = await complianceService.checkWiba(shift.employerId, shift.tenantId);
    if (!wiba.confirmed) {
      throw new AppError(403, `WIBA cover isn’t confirmed for this venue: ${wiba.reason}`, true, 'WIBA_REQUIRED');
    }
  }

  private locate(shift: { locationLat: number; locationLng: number }, loc: LocationEvidence) {
    if (loc.lat == null || loc.lng == null) {
      return { geoHash: null, distanceM: null, accuracyM: null, geofenceResult: 'no_location', flags: ['NO_LOCATION'] };
    }
    const distanceM = Math.round(calculateDistance(loc.lat, loc.lng, shift.locationLat, shift.locationLng));
    const accuracyM = loc.accuracy != null ? Math.round(loc.accuracy) : null;
    const flags: string[] = [];
    if (loc.mocked) flags.push('MOCK_LOCATION');
    return {
      geoHash: toGeoHash(loc.lat, loc.lng),
      distanceM,
      accuracyM,
      geofenceResult: distanceM <= config.platform.gpsClockInRadiusMeters ? 'inside' : 'outside',
      flags,
    };
  }

  /** The start PIN, created when the employer picks the worker. */
  async ensurePin(shiftId: string): Promise<string> {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId }, select: { startPin: true } });
    if (shift?.startPin) return shift.startPin;
    const pin = newPin();
    await prisma.shift.update({ where: { id: shiftId }, data: { startPin: pin } });
    return pin;
  }

  // ─── 4. Worker arrives ──────────────────────────────────

  async arrive(shiftId: string, userId: string, loc: LocationEvidence) {
    const { worker, shift } = await this.loadWorkerShift(shiftId, userId);

    if (shift.status !== 'ACCEPTED') {
      throw new AppError(409, shift.status === 'CONFIRMED'
        ? 'Confirm the shift before you check in.'
        : 'This shift isn’t waiting for you to arrive.', true, 'INVALID_STATE');
    }
    if (shift.arrivedAt) return this.workerView(shift.id, userId);

    const now = Date.now();
    if (now < shift.startTime.getTime() - minutes(A().arriveEarlyMinutes) || now > shift.endTime.getTime()) {
      throw new AppError(
        422,
        `You can check in from ${A().arriveEarlyMinutes} minutes before the shift starts until it ends.`,
        true,
        'OUTSIDE_TIME_WINDOW'
      );
    }

    await this.complianceGates(shift, worker);

    if (loc.lat == null || loc.lng == null) {
      throw new AppError(422, 'We need your location to check you in.', true, 'LOCATION_REQUIRED');
    }
    const where = this.locate(shift, loc);
    if (where.accuracyM != null && where.accuracyM > A().maxAccuracyMeters) {
      throw new AppError(
        422,
        `Your GPS signal is weak (±${where.accuracyM} m). Step outside or near a window and try again.`,
        true,
        'LOW_ACCURACY'
      );
    }
    if (where.geofenceResult === 'outside') {
      throw new AppError(
        422,
        `You’re ${where.distanceM} m from the venue. Get within ${config.platform.gpsClockInRadiusMeters} m to check in.`,
        true,
        'OUT_OF_GEOFENCE'
      );
    }

    await prisma.shift.update({ where: { id: shift.id }, data: { arrivedAt: new Date() } });
    await this.ensurePin(shift.id);
    await this.record({
      tenantId: shift.tenantId,
      shiftId: shift.id,
      workerId: worker.id,
      employerId: shift.employerId,
      type: 'ARRIVED',
      method: 'gps',
      actorId: userId,
      ...where,
    });

    void notificationService.send({
      tenantId: shift.tenantId,
      userId: shift.employer.userId,
      type: 'attendance.arrived',
      title: `${workerDisplayName(worker)} has arrived`,
      body: `${worker.firstName} is at the venue for the ${shift.role} shift. Give them your start PIN to begin.`,
    }).catch(err => console.error('[ATTENDANCE] arrive notify failed:', err));

    return this.workerView(shift.id, userId);
  }

  // ─── 5. Start with the employer's PIN ───────────────────

  async startWithPin(shiftId: string, userId: string, pin: string) {
    const { worker, shift } = await this.loadWorkerShift(shiftId, userId);
    if (shift.status !== 'ACCEPTED') {
      throw new AppError(409, 'This shift can’t be started right now.', true, 'INVALID_STATE');
    }
    if (!shift.arrivedAt) {
      throw new AppError(409, 'Check in at the venue first.', true, 'NOT_ARRIVED');
    }
    if (shift.pinAttempts >= A().maxPinAttempts) {
      throw new AppError(423, 'Too many wrong PINs. Ask the manager to start the shift from their app.', true, 'PIN_LOCKED');
    }

    if (!shift.startPin || pin !== shift.startPin) {
      const attempts = shift.pinAttempts + 1;
      await prisma.shift.update({ where: { id: shift.id }, data: { pinAttempts: attempts } });
      if (attempts >= A().maxPinAttempts) {
        await this.record({
          tenantId: shift.tenantId,
          shiftId: shift.id,
          workerId: worker.id,
          employerId: shift.employerId,
          type: 'PIN_LOCKED',
          method: 'pin',
          actorId: userId,
          flags: ['PIN_LOCKED'],
        });
        throw new AppError(423, 'Too many wrong PINs. Ask the manager to start the shift from their app.', true, 'PIN_LOCKED');
      }
      const left = A().maxPinAttempts - attempts;
      throw new AppError(422, `That PIN doesn’t match. ${left} ${left === 1 ? 'try' : 'tries'} left.`, true, 'WRONG_PIN');
    }

    await this.complianceGates(shift, worker);
    return this.markStarted(shift, worker.id, userId, 'pin', null);
  }

  // ─── 5b. Employer starts the shift (fallback) ───────────

  async employerStart(shiftId: string, userId: string, reason: OverrideReason, note?: string) {
    const { shift } = await this.loadEmployerShift(shiftId, userId);
    if (shift.status !== 'ACCEPTED' || !shift.worker) {
      throw new AppError(409, shift.status === 'CONFIRMED'
        ? 'The worker hasn’t confirmed the shift yet.'
        : 'This shift can’t be started right now.', true, 'INVALID_STATE');
    }
    // Overrides replace the GPS / PIN step only — never the compliance gates.
    await this.complianceGates(shift, shift.worker);

    const started = await this.markStarted(
      shift,
      shift.worker.id,
      userId,
      'employer_override',
      [reason, note?.trim()].filter(Boolean).join(' · ')
    );

    void notificationService.send({
      tenantId: shift.tenantId,
      userId: shift.worker.userId,
      type: 'attendance.override_start',
      title: 'Your shift has started',
      body: `${shift.employer.businessName} started your ${shift.role} shift for you. If that’s wrong, report it in the app.`,
    }).catch(err => console.error('[ATTENDANCE] override notify failed:', err));

    await this.checkOverrideThreshold(shift.tenantId, shift.employerId, shift.employer.businessName);
    return started;
  }

  private async markStarted(
    shift: { id: string; tenantId: string; employerId: string; startTime: Date; employer: { userId: string } },
    workerId: string,
    actorId: string,
    method: 'pin' | 'employer_override' | 'legacy_app',
    reason: string | null,
    where?: ReturnType<AttendanceService['locate']>
  ) {
    const now = new Date();
    const flags: string[] = [...(where?.flags ?? [])];
    if (method === 'employer_override') flags.push('EMPLOYER_OVERRIDE');
    if (method === 'legacy_app') flags.push('NO_PIN_LEGACY_APP');
    if (now.getTime() > shift.startTime.getTime() + minutes(A().lateStartGraceMinutes)) flags.push('LATE_START');

    const arrived = await prisma.attendanceEvent.findFirst({
      where: { shiftId: shift.id, type: 'ARRIVED' },
      orderBy: { effectiveAt: 'desc' },
    });

    const updated = await prisma.shift.update({
      where: { id: shift.id },
      data: {
        status: 'ACTIVE',
        clockInAt: now,
        clockInGeoHash: where?.geoHash ?? arrived?.geoHash ?? null,
        arrivedAt: method === 'legacy_app' ? now : undefined,
      },
    });
    await prisma.shiftEvent.create({
      data: {
        tenantId: shift.tenantId,
        shiftId: shift.id,
        fromState: 'ACCEPTED',
        toState: 'ACTIVE',
        actorId,
        metadata: JSON.stringify({ method }),
      },
    });
    await this.record({
      tenantId: shift.tenantId,
      shiftId: shift.id,
      workerId,
      employerId: shift.employerId,
      type: method === 'employer_override' ? 'OVERRIDE_START' : 'STARTED',
      method,
      actorId,
      geoHash: where?.geoHash ?? null,
      distanceM: where?.distanceM ?? null,
      accuracyM: where?.accuracyM ?? null,
      geofenceResult: where?.geofenceResult ?? null,
      flags,
      reason,
    });

    if (method !== 'employer_override') {
      void notificationService.send({
        tenantId: shift.tenantId,
        userId: shift.employer.userId,
        type: 'attendance.started',
        title: 'Shift started',
        body: 'Your worker has started the shift.',
      }).catch(err => console.error('[ATTENDANCE] start notify failed:', err));
    }
    return updated;
  }

  /**
   * Old worker-app builds call POST /clockin directly. Keep them working, but
   * the start carries NO_PIN_LEGACY_APP so it lands in the review queue.
   */
  async legacyClockIn(shiftId: string, userId: string, loc: LocationEvidence) {
    const { worker, shift } = await this.loadWorkerShift(shiftId, userId);
    if (shift.status !== 'ACCEPTED') {
      throw new AppError(409, 'This shift can’t be started right now.', true, 'INVALID_STATE');
    }
    await this.complianceGates(shift, worker);
    const where = this.locate(shift, loc);
    if (where.geofenceResult !== 'inside') {
      throw new AppError(
        422,
        `You are ${where.distanceM ?? '?'}m from the venue. Must be within ${config.platform.gpsClockInRadiusMeters}m to clock in.`,
        true,
        'OUT_OF_GEOFENCE'
      );
    }
    return this.markStarted(shift, worker.id, userId, 'legacy_app', null, where);
  }

  // ─── 7. Clock-out (never blocks on location) ────────────

  async clockOut(shiftId: string, userId: string, loc: LocationEvidence) {
    const { worker, shift } = await this.loadWorkerShift(shiftId, userId);
    if (shift.status !== 'ACTIVE') {
      throw new AppError(409, 'This shift isn’t running.', true, 'INVALID_STATE');
    }

    const now = new Date();
    const where = this.locate(shift, loc);
    const flags = [...where.flags];
    if (where.geofenceResult === 'outside') flags.push('CLOCKOUT_OUTSIDE_GEOFENCE');

    const scheduledMinutes = Math.round((shift.endTime.getTime() - shift.startTime.getTime()) / 60_000);
    const workedMinutes = Math.max(0, Math.round((now.getTime() - (shift.clockInAt ?? now).getTime()) / 60_000));
    if (scheduledMinutes > 0 && workedMinutes < scheduledMinutes * A().earlyClockOutRatio) flags.push('EARLY_CLOCKOUT');

    // Pay due — the rate is per shift. Statutory deductions come from the
    // compliance engine; the platform fee is charged to the employer on top.
    const deductions = await complianceService.calculateDeductions(shift.tenantId, shift.rateKes);
    const platformFeeKes = Math.round((shift.rateKes * config.platform.feePercent) / 100);
    const approveBy = new Date(now.getTime() + config.platform.escrowAutoReleaseHours * 3600_000);

    const [updated] = await prisma.$transaction([
      prisma.shift.update({
        where: { id: shift.id },
        data: { status: 'COMPLETED', clockOutAt: now, clockOutGeoHash: where.geoHash },
      }),
      prisma.shiftEvent.create({
        data: {
          tenantId: shift.tenantId,
          shiftId: shift.id,
          fromState: 'ACTIVE',
          toState: 'COMPLETED',
          actorId: userId,
          metadata: JSON.stringify({ workedMinutes }),
        },
      }),
      prisma.shiftSettlement.create({
        data: {
          tenantId: shift.tenantId,
          shiftId: shift.id,
          workerId: worker.id,
          employerId: shift.employerId,
          scheduledMinutes,
          workedMinutes,
          grossKes: shift.rateKes,
          payeKes: deductions.payeKes,
          nssfTier1Kes: deductions.nssfTier1Kes,
          nssfTier2Kes: deductions.nssfTier2Kes,
          shifKes: deductions.shifKes,
          ahlKes: deductions.ahlKes,
          netKes: deductions.netKes,
          platformFeeKes,
          employerTotalKes: shift.rateKes + platformFeeKes,
          approveBy,
        },
      }),
      // Escrow auto-release timer (only meaningful once holds are funded on the rail).
      prisma.escrow.updateMany({ where: { shiftId: shift.id }, data: { autoReleaseAt: approveBy } }),
    ]);

    await this.record({
      tenantId: shift.tenantId,
      shiftId: shift.id,
      workerId: worker.id,
      employerId: shift.employerId,
      type: 'CLOCKED_OUT',
      method: 'gps',
      actorId: userId,
      geoHash: where.geoHash,
      distanceM: where.distanceM,
      accuracyM: where.accuracyM,
      geofenceResult: where.geofenceResult,
      flags,
    });

    void notificationService.send({
      tenantId: shift.tenantId,
      userId: shift.employer.userId,
      type: 'attendance.clocked_out',
      title: `${workerDisplayName(worker)} finished the shift`,
      body: `Check the hours and approve pay of KES ${shift.rateKes.toLocaleString()}. It approves automatically in ${config.platform.escrowAutoReleaseHours} hours unless you report a problem.`,
    }).catch(err => console.error('[ATTENDANCE] clock-out notify failed:', err));

    return updated;
  }

  // ─── 8. Settlement ──────────────────────────────────────

  async approveSettlement(shiftId: string, userId: string) {
    const { shift } = await this.loadEmployerShift(shiftId, userId);
    const s = await prisma.shiftSettlement.findUnique({ where: { shiftId: shift.id } });
    if (!s) throw new AppError(404, 'No pay is due on this shift yet.');
    if (s.status !== 'AWAITING_APPROVAL') return s;
    if (shift.status === 'DISPUTED') {
      throw new AppError(409, 'This shift has an open dispute.', true, 'DISPUTED');
    }
    const approved = await prisma.shiftSettlement.update({
      where: { id: s.id },
      data: { status: 'APPROVED', approvedAt: new Date(), approvedBy: userId },
    });
    await logAudit({
      tenantId: shift.tenantId,
      actorId: userId,
      action: 'settlement.approved',
      resource: 'shift',
      resourceId: shift.id,
      metadata: { netKes: s.netKes, by: 'employer' },
    });
    return approved;
  }

  /** Called by the watcher: close dispute windows that have run out. */
  async autoApproveDue(): Promise<number> {
    const due = await prisma.shiftSettlement.findMany({
      where: { status: 'AWAITING_APPROVAL', approveBy: { lte: new Date() } },
      include: { shift: { select: { status: true } } },
    });
    let n = 0;
    for (const s of due) {
      if (s.shift.status === 'DISPUTED') continue;
      await prisma.shiftSettlement.update({
        where: { id: s.id },
        data: { status: 'APPROVED', approvedAt: new Date(), approvedBy: 'auto' },
      });
      n++;
    }
    // PENDING (Kipkiren Pay): APPROVED settlements are paid out by
    // paymentService.disbursePayment once escrow holds are funded on the rail.
    return n;
  }

  /** A dispute pauses the settlement. */
  async markDisputed(shiftId: string) {
    await prisma.shiftSettlement.updateMany({
      where: { shiftId, status: 'AWAITING_APPROVAL' },
      data: { status: 'DISPUTED' },
    });
  }

  // ─── 10. Late / no-show watcher ─────────────────────────

  async runWatcher(now = new Date()): Promise<{ warned: number; noShows: number; approved: number }> {
    let warned = 0;
    let noShows = 0;
    const candidates = await prisma.shift.findMany({
      where: {
        status: { in: ['CONFIRMED', 'ACCEPTED'] },
        arrivedAt: null,
        clockInAt: null,
        lateStage: { lt: 2 },
        startTime: { lte: new Date(now.getTime() - minutes(A().lateWarningMinutes)) },
      },
      include: { worker: true, employer: true },
    });

    for (const shift of candidates) {
      const late = now.getTime() - shift.startTime.getTime();
      const stage = late >= minutes(A().noShowMinutes) ? 2 : 1;
      if (stage <= shift.lateStage) continue;
      // Claim the stage first so overlapping runs never double-notify.
      const claimed = await prisma.shift.updateMany({
        where: { id: shift.id, lateStage: shift.lateStage },
        data: { lateStage: stage },
      });
      if (claimed.count === 0) continue;

      const name = workerDisplayName(shift.worker);
      const minsLate = Math.round(late / 60_000);
      await this.record({
        tenantId: shift.tenantId,
        shiftId: shift.id,
        workerId: shift.workerId,
        employerId: shift.employerId,
        type: stage === 2 ? 'NO_SHOW' : 'LATE_WARNING',
        method: 'system',
        actorId: 'system',
        flags: stage === 2 ? ['NO_SHOW'] : [],
        reason: `${minsLate} min after start${shift.status === 'CONFIRMED' ? ' · worker never confirmed' : ''}`,
      });

      if (stage === 1) {
        warned++;
        if (shift.worker) {
          void notificationService.send({
            tenantId: shift.tenantId,
            userId: shift.worker.userId,
            accountUuid: shift.worker.accountUuid,
            type: 'attendance.late_warning',
            title: 'Your shift has started',
            body: `Your ${shift.role} shift at ${shift.employer.businessName} started ${minsLate} min ago. Check in when you arrive.`,
          }).catch(() => undefined);
        }
        void notificationService.send({
          tenantId: shift.tenantId,
          userId: shift.employer.userId,
          type: 'attendance.late_warning',
          title: `${name} is running late`,
          body: `${name} hasn’t checked in for the ${shift.role} shift yet. We’ve reminded them.`,
        }).catch(() => undefined);
      } else {
        noShows++;
        void notificationService.send({
          tenantId: shift.tenantId,
          userId: shift.employer.userId,
          type: 'attendance.no_show',
          title: `${name} hasn’t shown up`,
          body: `It’s ${minsLate} min past the start of the ${shift.role} shift. Wait, find a replacement, or cancel — open the shift to choose.`,
        }).catch(() => undefined);
      }
    }

    const approved = await this.autoApproveDue();
    return { warned, noShows, approved };
  }

  async resolveNoShow(shiftId: string, userId: string, action: 'wait' | 'replace' | 'cancel') {
    const { shift } = await this.loadEmployerShift(shiftId, userId);
    if (!['CONFIRMED', 'ACCEPTED'].includes(shift.status) || shift.lateStage < 2) {
      throw new AppError(409, 'There’s no no-show to resolve on this shift.', true, 'INVALID_STATE');
    }

    await this.record({
      tenantId: shift.tenantId,
      shiftId: shift.id,
      workerId: shift.workerId,
      employerId: shift.employerId,
      type: 'NO_SHOW_RESOLVED',
      method: 'employer',
      actorId: userId,
      reason: action,
    });

    if (action === 'wait') return prisma.shift.findUnique({ where: { id: shift.id } });

    const noShowWorkerId = shift.workerId;
    if (action === 'cancel') {
      const updated = await prisma.shift.update({ where: { id: shift.id }, data: { status: 'CANCELLED' } });
      await prisma.shiftEvent.create({
        data: { tenantId: shift.tenantId, shiftId: shift.id, fromState: shift.status, toState: 'CANCELLED', actorId: userId, metadata: JSON.stringify({ reason: 'no_show' }) },
      });
      return updated;
    }

    // Replace: reopen the shift. Applicants who were turned down when the
    // worker was picked go back into the pool; the no-show worker does not.
    const [updated] = await prisma.$transaction([
      prisma.shift.update({
        where: { id: shift.id },
        data: { status: 'POSTED', workerId: null, arrivedAt: null, startPin: null, pinAttempts: 0, lateStage: 0 },
      }),
      prisma.shiftApplication.updateMany({
        where: { shiftId: shift.id, status: 'REJECTED' },
        data: { status: 'PENDING' },
      }),
      prisma.shiftApplication.updateMany({
        where: { shiftId: shift.id, workerId: noShowWorkerId ?? '' },
        data: { status: 'REJECTED' },
      }),
      prisma.shiftEvent.create({
        data: { tenantId: shift.tenantId, shiftId: shift.id, fromState: shift.status, toState: 'POSTED', actorId: userId, metadata: JSON.stringify({ reason: 'no_show_replace', noShowWorkerId }) },
      }),
    ]);
    // Not re-broadcast on Hakken: the broadcast TTL is the shift start, which
    // has already passed. The reopened shift shows in Klokd's own feed and the
    // earlier applicants are back in the employer's pick list.
    return updated;
  }

  // ─── Views ──────────────────────────────────────────────

  /** Events first; the shift's own timestamps cover shifts clocked in before the ledger existed. */
  private summarise(
    events: { type: string; effectiveAt: Date; flags: string }[],
    shift: { arrivedAt: Date | null; clockInAt: Date | null; clockOutAt: Date | null }
  ) {
    const first = (t: string) => events.find(e => e.type === t)?.effectiveAt ?? null;
    const startedAt = first('STARTED') ?? first('OVERRIDE_START') ?? shift.clockInAt;
    return {
      arrivedAt: first('ARRIVED') ?? shift.arrivedAt ?? startedAt,
      startedAt,
      clockedOutAt: first('CLOCKED_OUT') ?? shift.clockOutAt,
      flags: Array.from(new Set(events.flatMap(e => JSON.parse(e.flags) as string[]))),
    };
  }

  private shapeEvents(events: any[]) {
    return events.map(e => ({
      id: e.id,
      type: e.type,
      method: e.method,
      at: e.effectiveAt,
      distanceM: e.distanceM,
      accuracyM: e.accuracyM,
      geofenceResult: e.geofenceResult,
      flags: JSON.parse(e.flags) as string[],
      reason: e.reason,
    }));
  }

  /** Employer's live view of one shift — includes the start PIN. */
  async employerView(shiftId: string, userId: string) {
    const { shift } = await this.loadEmployerShift(shiftId, userId);
    const events = await prisma.attendanceEvent.findMany({ where: { shiftId: shift.id }, orderBy: { effectiveAt: 'asc' } });
    const settlement = await prisma.shiftSettlement.findUnique({ where: { shiftId: shift.id } });
    const pin =
      shift.status === 'CONFIRMED' || shift.status === 'ACCEPTED' ? await this.ensurePin(shift.id) : null;
    return {
      status: shift.status,
      pin,
      pinLocked: shift.pinAttempts >= A().maxPinAttempts,
      noShow: shift.lateStage >= 2 && ['CONFIRMED', 'ACCEPTED'].includes(shift.status),
      late: shift.lateStage === 1 && ['CONFIRMED', 'ACCEPTED'].includes(shift.status),
      summary: this.summarise(events, shift),
      events: this.shapeEvents(events),
      settlement,
      overrideReasons: OVERRIDE_REASONS,
    };
  }

  /** Worker's view — never includes the PIN. */
  async workerView(shiftId: string, userId: string) {
    const { shift } = await this.loadWorkerShift(shiftId, userId);
    const events = await prisma.attendanceEvent.findMany({ where: { shiftId: shift.id }, orderBy: { effectiveAt: 'asc' } });
    const settlement = await prisma.shiftSettlement.findUnique({ where: { shiftId: shift.id } });
    return {
      shift: {
        id: shift.id,
        role: shift.role,
        venue: shift.employer.businessName,
        area: shift.locationName,
        startTime: shift.startTime,
        endTime: shift.endTime,
        rateKes: shift.rateKes,
        status: shift.status,
        arrivedAt: shift.arrivedAt,
        clockInAt: shift.clockInAt,
        clockOutAt: shift.clockOutAt,
      },
      pinAttemptsLeft: Math.max(0, A().maxPinAttempts - shift.pinAttempts),
      summary: this.summarise(events, shift),
      events: this.shapeEvents(events),
      settlement: settlement && {
        status: settlement.status,
        grossKes: settlement.grossKes,
        netKes: settlement.netKes,
        deductionsKes: settlement.grossKes - settlement.netKes,
        approveBy: settlement.approveBy,
        workedMinutes: settlement.workedMinutes,
      },
    };
  }

  /** Recent attendance across all of an employer's shifts (dashboard feed). */
  async employerFeed(userId: string) {
    const employer = await prisma.employer.findUnique({ where: { userId } });
    if (!employer) throw new AppError(404, 'Employer profile not found');
    const events = await prisma.attendanceEvent.findMany({
      where: { employerId: employer.id },
      orderBy: { effectiveAt: 'desc' },
      take: 20,
      include: { shift: { select: { id: true, role: true } } },
    });
    const workerIds = [...new Set(events.map(e => e.workerId).filter((x): x is string => !!x))];
    const workers = new Map(
      (await prisma.worker.findMany({ where: { id: { in: workerIds } }, select: { id: true, firstName: true, lastName: true } }))
        .map(w => [w.id, workerDisplayName(w)])
    );
    return events.map(e => ({
      id: e.id,
      type: e.type,
      at: e.effectiveAt,
      flags: JSON.parse(e.flags) as string[],
      reason: e.reason,
      shiftId: e.shift.id,
      role: e.shift.role,
      worker: (e.workerId && workers.get(e.workerId)) ?? null,
    }));
  }

  // ─── Ops: review queue + override watch ─────────────────

  async reviewQueue(tenantId: string, includeReviewed = false) {
    const events = await prisma.attendanceEvent.findMany({
      where: {
        tenantId,
        NOT: { flags: '[]' },
        ...(includeReviewed ? {} : { review: null }),
      },
      orderBy: { effectiveAt: 'desc' },
      take: 100,
      include: {
        review: true,
        shift: {
          select: {
            id: true,
            role: true,
            locationName: true,
            startTime: true,
            employer: { select: { businessName: true } },
          },
        },
      },
    });
    // Name the worker on the event, not the shift's current one (a replaced
    // no-show has already been taken off the shift).
    const workerIds = [...new Set(events.map(e => e.workerId).filter((x): x is string => !!x))];
    const workers = new Map(
      (await prisma.worker.findMany({ where: { id: { in: workerIds } }, select: { id: true, firstName: true, lastName: true } }))
        .map(w => [w.id, workerDisplayName(w)])
    );
    return events.map(e => ({
      id: e.id,
      type: e.type,
      method: e.method,
      at: e.effectiveAt,
      flags: JSON.parse(e.flags) as string[],
      reason: e.reason,
      distanceM: e.distanceM,
      accuracyM: e.accuracyM,
      geofenceResult: e.geofenceResult,
      shift: {
        id: e.shift.id,
        role: e.shift.role,
        area: e.shift.locationName,
        startTime: e.shift.startTime,
        employer: e.shift.employer.businessName,
        worker: (e.workerId && workers.get(e.workerId)) ?? null,
      },
      review: e.review && { status: e.review.status, note: e.review.note, at: e.review.createdAt },
    }));
  }

  async review(eventId: string, adminId: string, tenantId: string, status: 'CLEARED' | 'ESCALATED', note?: string) {
    const event = await prisma.attendanceEvent.findFirst({ where: { id: eventId, tenantId } });
    if (!event) throw new AppError(404, 'Event not found');
    const existing = await prisma.attendanceReview.findUnique({ where: { eventId } });
    if (existing) throw new AppError(409, 'This event has already been reviewed.');
    const review = await prisma.attendanceReview.create({
      data: { tenantId, eventId, status, note: note?.trim() || null, adminId },
    });
    await logAudit({
      tenantId,
      actorId: adminId,
      action: `attendance.review.${status.toLowerCase()}`,
      resource: 'attendance_event',
      resourceId: eventId,
      metadata: { note: review.note },
    });
    return review;
  }

  /** Employers whose overrides cross the alert threshold in the window. */
  async overrideWatch(tenantId: string) {
    const since = new Date(Date.now() - A().overrideWindowDays * 86_400_000);
    const starts = await prisma.attendanceEvent.groupBy({
      by: ['employerId', 'type'],
      where: { tenantId, effectiveAt: { gte: since }, type: { in: ['STARTED', 'OVERRIDE_START'] } },
      _count: { _all: true },
    });
    const byEmployer = new Map<string, { overrides: number; started: number }>();
    for (const row of starts) {
      const cur = byEmployer.get(row.employerId) ?? { overrides: 0, started: 0 };
      cur.started += row._count._all;
      if (row.type === 'OVERRIDE_START') cur.overrides += row._count._all;
      byEmployer.set(row.employerId, cur);
    }
    const ids = [...byEmployer.entries()].filter(([, v]) => v.overrides > 0).map(([id]) => id);
    const employers = await prisma.employer.findMany({ where: { id: { in: ids } }, select: { id: true, businessName: true } });
    return employers
      .map(e => {
        const v = byEmployer.get(e.id)!;
        const ratio = v.started ? v.overrides / v.started : 0;
        return {
          employerId: e.id,
          businessName: e.businessName,
          overrides: v.overrides,
          startedShifts: v.started,
          overrideRate: Math.round(ratio * 100),
          alert: v.overrides >= A().overrideAlertMinCount && ratio >= A().overrideAlertRatio,
        };
      })
      .sort((a, b) => Number(b.alert) - Number(a.alert) || b.overrideRate - a.overrideRate);
  }

  /** Audit the moment an employer crosses the override alert threshold. */
  private async checkOverrideThreshold(tenantId: string, employerId: string, businessName: string) {
    const row = (await this.overrideWatch(tenantId)).find(r => r.employerId === employerId);
    if (row?.alert && row.overrides === A().overrideAlertMinCount) {
      await logAudit({
        tenantId,
        actorId: 'system',
        action: 'attendance.override_alert',
        resource: 'employer',
        resourceId: employerId,
        metadata: { businessName, overrides: row.overrides, overrideRate: row.overrideRate },
      });
    }
  }

  // ─── Scheduler ──────────────────────────────────────────

  private timer: ReturnType<typeof setInterval> | null = null;

  start() {
    if (this.timer) return;
    console.log(`[ATTENDANCE] Watcher started (every ${A().watcherIntervalMs / 1000}s)`);
    this.timer = setInterval(() => {
      this.runWatcher().catch(err => console.error('[ATTENDANCE] watcher failed:', err));
    }, A().watcherIntervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

export const attendanceService = new AttendanceService();
