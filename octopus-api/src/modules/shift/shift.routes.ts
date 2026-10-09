import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { shiftService } from './shift.service';
import { attendanceService } from '../attendance/attendance.service';
import { contractService } from '../contract/contract.service';
import { AppError } from '../../middleware/errorHandler';
import { authenticate, authorize } from '../../middleware/auth';
import { rateLimiter } from '../../middleware/rateLimiter';
import prisma from '../../config/database';

const router = Router();

// ─── Employer: Create Shift ─────────────────────────────

router.post(
  '/',
  authenticate,
  authorize('EMPLOYER'),
  rateLimiter(20, 60),
  async (req: Request, res: Response) => {
    const schema = z.object({
      role: z.string().min(1),
      description: z.string().optional(),
      date: z.string().transform(s => new Date(s)),
      startTime: z.string().transform(s => new Date(s)),
      endTime: z.string().transform(s => new Date(s)),
      rateKes: z.number().int().positive(),
      locationLat: z.number().min(-90).max(90),
      locationLng: z.number().min(-180).max(180),
      locationName: z.string().optional(),
      // Re-hire: offer the shift straight to a worker from the employer's team.
      inviteWorkerId: z.string().uuid().optional(),
    });
    const { inviteWorkerId, ...data } = schema.parse(req.body);

    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.userId } });
    if (!employer) {
      res.status(404).json({ success: false, error: 'Employer profile not found' });
      return;
    }

    const shift = await shiftService.createShift(employer.id, req.user!.tenantId, data, { inviteWorkerId });
    res.status(201).json({ success: true, data: shift });
  }
);

// ─── Worker: Available Shifts ───────────────────────────

router.get('/available', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const schema = z.object({
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    radiusKm: z.coerce.number().positive().optional(),
    role: z.string().optional(),
    date: z.string().optional(),
  });
  const { lat, lng, radiusKm, role, date } = schema.parse(req.query);
  const shifts = await shiftService.getAvailableShifts(
    lat, lng, radiusKm, role, date ? new Date(date) : undefined
  );
  res.json({ success: true, data: shifts });
});

// ─── Employer: My posted shifts ─────────────────────────

router.get('/mine', authenticate, authorize('EMPLOYER'), async (req: Request, res: Response) => {
  const shifts = await shiftService.getEmployerShifts(req.user!.userId, req.user!.tenantId);
  res.json({ success: true, data: shifts });
});

// ─── Worker: My applications ────────────────────────────

router.get('/my/applications', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const applications = await shiftService.getMyApplications(req.user!.userId, req.user!.tenantId);
  res.json({ success: true, data: applications });
});

// ─── Worker: Apply ──────────────────────────────────────

router.post(
  '/:id/apply',
  authenticate,
  authorize('WORKER'),
  rateLimiter(50, 60),
  async (req: Request, res: Response) => {
    const worker = await prisma.worker.findUnique({ where: { userId: req.user!.userId } });
    if (!worker) {
      res.status(404).json({ success: false, error: 'Worker profile not found' });
      return;
    }
    const application = await shiftService.applyForShift(req.params.id as string, worker.id, req.user!.tenantId);
    res.status(201).json({ success: true, data: application });
  }
);

// ─── Employer: Get Applicants ───────────────────────────

router.get('/:id/applicants', authenticate, authorize('EMPLOYER'), async (req: Request, res: Response) => {
  const employer = await prisma.employer.findUnique({ where: { userId: req.user!.userId } });
  const shift = await prisma.shift.findUnique({ where: { id: req.params.id as string } });
  // Applicants are only visible to the employer who posted the shift.
  if (!shift || !employer || shift.employerId !== employer.id) {
    res.status(404).json({ success: false, error: 'Shift not found' });
    return;
  }
  const applicants = await shiftService.getApplicants(shift.id, shift.locationLat, shift.locationLng);
  res.json({ success: true, data: applicants });
});

// ─── Employer: Confirm Worker ───────────────────────────

router.post('/:id/confirm', authenticate, authorize('EMPLOYER'), async (req: Request, res: Response) => {
  const schema = z.object({ workerId: z.string().uuid() });
  const { workerId } = schema.parse(req.body);
  const employer = await prisma.employer.findUnique({ where: { userId: req.user!.userId } });
  if (!employer) {
    res.status(404).json({ success: false, error: 'Employer profile not found' });
    return;
  }
  const result = await shiftService.confirmShift(req.params.id as string, workerId, employer.id, req.user!.tenantId);
  res.json({ success: true, data: result });
});

// ─── Worker: Accept Shift ───────────────────────────────

