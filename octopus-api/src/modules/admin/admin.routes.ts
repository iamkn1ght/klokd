import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import prisma from '../../config/database';
import { reconciliationService } from '../payment/reconciliation.service';
import { AppError } from '../../middleware/errorHandler';
import { isPaymentRailLive } from '../payment/payment.service';
import { notificationService } from '../notification/notification.service';

const router = Router();

// ─── Compliance Config Panel ────────────────────────────

// List all compliance config with audit history
router.get('/compliance/config', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const configs = await prisma.complianceConfig.findMany({
    where: { tenantId: req.user!.tenantId },
    orderBy: { key: 'asc' },
  });
  res.json({ success: true, data: configs });
});

// Get audit trail for a specific config key
router.get('/compliance/config/:key/history', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const logs = await prisma.auditLog.findMany({
    where: {
      tenantId: req.user!.tenantId,
      resource: 'compliance_config',
      resourceId: req.params.key as string,
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  res.json({ success: true, data: logs });
});

// ─── Statutory Dashboard ────────────────────────────────

// Monthly PAYE/NSSF/SHIF summary for KRA export
router.get('/statutory/:year/:month', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const report = await reconciliationService.generateMonthlyReport(
    req.user!.tenantId,
    parseInt(req.params.year as string),
    parseInt(req.params.month as string)
  );
  res.json({ success: true, data: report });
});

// CSV export for KRA submission
router.get('/statutory/:year/:month/csv', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const report = await reconciliationService.generateMonthlyReport(
    req.user!.tenantId,
    parseInt(req.params.year as string),
    parseInt(req.params.month as string)
  );

  const headers = 'Employer,KRA PIN,Shifts,Gross KES,PAYE KES,NSSF KES,SHIF KES,AHL KES,Platform Fee KES,Net KES\n';
  const rows = report.employers.map(e =>
    `"${e.businessName}","${e.kraPin || ''}",${e.shiftCount},${e.grossKes},${e.payeKes},${e.nssfKes},${e.shifKes},${e.ahlKes},${e.platformFeeKes},${e.netKes}`
  ).join('\n');

  const totals = `\n"TOTAL","",${report.platformTotals.totalShifts},${report.platformTotals.totalGrossKes},${report.platformTotals.totalPayeKes},${report.platformTotals.totalNssfKes},${report.platformTotals.totalShifKes},${report.platformTotals.totalAhlKes},${report.platformTotals.totalPlatformFeeKes},${report.platformTotals.totalNetKes}`;

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="klokd-statutory-${req.params.year}-${req.params.month}.csv"`);
  res.send(headers + rows + totals);
});

// ─── Worker/Employer Management ─────────────────────────

// List workers with filters
router.get('/workers', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const schema = z.object({
    status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
    page: z.coerce.number().positive().default(1),
    limit: z.coerce.number().positive().max(100).default(20),
  });
  const { status, page, limit } = schema.parse(req.query);
  const where: Record<string, unknown> = { tenantId: req.user!.tenantId };
  if (status) where.verificationStatus = status;

  const [workers, total] = await Promise.all([
    prisma.worker.findMany({
      where: where as any,
      include: { user: { select: { phone: true, isActive: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.worker.count({ where: where as any }),
  ]);

  res.json({ success: true, data: { workers, total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// List employers
router.get('/employers', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const schema = z.object({
    page: z.coerce.number().positive().default(1),
    limit: z.coerce.number().positive().max(100).default(20),
  });
  const { page, limit } = schema.parse(req.query);

  const [employers, total] = await Promise.all([
    prisma.employer.findMany({
      where: { tenantId: req.user!.tenantId },
      include: { user: { select: { phone: true, isActive: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.employer.count({ where: { tenantId: req.user!.tenantId } }),
  ]);

  res.json({ success: true, data: { employers, total, page, limit, totalPages: Math.ceil(total / limit) } });
});

// Deactivate/reactivate user
router.patch('/users/:userId/status', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const schema = z.object({ isActive: z.boolean() });
  const { isActive } = schema.parse(req.body);

  await prisma.user.update({
    where: { id: req.params.userId as string },
    data: { isActive },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: req.user!.tenantId,
      actorId: req.user!.userId,
      action: isActive ? 'user.reactivated' : 'user.deactivated',
      resource: 'user',
      resourceId: req.params.userId as string,
    },
  });

  res.json({ success: true, message: `User ${isActive ? 'reactivated' : 'deactivated'}` });
});

// ─── Data Subject Rights (DPA 2019) ────────────────────

// Worker requests their data (Right of Access)
router.get('/dpa/access/:userId', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const userId = req.params.userId as string;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError(404, 'User not found');

  const worker = await prisma.worker.findUnique({ where: { userId } });
  const employer = await prisma.employer.findUnique({ where: { userId } });

  const shifts = await prisma.shift.findMany({
    where: worker ? { workerId: worker.id } : { employerId: employer?.id },
    select: { id: true, role: true, date: true, status: true, rateKes: true, locationName: true },
    orderBy: { date: 'desc' },
    take: 100,
  });

  const payments = worker ? await prisma.payment.findMany({
    where: { workerId: worker.id },
    select: { id: true, grossKes: true, netKes: true, paidAt: true, status: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  }) : [];

  const notifications = await prisma.notification.findMany({
    where: { userId },
    select: { type: true, title: true, sentAt: true },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  await prisma.auditLog.create({
    data: {
      tenantId: req.user!.tenantId,
      actorId: req.user!.userId,
      action: 'dpa.access_request',
      resource: 'user',
      resourceId: userId,
    },
  });

  res.json({
    success: true,
    data: {
      user: { phone: user.phone, role: user.role, createdAt: user.createdAt },
      profile: worker || employer,
      shifts,
      payments,
      notifications,
      exportedAt: new Date().toISOString(),
    },
  });
});

// Right of Rectification
router.patch('/dpa/rectify/:userId', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const schema = z.object({
    field: z.string(),
    oldValue: z.string(),
    newValue: z.string(),
    reason: z.string().min(5),
  });
  const data = schema.parse(req.body);

  await prisma.auditLog.create({
    data: {
      tenantId: req.user!.tenantId,
      actorId: req.user!.userId,
      action: 'dpa.rectification',
      resource: 'user',
      resourceId: req.params.userId as string,
      metadata: JSON.stringify(data),
    },
  });

  res.json({ success: true, message: 'Rectification logged. Manual update required for sensitive fields.' });
});

// Right of Erasure
router.delete('/dpa/erase/:userId', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const schema = z.object({ reason: z.string().min(10), confirmErase: z.literal(true) });
  schema.parse(req.body);

  const userId = req.params.userId as string;

  // Anonymize rather than delete (retain structure for compliance, remove PII)
  const worker = await prisma.worker.findUnique({ where: { userId } });
  if (worker) {
    await prisma.worker.update({
      where: { id: worker.id },
      data: {
        firstName: 'ERASED',
        lastName: 'ERASED',
        idNumberHash: null,
        idFrontKey: null,
        idBackKey: null,
        selfieKey: null,
        mpesaNumberEnc: null,
        verificationStatus: 'REJECTED',
      },
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: false },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: req.user!.tenantId,
      actorId: req.user!.userId,
      action: 'dpa.erasure',
      resource: 'user',
      resourceId: userId,
      metadata: JSON.stringify({ reason: req.body.reason }),
    },
  });

  res.json({ success: true, message: 'User data anonymized. Account deactivated. Audit trail retained.' });
});

// ─── Breach Response Panel ──────────────────────────────

// Log a data breach (starts 72hr ODPC countdown)
router.post('/breach', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const schema = z.object({
    description: z.string().min(20),
    affectedRecords: z.number().int().positive(),
    dataTypes: z.array(z.string()).min(1),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  });
  const data = schema.parse(req.body);

  const breach = await prisma.analyticsEvent.create({
    data: {
      tenantId: req.user!.tenantId,
      eventType: 'data_breach',
      metadata: JSON.stringify({
        ...data,
        reportedBy: req.user!.userId,
        reportedAt: new Date().toISOString(),
        odpcDeadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
        odpcNotified: false,
        status: 'OPEN',
      }),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: req.user!.tenantId,
      actorId: req.user!.userId,
      action: 'breach.reported',
      resource: 'breach',
      resourceId: breach.id,
      metadata: JSON.stringify({ severity: data.severity, affectedRecords: data.affectedRecords }),
    },
  });

  const deadline = new Date(Date.now() + 72 * 60 * 60 * 1000);

  res.status(201).json({
    success: true,
    data: {
      breachId: breach.id,
      odpcDeadline: deadline.toISOString(),
      hoursRemaining: 72,
      message: `Breach logged. ODPC must be notified within 72 hours (by ${deadline.toISOString()}).`,
    },
  });
});

// List breaches with countdown
router.get('/breaches', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const breaches = await prisma.analyticsEvent.findMany({
    where: { tenantId: req.user!.tenantId, eventType: 'data_breach' },
    orderBy: { createdAt: 'desc' },
  });

  const enriched = breaches.map(b => {
    const meta = JSON.parse(b.metadata || '{}');
    const deadline = new Date(meta.odpcDeadline);
    const hoursRemaining = Math.max(0, (deadline.getTime() - Date.now()) / (1000 * 60 * 60));
    return {
      id: b.id,
      ...meta,
      hoursRemaining: Math.round(hoursRemaining * 10) / 10,
      isOverdue: hoursRemaining <= 0,
    };
  });

  res.json({ success: true, data: enriched });
});

// ─── Platform Stats ─────────────────────────────────────

router.get('/stats', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [
    workers, verifiedWorkers, employers, verifiedEmployers, totalShifts, openShifts, liveShifts, shiftsToday,
    awaiting, approved, paid, openDisputes, flagged, waitlist, openDataRequests, paymentSum,
  ] = await Promise.all([
    prisma.worker.count({ where: { tenantId } }),
    prisma.worker.count({ where: { tenantId, verificationStatus: 'APPROVED' } }),
    prisma.employer.count({ where: { tenantId } }),
    prisma.employer.count({ where: { tenantId, kraPin: { not: null }, wibaPolicyRef: { not: null } } }),
    prisma.shift.count({ where: { tenantId } }),
    prisma.shift.count({ where: { tenantId, status: 'POSTED' } }),
    prisma.shift.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.shift.count({ where: { tenantId, startTime: { gte: today }, status: { not: 'CANCELLED' } } }),
    prisma.shiftSettlement.aggregate({ where: { tenantId, status: 'AWAITING_APPROVAL' }, _sum: { employerTotalKes: true }, _count: true }),
    prisma.shiftSettlement.aggregate({ where: { tenantId, status: 'APPROVED' }, _sum: { netKes: true, platformFeeKes: true }, _count: true }),
    prisma.shiftSettlement.aggregate({ where: { tenantId, status: 'PAID' }, _sum: { netKes: true, platformFeeKes: true }, _count: true }),
    prisma.dispute.count({ where: { tenantId, status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
    prisma.attendanceEvent.count({ where: { tenantId, NOT: { flags: '[]' }, review: null } }),
    prisma.earlyAccessRequest.count(),
    prisma.dataRequest.count({ where: { tenantId, status: 'OPEN' } }),
    prisma.payment.aggregate({ where: { tenantId, status: 'COMPLETED' }, _sum: { grossKes: true, netKes: true, platformFeeKes: true } }),
  ]);
  res.json({
    success: true,
    data: {
      workers, verifiedWorkers, employers, verifiedEmployers,
      totalShifts, openShifts, liveShifts, shiftsToday,
      awaitingApproval: { count: awaiting._count, totalKes: awaiting._sum.employerTotalKes ?? 0 },
      approvedUnpaid: { count: approved._count, netKes: approved._sum.netKes ?? 0, feesKes: approved._sum.platformFeeKes ?? 0 },
      paid: { count: paid._count, netKes: paid._sum.netKes ?? 0, feesKes: paid._sum.platformFeeKes ?? 0 },
      openDisputes, flaggedAttendance: flagged, waitlist, openDataRequests,
      totalGrossKes: paymentSum._sum.grossKes || 0,
      totalNetKes: paymentSum._sum.netKes || 0,
      totalRevenueKes: paymentSum._sum.platformFeeKes || 0,
      paymentsLive: isPaymentRailLive(),
    },
  });
});

// ─── Audit log ──────────────────────────────────────────

router.get('/audit', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const { limit, before, q } = z
    .object({ limit: z.coerce.number().int().positive().max(200).default(50), before: z.string().optional(), q: z.string().optional() })
    .parse(req.query);
  const rows = await prisma.auditLog.findMany({
    where: {
      tenantId: req.user!.tenantId,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
      ...(q ? { OR: [{ action: { contains: q } }, { resource: { contains: q } }, { resourceId: { contains: q } }] } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  const actorIds = [...new Set(rows.map(r => r.actorId))].filter(id => id.length === 36);
  const users = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, role: true, worker: { select: { firstName: true, lastName: true } }, employer: { select: { businessName: true } } },
  });
  const actors = new Map(
    users.map(u => [
      u.id,
      u.worker ? `${u.worker.firstName} ${u.worker.lastName.charAt(0)}. (worker)` : u.employer ? `${u.employer.businessName} (employer)` : `Klokd ${u.role.toLowerCase()}`,
    ])
  );
  const parse = (m: string | null) => {
    if (!m) return null;
    try {
      return JSON.parse(m);
    } catch {
      return m;
    }
  };
  res.json({
    success: true,
    data: rows.map(r => ({
      id: r.id,
      at: r.createdAt,
      actor: actors.get(r.actorId) ?? r.actorId,
      action: r.action,
      resource: r.resource,
      resourceId: r.resourceId,
      metadata: parse(r.metadata),
    })),
  });
});

// ─── Verification queue ─────────────────────────────────

router.get('/verification', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId;
  const [workers, employers] = await Promise.all([
    prisma.worker.findMany({
      where: { tenantId, verificationStatus: { not: 'APPROVED' } },
      include: { user: { select: { isActive: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.employer.findMany({
      where: { tenantId, OR: [{ kraPin: null }, { wibaPolicyRef: null }, { wibaPolicyExpiry: { lt: new Date() } }] },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ]);
  res.json({
    success: true,
    data: {
      workers: workers.map(w => ({
        workerId: w.id,
        userId: w.userId,
        name: `${w.firstName} ${w.lastName}`,
        status: w.verificationStatus,
        kycTier: w.kycTier,
        hasIdentiti: !!w.accountUuid,
        joined: w.createdAt,
        active: w.user.isActive,
      })),
      employers: employers.map(e => ({
        employerId: e.id,
        userId: e.userId,
        businessName: e.businessName,
        hasKraPin: !!e.kraPin,
        wiba: !e.wibaPolicyRef ? 'missing' : e.wibaPolicyExpiry && e.wibaPolicyExpiry < new Date() ? 'expired' : 'confirmed',
        joined: e.createdAt,
      })),
    },
  });
});

// ─── Pay: settlements + payouts ─────────────────────────

router.get('/settlements', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const { status } = z.object({ status: z.string().optional() }).parse(req.query);
  const rows = await prisma.shiftSettlement.findMany({
    where: { tenantId: req.user!.tenantId, ...(status ? { status } : {}) },
    include: {
      shift: {
        select: {
          id: true, role: true, startTime: true, locationName: true, status: true,
          employer: { select: { businessName: true } },
          worker: { select: { firstName: true, lastName: true } },
          escrow: { select: { status: true } },
          payment: { select: { id: true, status: true, mpesaRef: true, retryCount: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  res.json({
    success: true,
    data: {
      paymentsLive: isPaymentRailLive(),
      rows: rows.map(r => ({
        shiftId: r.shiftId,
        date: r.shift.startTime,
        role: r.shift.role,
        employer: r.shift.employer.businessName,
        worker: r.shift.worker ? `${r.shift.worker.firstName} ${r.shift.worker.lastName.charAt(0)}.` : null,
        grossKes: r.grossKes,
        netKes: r.netKes,
        feeKes: r.platformFeeKes,
        totalKes: r.employerTotalKes,
        status: r.status,
        approvedBy: r.approvedBy === 'auto' ? 'auto' : r.approvedBy ? 'person' : null,
        approveBy: r.approveBy,
        escrow: r.shift.escrow?.status ?? null,
        payment: r.shift.payment,
      })),
    },
  });
});

// ─── Data subject requests ──────────────────────────────

router.get('/data-requests', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const rows = await prisma.dataRequest.findMany({
    where: { tenantId: req.user!.tenantId },
    orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    take: 200,
  });
  const users = await prisma.user.findMany({
    where: { id: { in: rows.map(r => r.userId) } },
    select: { id: true, role: true, worker: { select: { firstName: true, lastName: true } }, employer: { select: { businessName: true } } },
  });
  const who = new Map(users.map(u => [u.id, u.worker ? `${u.worker.firstName} ${u.worker.lastName}` : u.employer?.businessName ?? u.role]));
  res.json({
    success: true,
    data: rows.map(r => ({ ...r, who: who.get(r.userId) ?? r.userId, dueBy: new Date(r.createdAt.getTime() + 30 * 86_400_000) })),
  });
});

router.patch('/data-requests/:id', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const { status, resolution } = z.object({ status: z.enum(['DONE', 'REJECTED']), resolution: z.string().min(5) }).parse(req.body);
  const row = await prisma.dataRequest.update({
    where: { id: req.params.id as string },
    data: { status, resolution, resolvedBy: req.user!.userId, resolvedAt: new Date() },
  });
  await prisma.auditLog.create({
    data: { tenantId: req.user!.tenantId, actorId: req.user!.userId, action: `dpa.request.${status.toLowerCase()}`, resource: 'data_request', resourceId: row.id },
  });
  void notificationService
    .send({
      tenantId: req.user!.tenantId,
      userId: row.userId,
      type: 'dpa.request_resolved',
      title: status === 'DONE' ? 'Your data request is done' : 'About your data request',
      body: resolution,
    })
    .catch(() => undefined);
  res.json({ success: true, data: row });
});


export default router;
