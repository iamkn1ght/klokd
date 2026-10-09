import { randomInt } from 'crypto';
import prisma from '../../config/database';
import { config } from '../../config';
import { ShiftStatus } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';
import { calculateDistance, toGeoHash } from '../../utils/geoUtils';
import { logAudit } from '../../utils/auditLogger';
import { complianceService } from '../compliance/compliance.service';
import { hakkenIntegrationService } from '../hakken/hakken.service';
import { contractService } from '../contract/contract.service';
import { notificationService } from '../notification/notification.service';
import { paymentService, isPaymentRailLive, refundEscrowIfFunded } from '../payment/payment.service';

// Valid state transitions for the shift lifecycle
const VALID_TRANSITIONS: Record<ShiftStatus, ShiftStatus[]> = {
  POSTED: ['CONFIRMED', 'CANCELLED'],
  // → POSTED: the employer replaced a no-show worker (attendance service).
  CONFIRMED: ['ACCEPTED', 'POSTED', 'CANCELLED'],
  ACCEPTED: ['ACTIVE', 'POSTED', 'CANCELLED'],
  ACTIVE: ['COMPLETED'],
  COMPLETED: ['DISPUTED', 'PAID'],
  DISPUTED: ['PAID', 'COMPLETED'],
  PAID: [],
  CANCELLED: [],
};

export class ShiftService {
  /**
   * Create a new shift. Validates minimum wage before creation.
   */
  async createShift(
    employerId: string,
    tenantId: string,
    data: {
      role: string;
      description?: string;
      date: Date;
      startTime: Date;
      endTime: Date;
      rateKes: number;
      locationLat: number;
      locationLng: number;
      locationName?: string;
    },
    opts: { inviteWorkerId?: string } = {}
  ) {
    // Shifts start in the future.
    if (data.startTime.getTime() < Date.now() - 5 * 60_000) {
      throw new AppError(422, 'The shift start time has already passed.');
    }
    if (data.endTime.getTime() <= data.startTime.getTime()) {
      throw new AppError(422, 'The shift must end after it starts.');
    }

    // Minimum wage gate
    const minWageCheck = await complianceService.validateMinWage(
      tenantId, data.role, 'nairobi', data.rateKes
    );
    if (!minWageCheck.valid) {
      throw new AppError(422, `Rate below minimum wage. Minimum for ${data.role}: KES ${minWageCheck.minimumWage}`);
    }

    // Business verification gate: KRA PIN on file + a current WIBA policy.
    // Mirrored by GET /identity/employers/profile → canPostShifts.
    const employer = await prisma.employer.findUnique({ where: { id: employerId } });
    if (!employer?.kraPin) {
      throw new AppError(422, 'Verify your business (KRA PIN) before posting shifts');
    }
    if (!employer.wibaPolicyRef) {
      throw new AppError(422, 'WIBA policy must be declared before posting shifts');
    }
    if (employer.wibaPolicyExpiry && employer.wibaPolicyExpiry < new Date()) {
      throw new AppError(422, 'Your WIBA policy has expired. Declare a current policy before posting shifts');
    }

    const geoHash = toGeoHash(data.locationLat, data.locationLng);

    const shift = await prisma.shift.create({
      data: {
        tenantId,
        employerId,
        role: data.role,
        description: data.description,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        rateKes: data.rateKes,
        locationLat: data.locationLat,
        locationLng: data.locationLng,
        locationName: data.locationName,
        geoHash,
        status: 'POSTED',
      },
    });

    // Log event
    await this.logEvent(shift.id, tenantId, null, 'POSTED', employer.userId);

    // Re-hire offers go straight to one worker and are never broadcast.
    if (opts.inviteWorkerId) {
      await this.offerToWorker(shift.id, opts.inviteWorkerId, employerId, tenantId);
      return (await prisma.shift.findUnique({ where: { id: shift.id } }))!;
    }

    // Publish to Hakken discovery (S5-NEW-01) — fire-and-forget, non-blocking.
    // Klokd's flow completes regardless; failure logged inside the service.
    void hakkenIntegrationService.publishShiftOpen(shift.id);

    return shift;
  }