router.post('/:id/accept', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const worker = await prisma.worker.findUnique({ where: { userId: req.user!.userId } });
  if (!worker) {
    res.status(404).json({ success: false, error: 'Worker profile not found' });
    return;
  }
  const result = await shiftService.acceptShift(req.params.id as string, worker.id, req.user!.tenantId);
  res.json({ success: true, data: result });
});

// ─── Worker: decline an offer / cancel a confirmed shift ─

router.post('/:id/decline', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const worker = await prisma.worker.findUnique({ where: { userId: req.user!.userId } });
  if (!worker) throw new AppError(404, 'Worker profile not found');
  const shift = await shiftService.declineShift(req.params.id as string, worker.id, req.user!.tenantId);
  res.json({ success: true, data: { status: shift?.status } });
});

router.post('/:id/worker-cancel', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const worker = await prisma.worker.findUnique({ where: { userId: req.user!.userId } });
  if (!worker) throw new AppError(404, 'Worker profile not found');
  const shift = await shiftService.workerCancel(req.params.id as string, worker.id, req.user!.tenantId);
  res.json({ success: true, data: { status: shift?.status } });
});

// Worker withdraws a pending application.
router.post('/:id/withdraw', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const worker = await prisma.worker.findUnique({ where: { userId: req.user!.userId } });
  if (!worker) throw new AppError(404, 'Worker profile not found');
  const result = await prisma.shiftApplication.updateMany({
    where: { shiftId: req.params.id as string, workerId: worker.id, status: 'PENDING' },
    data: { status: 'WITHDRAWN' },
  });
  if (result.count === 0) throw new AppError(404, 'No pending application for this shift');
  res.json({ success: true });
});

// ─── Employer: cancel a shift that hasn't started ───────

router.post('/:id/cancel', authenticate, authorize('EMPLOYER'), async (req: Request, res: Response) => {
  const employer = await prisma.employer.findUnique({ where: { userId: req.user!.userId } });
  if (!employer) throw new AppError(404, 'Employer profile not found');
  const shift = await shiftService.employerCancel(req.params.id as string, employer.id, req.user!.tenantId);
  res.json({ success: true, data: { status: shift.status } });
});

// ─── Written particulars (both parties) ─────────────────

router.get('/:id/contract', authenticate, async (req: Request, res: Response) => {
  const data = await contractService.getForUser(req.params.id as string, { userId: req.user!.userId, role: req.user!.role });
  res.json({ success: true, data });
});

// ─── Worker: Clock In / Out (legacy paths) ──────────────
// Current apps use /api/v1/attendance (arrive → PIN → start). These paths keep
// older worker-app builds working: a direct clock-in still passes the geofence
// and compliance gates but is flagged NO_PIN_LEGACY_APP for review.

const legacyLocation = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

router.post('/:id/clockin', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const loc = legacyLocation.parse(req.body);
  const result = await attendanceService.legacyClockIn(req.params.id as string, req.user!.userId, loc);
  res.json({ success: true, data: result });
});

router.post('/:id/clockout', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const loc = legacyLocation.partial().parse(req.body ?? {});
  const result = await attendanceService.clockOut(req.params.id as string, req.user!.userId, loc);
  res.json({ success: true, data: result });
});

// ─── Get Shift Detail ───────────────────────────────────
// NOTE: `/my/applications` above is registered first, so it wins over `/:id`.

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const shift = await shiftService.getShiftById(req.params.id as string);
  if (!shift) {
    res.status(404).json({ success: false, error: 'Shift not found' });
    return;
  }
  // The start PIN is only ever shown to the employer (GET /attendance/shifts/:id);
  // the assigned worker is shown by first name + last initial.
  const { startPin: _pin, pinAttempts: _attempts, ...rest } = shift;
  let myApplication: string | null = null;
  if (req.user!.role === 'WORKER') {
    const worker = await prisma.worker.findUnique({ where: { userId: req.user!.userId } });
    if (worker) {
      const app = await prisma.shiftApplication.findUnique({ where: { shiftId_workerId: { shiftId: shift.id, workerId: worker.id } } });
      myApplication = app?.status ?? null;
      // A worker only sees an assigned shift if it's assigned to them.
      if (shift.workerId && shift.workerId !== worker.id && shift.status !== 'POSTED') {
        res.status(404).json({ success: false, error: 'Shift not found' });
        return;
      }
    }
  }
  res.json({
    success: true,
    data: {
      ...rest,
      myApplication,
      worker: shift.worker && { ...shift.worker, lastName: shift.worker.lastName.charAt(0) + '.' },
    },
  });
});

export default router;
