import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { config } from '../../config';
import { authenticate, authorize } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { logAudit } from '../../utils/auditLogger';
import { notificationService } from '../notification/notification.service';
import { isPaymentRailLive } from '../payment/payment.service';

/**
 * /api/v1/me — everything about the signed-in person, for every app.
 *
 *   GET  /worker              profile + ledger stats (worker)
 *   PUT  /worker/skills       update skills (worker)
 *   POST /consent             record identity + location consent (worker)
 *   GET  /shifts              offers · upcoming · applied · history (worker)
 *   GET  /earnings            pay per shift + monthly totals (worker)
 *   GET  /ratings/pending     finished shifts I haven't rated yet (both)
 *   GET  /notifications       inbox + unread count (all)
 *   POST /notifications/read  mark all (or some) read (all)
 *   POST /push-token          register this device for push (all)
 *   GET  /data                download everything Klokd holds on me (all)
 *   GET  /data-requests       my correction / deletion requests (all)
 *   POST /data-requests       ask for a correction or deletion (all)
 */
const router = Router();

const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);

async function workerFor(userId: string) {
  const worker = await prisma.worker.findUnique({ where: { userId } });
  if (!worker) throw new AppError(404, 'Worker profile not found');
  return worker;
}

// ─── Worker profile ─────────────────────────────────────

router.get('/worker', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const worker = await workerFor(req.user!.userId);
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId }, select: { phone: true, kycTier: true } });
  const month = await prisma.shiftSettlement.aggregate({
    where: { workerId: worker.id, createdAt: { gte: startOfMonth() }, status: { not: 'VOID' } },
    _sum: { netKes: true },
    _count: true,
  });
  const upcoming = await prisma.shift.count({ where: { workerId: worker.id, status: { in: ['CONFIRMED', 'ACCEPTED', 'ACTIVE'] } } });
  const completed = await prisma.shift.count({ where: { workerId: worker.id, status: { in: ['COMPLETED', 'PAID'] } } });
  res.json({
    success: true,
    data: {
      id: worker.id,
      firstName: worker.firstName,
      lastName: worker.lastName,
      phone: user?.phone ?? null,
      verificationStatus: worker.verificationStatus,
      kycTier: user?.kycTier ?? worker.kycTier,
      skills: JSON.parse(worker.skills || '[]') as string[],
      certificates: (JSON.parse(worker.certificationKeys || '[]') as string[]).length,
      consent: { identity: worker.consentIdentity, location: worker.consentGps, at: worker.consentedAt },
      showUpRate: worker.showUpRate,
      rating: worker.ratingCount >= config.platform.minRatingsForDisplay ? worker.ratingAggregate : null,
      ratingCount: worker.ratingCount,
      completedShifts: completed,
      upcomingShifts: upcoming,
      monthEarningsKes: month._sum.netKes ?? 0,
      monthShifts: month._count,
      paymentsLive: isPaymentRailLive(),
      memberSince: worker.createdAt,
    },
  });
});

router.put('/worker/skills', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const { skills } = z.object({ skills: z.array(z.string().min(1).max(40)).max(12) }).parse(req.body);
  const worker = await workerFor(req.user!.userId);
  await prisma.worker.update({ where: { id: worker.id }, data: { skills: JSON.stringify([...new Set(skills)]) } });
  res.json({ success: true, data: { skills } });
});

router.post('/consent', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const { identity, location } = z.object({ identity: z.boolean(), location: z.boolean() }).parse(req.body);
  const worker = await workerFor(req.user!.userId);
  await prisma.worker.update({
    where: { id: worker.id },
    data: { consentIdentity: identity, consentGps: location, consentedAt: new Date() },
  });
  await logAudit({
    tenantId: req.user!.tenantId,
    actorId: req.user!.userId,
    action: 'consent.updated',
    resource: 'worker',
    resourceId: worker.id,
    metadata: { identity, location },
  });
  res.json({ success: true, data: { identity, location } });
});

