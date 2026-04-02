import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { shiftService } from './shift.service';
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
    });
    const data = schema.parse(req.body);

    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.userId } });
    if (!employer) {
      res.status(404).json({ success: false, error: 'Employer profile not found' });
      return;
    }

    const shift = await shiftService.createShift(employer.id, req.user!.tenantId, data);
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
  const shift = await prisma.shift.findUnique({ where: { id: req.params.id as string } });
  if (!shift) {
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

// ─── Worker: Clock In ───────────────────────────────────

router.post('/:id/clockin', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const schema = z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  });
  const { lat, lng } = schema.parse(req.body);
  const worker = await prisma.worker.findUnique({ where: { userId: req.user!.userId } });
  if (!worker) {
    res.status(404).json({ success: false, error: 'Worker profile not found' });
    return;
  }
  const result = await shiftService.clockIn(req.params.id as string, worker.id, req.user!.tenantId, lat, lng);
  res.json({ success: true, data: result });
});

// ─── Worker: Clock Out ──────────────────────────────────

router.post('/:id/clockout', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const worker = await prisma.worker.findUnique({ where: { userId: req.user!.userId } });
  if (!worker) {
    res.status(404).json({ success: false, error: 'Worker profile not found' });
    return;
  }
  const result = await shiftService.clockOut(req.params.id as string, worker.id, req.user!.tenantId);
  res.json({ success: true, data: result });
});

// ─── Get Shift Detail ───────────────────────────────────

router.get('/:id', authenticate, async (req: Request, res: Response) => {
  const shift = await shiftService.getShiftById(req.params.id as string);
  if (!shift) {
    res.status(404).json({ success: false, error: 'Shift not found' });
    return;
  }
  res.json({ success: true, data: shift });
});

export default router;
