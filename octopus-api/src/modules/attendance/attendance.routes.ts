import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import { rateLimiter } from '../../middleware/rateLimiter';
import { attendanceService, OVERRIDE_REASONS } from './attendance.service';

/**
 * Attendance routes — mounted at /api/v1/attendance.
 *
 *   Worker    POST /shifts/:id/arrive           "I've arrived" (geofence)
 *             POST /shifts/:id/start            enter the employer's start PIN
 *             POST /shifts/:id/clock-out        location recorded, never blocks
 *   Employer  POST /shifts/:id/employer-start   start without PIN (reason required)
 *             POST /shifts/:id/no-show          wait | replace | cancel
 *             POST /shifts/:id/settlement/approve
 *             GET  /feed                        recent attendance across my shifts
 *   Both      GET  /shifts/:id                  role-shaped view (PIN for employer only)
 *   Admin     GET  /admin/flags                 review queue
 *             POST /admin/events/:id/review     CLEARED | ESCALATED
 *             GET  /admin/overrides             override watch
 */
const router = Router();

const location = z.object({
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  accuracy: z.number().nonnegative().optional(),
  mocked: z.boolean().optional(),
});

const id = (req: Request) => req.params.id as string;

// ─── Worker ─────────────────────────────────────────────

router.post('/shifts/:id/arrive', authenticate, authorize('WORKER'), rateLimiter(20, 10), async (req: Request, res: Response) => {
  const data = await attendanceService.arrive(id(req), req.user!.userId, location.parse(req.body ?? {}));
  res.json({ success: true, data });
});

router.post('/shifts/:id/start', authenticate, authorize('WORKER'), rateLimiter(10, 10), async (req: Request, res: Response) => {
  const { pin } = z.object({ pin: z.string().regex(/^\d{4}$/, 'The PIN is 4 digits') }).parse(req.body);
  const shift = await attendanceService.startWithPin(id(req), req.user!.userId, pin);
  res.json({ success: true, data: { status: shift.status, clockInAt: shift.clockInAt } });
});

router.post('/shifts/:id/clock-out', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const shift = await attendanceService.clockOut(id(req), req.user!.userId, location.parse(req.body ?? {}));
  res.json({ success: true, data: { status: shift.status, clockOutAt: shift.clockOutAt } });
});

// ─── Employer ───────────────────────────────────────────

router.post('/shifts/:id/employer-start', authenticate, authorize('EMPLOYER'), async (req: Request, res: Response) => {
  const { reason, note } = z
    .object({ reason: z.enum(OVERRIDE_REASONS), note: z.string().max(280).optional() })
    .refine(v => v.reason !== 'OTHER' || (v.note?.trim().length ?? 0) >= 5, {
      message: 'Tell us briefly why',
      path: ['note'],
    })
    .parse(req.body);
  const shift = await attendanceService.employerStart(id(req), req.user!.userId, reason, note);
  res.json({ success: true, data: { status: shift.status, clockInAt: shift.clockInAt } });
});

router.post('/shifts/:id/no-show', authenticate, authorize('EMPLOYER'), async (req: Request, res: Response) => {
  const { action } = z.object({ action: z.enum(['wait', 'replace', 'cancel']) }).parse(req.body);
  const shift = await attendanceService.resolveNoShow(id(req), req.user!.userId, action);
  res.json({ success: true, data: { status: shift?.status } });
});

router.post('/shifts/:id/settlement/approve', authenticate, authorize('EMPLOYER'), async (req: Request, res: Response) => {
  const data = await attendanceService.approveSettlement(id(req), req.user!.userId);
  res.json({ success: true, data });
});

router.get('/feed', authenticate, authorize('EMPLOYER'), async (req: Request, res: Response) => {
  res.json({ success: true, data: await attendanceService.employerFeed(req.user!.userId) });
});

// ─── Shared view ────────────────────────────────────────

router.get('/shifts/:id', authenticate, authorize('WORKER', 'EMPLOYER'), async (req: Request, res: Response) => {
  const data =
    req.user!.role === 'EMPLOYER'
      ? await attendanceService.employerView(id(req), req.user!.userId)
      : await attendanceService.workerView(id(req), req.user!.userId);
  res.json({ success: true, data });
});

// ─── Admin ──────────────────────────────────────────────

router.get('/admin/flags', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const all = req.query.all === '1';
  res.json({ success: true, data: await attendanceService.reviewQueue(req.user!.tenantId, all) });
});

router.post('/admin/events/:id/review', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const { status, note } = z
    .object({ status: z.enum(['CLEARED', 'ESCALATED']), note: z.string().max(500).optional() })
    .parse(req.body);
  const data = await attendanceService.review(id(req), req.user!.userId, req.user!.tenantId, status, note);
  res.json({ success: true, data });
});

router.get('/admin/overrides', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  res.json({ success: true, data: await attendanceService.overrideWatch(req.user!.tenantId) });
});

export default router;