// ─── Worker shifts ──────────────────────────────────────

router.get('/shifts', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const worker = await workerFor(req.user!.userId);
  const assigned = await prisma.shift.findMany({
    where: { workerId: worker.id },
    include: {
      employer: { select: { businessName: true, ratingAggregate: true, ratingCount: true } },
      settlement: { select: { status: true, netKes: true, grossKes: true } },
      ratings: { where: { raterRole: 'WORKER' }, select: { stars: true } },
      dispute: { select: { status: true } },
    },
    orderBy: { startTime: 'desc' },
    take: 100,
  });
  const applications = await prisma.shiftApplication.findMany({
    where: { workerId: worker.id, status: { in: ['PENDING', 'REJECTED', 'WITHDRAWN'] } },
    include: { shift: { include: { employer: { select: { businessName: true } } } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const shape = (s: (typeof assigned)[number]) => ({
    id: s.id,
    role: s.role,
    venue: s.employer.businessName,
    area: s.locationName,
    startTime: s.startTime,
    endTime: s.endTime,
    rateKes: s.rateKes,
    status: s.status,
    directOffer: s.directOffer,
    arrivedAt: s.arrivedAt,
    clockInAt: s.clockInAt,
    clockOutAt: s.clockOutAt,
    settlement: s.settlement,
    rated: s.ratings.length > 0,
    disputeStatus: s.dispute?.status ?? null,
  });

  res.json({
    success: true,
    data: {
      offers: assigned.filter(s => s.status === 'CONFIRMED').map(shape),
      upcoming: assigned.filter(s => s.status === 'ACCEPTED' || s.status === 'ACTIVE').map(shape).reverse(),
      applied: applications
        .filter(a => a.status === 'PENDING' && a.shift.status === 'POSTED')
        .map(a => ({
          applicationId: a.id,
          appliedAt: a.createdAt,
          shift: {
            id: a.shift.id,
            role: a.shift.role,
            venue: a.shift.employer.businessName,
            area: a.shift.locationName,
            startTime: a.shift.startTime,
            endTime: a.shift.endTime,
            rateKes: a.shift.rateKes,
          },
        })),
      history: assigned.filter(s => ['COMPLETED', 'PAID', 'DISPUTED', 'CANCELLED'].includes(s.status)).map(shape),
      notPicked: applications
        .filter(a => a.status !== 'PENDING' || a.shift.status !== 'POSTED')
        .slice(0, 20)
        .map(a => ({
          applicationId: a.id,
          role: a.shift.role,
          venue: a.shift.employer.businessName,
          startTime: a.shift.startTime,
          outcome: a.status === 'WITHDRAWN' ? 'withdrawn' : 'not picked',
        })),
    },
  });
});

// ─── Worker earnings ────────────────────────────────────

router.get('/earnings', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const worker = await workerFor(req.user!.userId);
  const rows = await prisma.shiftSettlement.findMany({
    where: { workerId: worker.id },
    include: {
      shift: {
        select: {
          id: true, role: true, startTime: true, locationName: true,
          employer: { select: { businessName: true } },
          payment: { select: { id: true, status: true, mpesaRef: true, paidAt: true, stepUpChallengeId: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const months = new Map<string, { month: string; shifts: number; grossKes: number; deductionsKes: number; netKes: number; paidKes: number }>();
  for (const r of rows) {
    if (r.status === 'VOID') continue;
    const key = r.createdAt.toISOString().slice(0, 7);
    const m = months.get(key) ?? { month: key, shifts: 0, grossKes: 0, deductionsKes: 0, netKes: 0, paidKes: 0 };
    m.shifts += 1;
    m.grossKes += r.grossKes;
    m.deductionsKes += r.grossKes - r.netKes;
    m.netKes += r.netKes;
    if (r.status === 'PAID') m.paidKes += r.netKes;
    months.set(key, m);
  }
  res.json({
    success: true,
    data: {
      paymentsLive: isPaymentRailLive(),
      months: [...months.values()],
      shifts: rows.map(r => ({
        shiftId: r.shiftId,
        role: r.shift.role,
        venue: r.shift.employer.businessName,
        area: r.shift.locationName,
        date: r.shift.startTime,
        workedMinutes: r.workedMinutes,
        grossKes: r.grossKes,
        payeKes: r.payeKes,
        nssfKes: r.nssfTier1Kes + r.nssfTier2Kes,
        shifKes: r.shifKes,
        ahlKes: r.ahlKes,
        netKes: r.netKes,
        status: r.status,
        approveBy: r.approveBy,
        paidAt: r.paidAt,
        payment: r.shift.payment && {
          id: r.shift.payment.id,
          status: r.shift.payment.status,
          mpesaRef: r.shift.payment.mpesaRef,
          needsConfirmation: !!r.shift.payment.stepUpChallengeId,
        },
      })),
    },
  });
});

// ─── Ratings due ────────────────────────────────────────

router.get('/ratings/pending', authenticate, authorize('WORKER', 'EMPLOYER'), async (req: Request, res: Response) => {
  const isWorker = req.user!.role === 'WORKER';
  const profile = isWorker
    ? await prisma.worker.findUnique({ where: { userId: req.user!.userId } })
    : await prisma.employer.findUnique({ where: { userId: req.user!.userId } });
  if (!profile) throw new AppError(404, 'Profile not found');
  const shifts = await prisma.shift.findMany({
    where: {
      ...(isWorker ? { workerId: profile.id } : { employerId: profile.id }),
      status: { in: ['COMPLETED', 'PAID'] },
      ratings: { none: { raterRole: req.user!.role } },
      clockOutAt: { gte: new Date(Date.now() - 14 * 86_400_000) },
    },
    include: {
      employer: { select: { businessName: true } },
      worker: { select: { firstName: true, lastName: true } },
    },
    orderBy: { clockOutAt: 'desc' },
    take: 10,
  });
  res.json({
    success: true,
    data: shifts.map(s => ({
      shiftId: s.id,
      role: s.role,
      date: s.startTime,
      other: isWorker ? s.employer.businessName : s.worker ? `${s.worker.firstName} ${s.worker.lastName.charAt(0)}.` : 'Worker',
    })),
  });
});

// ─── Notifications ──────────────────────────────────────

router.get('/notifications', authenticate, async (req: Request, res: Response) => {
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: req.user!.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: { id: true, type: true, title: true, body: true, shiftId: true, readAt: true, createdAt: true },
    }),
    prisma.notification.count({ where: { userId: req.user!.userId, readAt: null } }),
  ]);
  res.json({ success: true, data: { items, unread } });
});

router.post('/notifications/read', authenticate, async (req: Request, res: Response) => {
  const { ids } = z.object({ ids: z.array(z.string().uuid()).optional() }).parse(req.body ?? {});
  await prisma.notification.updateMany({
    where: { userId: req.user!.userId, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });
  res.json({ success: true });
});

router.post('/push-token', authenticate, async (req: Request, res: Response) => {
  const { token, platform } = z
    .object({ token: z.string().regex(/^(ExponentPushToken|ExpoPushToken)\[.+\]$/, 'Not an Expo push token'), platform: z.enum(['ios', 'android', 'web']) })
    .parse(req.body);
  await notificationService.registerPushToken(req.user!.userId, token, platform);
  res.json({ success: true });
});

// ─── Data rights (DPA 2019) ─────────────────────────────

router.get('/data', authenticate, async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { phone: true, role: true, kycTier: true, createdAt: true },
  });
  const worker = await prisma.worker.findUnique({ where: { userId } });
  const employer = await prisma.employer.findUnique({ where: { userId } });
  const shiftWhere = worker ? { workerId: worker.id } : employer ? { employerId: employer.id } : { id: '' };
  const [shifts, applications, settlements, ratingsGiven, notifications, attendance, consentLog, requests] = await Promise.all([
    prisma.shift.findMany({
      where: shiftWhere,
      select: { id: true, role: true, startTime: true, endTime: true, rateKes: true, locationName: true, status: true, clockInAt: true, clockOutAt: true },
      orderBy: { startTime: 'desc' },
    }),
    worker ? prisma.shiftApplication.findMany({ where: { workerId: worker.id }, select: { shiftId: true, status: true, createdAt: true } }) : [],
    prisma.shiftSettlement.findMany({ where: worker ? { workerId: worker.id } : { employerId: employer?.id ?? '' } }),
    prisma.rating.findMany({ where: { shift: shiftWhere, raterRole: req.user!.role }, select: { shiftId: true, stars: true, comment: true, createdAt: true } }),
    prisma.notification.findMany({ where: { userId }, select: { type: true, title: true, body: true, createdAt: true } }),
    prisma.attendanceEvent.findMany({
      where: worker ? { workerId: worker.id } : { employerId: employer?.id ?? '' },
      select: { shiftId: true, type: true, effectiveAt: true, geoHash: true, distanceM: true, flags: true },
    }),
    prisma.auditLog.findMany({ where: { actorId: userId, action: { startsWith: 'consent' } }, select: { action: true, metadata: true, createdAt: true } }),
    prisma.dataRequest.findMany({ where: { userId } }),
  ]);
  await logAudit({ tenantId: req.user!.tenantId, actorId: userId, action: 'dpa.self_export', resource: 'user', resourceId: userId });
  res.json({
    success: true,
    data: {
      exportedAt: new Date().toISOString(),
      note: 'Identity documents and your National ID are held by Identiti, not Klokd. M-Pesa payout details are held by Kipkiren Pay.',
      account: user,
      profile: worker
        ? { firstName: worker.firstName, lastName: worker.lastName, skills: JSON.parse(worker.skills || '[]'), verificationStatus: worker.verificationStatus, consentIdentity: worker.consentIdentity, consentGps: worker.consentGps, consentedAt: worker.consentedAt }
        : employer
          ? { businessName: employer.businessName, kraPin: employer.kraPin, contactPerson: employer.contactPerson, wibaInsurer: employer.wibaInsurer, wibaPolicyRef: employer.wibaPolicyRef, wibaPolicyExpiry: employer.wibaPolicyExpiry }
          : null,
      shifts,
      applications,
      pay: settlements,
      ratingsGiven,
      attendance: attendance.map(a => ({ ...a, flags: JSON.parse(a.flags) })),
      notifications,
      consentHistory: consentLog,
      dataRequests: requests,
    },
  });
});

router.get('/data-requests', authenticate, async (req: Request, res: Response) => {
  const rows = await prisma.dataRequest.findMany({ where: { userId: req.user!.userId }, orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: rows });
});

router.post('/data-requests', authenticate, async (req: Request, res: Response) => {
  const { type, details } = z
    .object({ type: z.enum(['RECTIFICATION', 'DELETION']), details: z.string().max(1000).optional() })
    .refine(v => v.type !== 'RECTIFICATION' || (v.details?.trim().length ?? 0) >= 5, { message: 'Tell us what to correct', path: ['details'] })
    .parse(req.body);
  const open = await prisma.dataRequest.findFirst({ where: { userId: req.user!.userId, type, status: 'OPEN' } });
  if (open) throw new AppError(409, 'You already have an open request of this kind. We’ll respond within 30 days.');
  const row = await prisma.dataRequest.create({
    data: { tenantId: req.user!.tenantId, userId: req.user!.userId, type, details: details?.trim() || null },
  });
  await logAudit({ tenantId: req.user!.tenantId, actorId: req.user!.userId, action: `dpa.request.${type.toLowerCase()}`, resource: 'data_request', resourceId: row.id });
  res.status(201).json({ success: true, data: row });
});

export default router;
