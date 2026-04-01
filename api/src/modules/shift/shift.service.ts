import prisma from '../../config/database';
import { config } from '../../config';
import { ShiftStatus } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';
import { calculateDistance, toGeoHash } from '../../utils/geoUtils';
import { logAudit } from '../../utils/auditLogger';
import { complianceService } from '../compliance/compliance.service';

// Valid state transitions for the shift lifecycle
const VALID_TRANSITIONS: Record<ShiftStatus, ShiftStatus[]> = {
  POSTED: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['ACTIVE', 'CANCELLED'],
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
    }
  ) {
    // Minimum wage gate
    const minWageCheck = await complianceService.validateMinWage(
      tenantId, data.role, 'nairobi', data.rateKes
    );
    if (!minWageCheck.valid) {
      throw new AppError(422, `Rate below minimum wage. Minimum for ${data.role}: KES ${minWageCheck.minimumWage}`);
    }

    // Check employer has WIBA declared
    const employer = await prisma.employer.findUnique({ where: { id: employerId } });
    if (!employer?.wibaPolicyRef) {
      throw new AppError(422, 'WIBA policy must be declared before posting shifts');
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

    const application = await prisma.shiftApplication.create({
      data: {
        tenantId,
        shiftId,
        workerId,
        status: 'PENDING',
      },
    });

    return application;
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
   * Employer confirms a worker for the shift.
   */
  async confirmShift(
    shiftId: string,
    workerId: string,
    employerId: string,
    tenantId: string
  ) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.employerId !== employerId) {
      throw new AppError(404, 'Shift not found');
    }
    this.validateTransition(shift.status, 'CONFIRMED');

    // Section 37 check
    const s37 = await complianceService.checkSection37(workerId, employerId, tenantId);
    if (s37.blocked) {
      throw new AppError(422, s37.message);
    }

    const [updatedShift] = await prisma.$transaction([
      prisma.shift.update({
        where: { id: shiftId },
        data: { status: 'CONFIRMED', workerId },
      }),
      // Mark selected application
      prisma.shiftApplication.updateMany({
        where: { shiftId, workerId },
        data: { status: 'SELECTED' },
      }),
      // Reject other applications
      prisma.shiftApplication.updateMany({
        where: { shiftId, workerId: { not: workerId } },
        data: { status: 'REJECTED' },
      }),
    ]);

    const employer = await prisma.employer.findUnique({ where: { id: employerId } });
    await this.logEvent(shiftId, tenantId, 'POSTED', 'CONFIRMED', employer!.userId, { workerId });

    return { ...updatedShift, section37: s37.warning ? s37 : undefined };
  }

  /**
   * Worker accepts a confirmed shift.
   */
  async acceptShift(shiftId: string, workerId: string, tenantId: string) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.workerId !== workerId) {
      throw new AppError(404, 'Shift not found or not assigned to you');
    }
    this.validateTransition(shift.status, 'ACCEPTED');

    const updatedShift = await prisma.shift.update({
      where: { id: shiftId },
      data: { status: 'ACCEPTED' },
    });

    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    await this.logEvent(shiftId, tenantId, 'CONFIRMED', 'ACCEPTED', worker!.userId);

    return updatedShift;
  }

  /**
   * Worker clocks in. Validates GPS (500m radius) and WIBA.
   */
  async clockIn(
    shiftId: string,
    workerId: string,
    tenantId: string,
    lat: number,
    lng: number
  ) {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { employer: true },
    });
    if (!shift || shift.workerId !== workerId) {
      throw new AppError(404, 'Shift not found');
    }
    this.validateTransition(shift.status, 'ACTIVE');

    // GPS radius check (500m)
    const distance = calculateDistance(lat, lng, shift.locationLat, shift.locationLng);
    if (distance > config.platform.gpsClockInRadiusMeters) {
      throw new AppError(422, `You are ${Math.round(distance)}m from the venue. Must be within ${config.platform.gpsClockInRadiusMeters}m to clock in.`);
    }

    // WIBA hard gate
    const wibaCheck = await complianceService.checkWiba(shift.employerId, tenantId);
    if (!wibaCheck.confirmed) {
      throw new AppError(403, `WIBA coverage not confirmed: ${wibaCheck.reason}`);
    }

    const clockInGeoHash = toGeoHash(lat, lng);

    const updatedShift = await prisma.shift.update({
      where: { id: shiftId },
      data: {
        status: 'ACTIVE',
        clockInAt: new Date(),
        clockInGeoHash,
      },
    });

    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    await this.logEvent(shiftId, tenantId, 'ACCEPTED', 'ACTIVE', worker!.userId, {
      clockInGeoHash,
      distanceMeters: Math.round(distance),
    });

    return updatedShift;
  }

  /**
   * Worker clocks out. Triggers auto-release timer.
   */
  async clockOut(shiftId: string, workerId: string, tenantId: string) {
    const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
    if (!shift || shift.workerId !== workerId) {
      throw new AppError(404, 'Shift not found');
    }
    this.validateTransition(shift.status, 'COMPLETED');

    const autoReleaseAt = new Date();
    autoReleaseAt.setHours(autoReleaseAt.getHours() + config.platform.escrowAutoReleaseHours);

    const [updatedShift] = await prisma.$transaction([
      prisma.shift.update({
        where: { id: shiftId },
        data: {
          status: 'COMPLETED',
          clockOutAt: new Date(),
        },
      }),
      // Set auto-release timer on escrow
      prisma.escrow.updateMany({
        where: { shiftId },
        data: { autoReleaseAt },
      }),
    ]);

    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    await this.logEvent(shiftId, tenantId, 'ACTIVE', 'COMPLETED', worker!.userId);

    return updatedShift;
  }

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