  /**
   * Get available shifts near a location.
   */
  async getAvailableShifts(
    lat: number,
    lng: number,
    radiusKm: number = 5,
    role?: string,
    date?: Date
  ) {
    const where: Record<string, unknown> = { status: 'POSTED' };
    if (role) where.role = role;
    if (date) {
      where.date = {
        gte: new Date(date.setHours(0, 0, 0, 0)),
        lt: new Date(date.setHours(23, 59, 59, 999)),
      };
    }

    const shifts = await prisma.shift.findMany({
      where: where as any,
      include: {
        employer: {
          select: {
            businessName: true,
            ratingAggregate: true,
            totalShifts: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter by distance and add distance to each shift
    const radiusMeters = radiusKm * 1000;
    const shiftsWithDistance = shifts
      .map(shift => {
        const distance = calculateDistance(lat, lng, shift.locationLat, shift.locationLng);
        return { ...shift, distanceMeters: Math.round(distance) };
      })
      .filter(s => s.distanceMeters <= radiusMeters)
      .sort((a, b) => a.distanceMeters - b.distanceMeters);

    return shiftsWithDistance;
  }

  /**
   * Worker applies for a shift.
   */
  async applyForShift(shiftId: string, workerId: string, tenantId: string) {
    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker || worker.verificationStatus !== 'APPROVED') {
      throw new AppError(422, 'Identity verification required before applying for shifts');
    }

    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.status !== 'POSTED') {
      throw new AppError(404, 'Shift not available');
    }

    // Check no overlapping confirmed shift
    const overlapping = await prisma.shift.findFirst({
      where: {
        workerId,
        status: { in: ['ACCEPTED', 'ACTIVE'] },
        date: shift.date,
        startTime: { lt: shift.endTime },
        endTime: { gt: shift.startTime },
      },
    });
    if (overlapping) {
      throw new AppError(422, 'You already have a confirmed shift during this time');
    }

    const application = await prisma.shiftApplication
      .create({
        data: {
          tenantId,
          shiftId,
          workerId,
          status: 'PENDING',
        },
      })
      .catch((err: any) => {
        // P2002 = @@unique([shiftId, workerId]) — a double-tap or retry hit
        // the existing application. 422 with a friendly message, not a 500.
        if (err?.code === 'P2002') {
          throw new AppError(422, 'You have already applied to this shift');
        }
        throw err;
      });

    return application;
  }

  /**
   * The employer's own posted shifts with live application counts — powers
   * the employer dashboard's real "open positions" grid.
   */
  async getEmployerShifts(userId: string, tenantId: string) {
    const employer = await prisma.employer.findUnique({ where: { userId } });
    if (!employer) {
      throw new AppError(404, 'Employer profile not found');
    }
    const shifts = await prisma.shift.findMany({
      where: { employerId: employer.id, tenantId },
      include: { _count: { select: { applications: true } } },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });
    return shifts.map(s => ({
      id: s.id,
      role: s.role,
      description: s.description,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      rateKes: s.rateKes,
      locationName: s.locationName,
      status: s.status,
      applications: s._count.applications,
    }));
  }

  /**
   * All applications this worker has submitted, newest first — powers the
   * "My shifts" tab's applied-view.
   */
  async getMyApplications(userId: string, tenantId: string) {
    const worker = await prisma.worker.findUnique({ where: { userId } });
    if (!worker) {
      throw new AppError(404, 'Worker profile not found');
    }
    const applications = await prisma.shiftApplication.findMany({
      where: { workerId: worker.id, tenantId },
      include: {
        shift: {
          select: {
            id: true,
            role: true,
            date: true,
            startTime: true,
            endTime: true,
            rateKes: true,
            locationName: true,
            status: true,
            employer: { select: { businessName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return applications.map(app => ({
      id: app.id,
      status: app.status,
      appliedAt: app.createdAt,
      shift: {
        id: app.shift.id,
        role: app.shift.role,
        venue: app.shift.employer?.businessName ?? 'Venue',
        area: app.shift.locationName,
        date: app.shift.date,
        startTime: app.shift.startTime,
        endTime: app.shift.endTime,
        rateKes: app.shift.rateKes,
        shiftStatus: app.shift.status,
      },
    }));
  }

  /**
   * Get applicants for a shift, sorted per spec.
   */
  async getApplicants(shiftId: string, shiftLat: number, shiftLng: number) {
    const applications = await prisma.shiftApplication.findMany({
      where: { shiftId, status: 'PENDING' },
      include: {
        worker: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            showUpRate: true,
            ratingAggregate: true,
            ratingCount: true,
            totalShifts: true,
            skills: true,
            verificationStatus: true,
          },
        },
      },
    });

    // We don't have worker location stored (DPA), so we return without distance sorting
    // In practice, this would use the worker's last clock-in geohash or a provided location
    return applications.map(app => ({
      applicationId: app.id,
      worker: {
        ...app.worker,
        skills: JSON.parse(app.worker.skills || '[]'),
        lastName: app.worker.lastName.charAt(0) + '.', // Privacy: last initial only
        showRating: (app.worker.ratingCount ?? 0) >= config.platform.minRatingsForDisplay,
      },
    }));
  }

  /**
   * Employer confirms a worker for the shift (from applicants, or a direct
   * re-hire offer to someone from their team).
   */
  async confirmShift(
    shiftId: string,
    workerId: string,
    employerId: string,
    tenantId: string,
    opts: { directOffer?: boolean } = {}
  ) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.employerId !== employerId) {
      throw new AppError(404, 'Shift not found');
    }
    this.validateTransition(shift.status, 'CONFIRMED');

    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker || worker.tenantId !== tenantId) throw new AppError(404, 'Worker not found');
    if (worker.verificationStatus !== 'APPROVED') {
      throw new AppError(422, 'This worker hasn’t finished ID verification yet.');
    }

    // Section 37 check
    const s37 = await complianceService.checkSection37(workerId, employerId, tenantId);
    if (s37.blocked) {
      throw new AppError(422, s37.message);
    }

    const [updatedShift] = await prisma.$transaction([
      prisma.shift.update({
        where: { id: shiftId },
        // The start PIN (Uber-style) is issued the moment a worker is picked.
        data: {
          status: 'CONFIRMED',
          workerId,
          directOffer: !!opts.directOffer,
          startPin: String(randomInt(0, 10_000)).padStart(4, '0'),
          pinAttempts: 0,
          lateStage: 0,
          arrivedAt: null,
        },
      }),
      // Mark selected application
      prisma.shiftApplication.updateMany({
        where: { shiftId, workerId },
        data: { status: 'SELECTED' },
      }),
      // Reject other applications
      prisma.shiftApplication.updateMany({
        where: { shiftId, workerId: { not: workerId }, status: 'PENDING' },
        data: { status: 'REJECTED' },
      }),
    ]);

    // Soft-revoke Hakken broadcast — shift is filled, no longer discoverable.
    // Non-blocking; failure logged inside the service.
    void hakkenIntegrationService.revokeShiftBroadcast(shiftId);

    const employer = await prisma.employer.findUnique({ where: { id: employerId } });
    await this.logEvent(shiftId, tenantId, 'POSTED', 'CONFIRMED', employer!.userId, { workerId, directOffer: !!opts.directOffer });

    // Written particulars: employer acceptance is the selection itself.
    await contractService.generate(shiftId);

    // Escrow: the employer funds shift pay + fee on Kipkiren Pay. Until the
    // rail is live the shift proceeds and pay waits in the approved queue.
    if (isPaymentRailLive()) {
      try {
        await paymentService.initiateEscrow(shiftId, employerId, shift.rateKes, tenantId);
      } catch (err) {
        console.error('[SHIFT] escrow hold failed:', (err as Error).message);
      }
    }

    const when = updatedShift.startTime;
    void notificationService
      .notifyShiftConfirmed(
        tenantId,
        workerId,
        shiftId,
        updatedShift.role,
        employer!.businessName,
        when.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' }),
        when.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Nairobi' }),
        updatedShift.rateKes,
        !!opts.directOffer
      )
      .catch(err => console.error('[SHIFT] confirm notify failed:', err));

    // Let the other applicants know straight away so they can apply elsewhere.
    const others = await prisma.shiftApplication.findMany({
      where: { shiftId, status: 'REJECTED' },
      include: { worker: { select: { userId: true } } },
    });
    for (const a of others) {
      void notificationService
        .send({
          tenantId,
          userId: a.worker.userId,
          type: 'shift.filled',
          title: 'Shift filled',
          body: `The ${updatedShift.role} shift at ${employer!.businessName} went to someone else. Keep an eye on new shifts nearby.`,
          shiftId,
        })
        .catch(() => undefined);
    }

    return { ...updatedShift, section37: s37.warning ? s37 : undefined };
  }

  /**
   * Re-hire: post a shift and offer it straight to a worker who has worked
   * for this employer before. The worker accepts or declines in the app.
   */
  async offerToWorker(shiftId: string, workerId: string, employerId: string, tenantId: string) {
    const worked = await prisma.shift.count({
      where: { employerId, workerId, status: { in: ['COMPLETED', 'PAID'] } },
    });
    if (worked === 0) {
      throw new AppError(422, 'You can only offer shifts directly to workers who have worked for you before.');
    }
    return this.confirmShift(shiftId, workerId, employerId, tenantId, { directOffer: true });
  }

  /**
   * Worker accepts a confirmed shift — and with it the written particulars.
   */
  async acceptShift(shiftId: string, workerId: string, tenantId: string) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId }, include: { employer: true } });
    if (!shift || shift.workerId !== workerId) {
      throw new AppError(404, 'Shift not found or not assigned to you');
    }
    this.validateTransition(shift.status, 'ACCEPTED');

    await contractService.workerAccept(shiftId);
    const updatedShift = await prisma.shift.update({
      where: { id: shiftId },
      data: { status: 'ACCEPTED' },
    });

    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    await this.logEvent(shiftId, tenantId, 'CONFIRMED', 'ACCEPTED', worker!.userId);

    void notificationService
      .send({
        tenantId,
        userId: shift.employer.userId,
        type: 'shift.accepted',
        title: `${worker!.firstName} confirmed`,
        body: `${worker!.firstName} ${worker!.lastName.charAt(0)}. will work the ${shift.role} shift.`,
        shiftId,
      })
      .catch(() => undefined);

    return updatedShift;
  }

  /**
   * Worker turns down a shift they were picked for (or offered). The shift
   * reopens; earlier applicants go back into the pick list.
   */
  async declineShift(shiftId: string, workerId: string, tenantId: string) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId }, include: { employer: true } });
    if (!shift || shift.workerId !== workerId) {
      throw new AppError(404, 'Shift not found or not assigned to you');
    }
    if (shift.status !== 'CONFIRMED') {
      throw new AppError(409, shift.status === 'ACCEPTED'
        ? 'You’ve already confirmed this shift. Cancel it from the shift page if you can’t make it.'
        : 'This shift can’t be declined now.');
    }
    const worker = await prisma.worker.findUnique({ where: { id: workerId } });

    await this.reopen(shift.id, tenantId, worker!.userId, workerId, 'worker_declined');

    void notificationService
      .send({
        tenantId,
        userId: shift.employer.userId,
        type: 'shift.declined',
        title: `${worker!.firstName} can’t make it`,
        body: `${worker!.firstName} declined the ${shift.role} shift. It’s open again — pick someone else from your applicants.`,
        shiftId,
      })
      .catch(() => undefined);

    return prisma.shift.findUnique({ where: { id: shiftId } });
  }

  /**
   * Worker cancels a shift they had confirmed (before it starts).
   */
  async workerCancel(shiftId: string, workerId: string, tenantId: string) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId }, include: { employer: true } });
    if (!shift || shift.workerId !== workerId) throw new AppError(404, 'Shift not found or not assigned to you');
    if (shift.status !== 'ACCEPTED' || shift.arrivedAt) {
      throw new AppError(409, 'This shift can’t be cancelled now.');
    }
    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    await this.reopen(shift.id, tenantId, worker!.userId, workerId, 'worker_cancelled');
    void notificationService
      .send({
        tenantId,
        userId: shift.employer.userId,
        type: 'shift.worker_cancelled',
        title: `${worker!.firstName} cancelled`,
        body: `${worker!.firstName} can no longer work the ${shift.role} shift. It’s open again for applicants.`,
        shiftId,
      })
      .catch(() => undefined);
    return prisma.shift.findUnique({ where: { id: shiftId } });
  }

  /** Back to POSTED: clear the worker, restore earlier applicants, rebroadcast. */
  private async reopen(shiftId: string, tenantId: string, actorUserId: string, workerId: string, reason: string) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift) return;
    await prisma.$transaction([
      prisma.shift.update({
        where: { id: shiftId },
        data: { status: 'POSTED', workerId: null, directOffer: false, startPin: null, pinAttempts: 0, lateStage: 0, arrivedAt: null },
      }),
      prisma.shiftApplication.updateMany({
        where: { shiftId, status: 'REJECTED', workerId: { not: workerId } },
        data: { status: 'PENDING' },
      }),
      prisma.shiftApplication.updateMany({
        where: { shiftId, workerId },
        data: { status: 'WITHDRAWN' },
      }),
    ]);
    await this.logEvent(shiftId, tenantId, shift.status, 'POSTED', actorUserId, { reason, workerId });
    await refundEscrowIfFunded(shiftId, tenantId, actorUserId);
    if (shift.startTime.getTime() > Date.now()) void hakkenIntegrationService.publishShiftOpen(shiftId);
  }

  /**
   * Employer cancels a shift that hasn't started.
   */
  async employerCancel(shiftId: string, employerId: string, tenantId: string) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId }, include: { employer: true, worker: true } });
    if (!shift || shift.employerId !== employerId) throw new AppError(404, 'Shift not found');
    if (!['POSTED', 'CONFIRMED', 'ACCEPTED'].includes(shift.status)) {
      throw new AppError(409, 'Only shifts that haven’t started can be cancelled.');
    }
    const updated = await prisma.shift.update({ where: { id: shiftId }, data: { status: 'CANCELLED' } });
    await this.logEvent(shiftId, tenantId, shift.status, 'CANCELLED', shift.employer.userId, { by: 'employer' });
    await prisma.shiftApplication.updateMany({ where: { shiftId, status: 'PENDING' }, data: { status: 'REJECTED' } });
    void hakkenIntegrationService.revokeShiftBroadcast(shiftId);
    await refundEscrowIfFunded(shiftId, tenantId, shift.employer.userId);
    if (shift.worker) {
      void notificationService
        .send({
          tenantId,
          userId: shift.worker.userId,
          type: 'shift.cancelled',
          title: 'Shift cancelled',
          body: `${shift.employer.businessName} cancelled the ${shift.role} shift.`,
          shiftId,
        })
        .catch(() => undefined);
    }
    return updated;
  }

  // Clock-in / clock-out live in the attendance module (arrive → PIN → start).

  /**
   * Get shift by ID with relations.
   */
  async getShiftById(shiftId: string) {
    return prisma.shift.findUnique({
      where: { id: shiftId },
      include: {
        employer: {
          select: {
            businessName: true,
            ratingAggregate: true,
            totalShifts: true,
          },
        },
        worker: {
          select: {
            firstName: true,
            lastName: true,
            showUpRate: true,
            ratingAggregate: true,
            ratingCount: true,
          },
        },
        escrow: true,
      },
    });
  }

  // ─── Private helpers ────────────────────────────────────

  private validateTransition(from: ShiftStatus, to: ShiftStatus): void {
    const allowed = VALID_TRANSITIONS[from];
    if (!allowed.includes(to)) {
      throw new AppError(422, `Invalid state transition: ${from} → ${to}`);
    }
  }

  private async logEvent(
    shiftId: string,
    tenantId: string,
    fromState: string | null,
    toState: string,
    actorId: string,
    metadata?: Record<string, unknown>
  ) {
    await prisma.shiftEvent.create({
      data: {
        tenantId,
        shiftId,
        fromState,
        toState,
        actorId,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });
  }
}

export const shiftService = new ShiftService();
