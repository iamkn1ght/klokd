import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import prisma from '../../config/database';
import { reconciliationService } from '../payment/reconciliation.service';
import { AppError } from '../../middleware/errorHandler';

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

  const [workerCount, employerCount, shiftCount, paymentSum] = await Promise.all([
    prisma.worker.count({ where: { tenantId } }),
    prisma.employer.count({ where: { tenantId } }),
    prisma.shift.count({ where: { tenantId } }),
    prisma.payment.aggregate({
      where: { tenantId, status: 'COMPLETED' },
      _sum: { grossKes: true, netKes: true, platformFeeKes: true },
    }),
  ]);

  res.json({
    success: true,
    data: {
      workers: workerCount,
      employers: employerCount,
      totalShifts: shiftCount,
      totalGrossKes: paymentSum._sum.grossKes || 0,
      totalNetKes: paymentSum._sum.netKes || 0,
      totalRevenueKes: paymentSum._sum.platformFeeKes || 0,
    },
  });
});

// ─── Seed Demo Data (one-time, protected by JWT secret) ─

router.post('/seed-demo', async (req: Request, res: Response) => {
  const { secret } = req.body || {};
  if (secret !== process.env.JWT_SECRET) {
    res.status(403).json({ success: false, error: 'Invalid secret' });
    return;
  }

  const TENANT = 'klokd-ke-default';
  const crypto = require('crypto');

  // Check if already seeded
  const existing = await prisma.employer.count({ where: { tenantId: TENANT } });
  if (existing > 0) {
    res.json({ success: true, message: `Already seeded (${existing} employers exist)` });
    return;
  }

  const businesses = [
    'The Brew Bistro', 'Java House', 'Artcaffe', 'Big Square', 'Mama Oliech',
    'Carnivore Restaurant', 'Talisman', 'Nyama Mama', 'About Thyme', 'Tin Roof Cafe',
  ];
  const firstNames = ['Akinyi', 'Wanjiku', 'Kamau', 'Otieno', 'Njeri', 'Mwangi', 'Achieng', 'Odhiambo', 'Wambui', 'Kipchoge'];
  const skills = ['Waiter', 'Barista', 'Chef', 'Cashier', 'Security', 'Cleaner'];
  const locations = [
    { name: 'Westlands', lat: -1.2636, lng: 36.8036 },
    { name: 'Kilimani', lat: -1.2864, lng: 36.7830 },
    { name: 'Karen', lat: -1.3197, lng: 36.7112 },
    { name: 'CBD', lat: -1.2864, lng: 36.8172 },
    { name: 'Lavington', lat: -1.2783, lng: 36.7700 },
  ];

  // Seed 10 employers
  for (let i = 0; i < 10; i++) {
    const phone = `+2547${String(20000000 + i).padStart(8, '0')}`;
    const user = await prisma.user.create({ data: { tenantId: TENANT, phone, role: 'EMPLOYER' } });
    await prisma.employer.create({
      data: {
        tenantId: TENANT, userId: user.id, businessName: businesses[i],
        kraPin: `P0${String(51234567 + i)}A`, contactPerson: firstNames[i],
        wibaPolicyRef: `POL-2026-${String(i + 1).padStart(3, '0')}`, wibaInsurer: 'Jubilee',
        wibaPolicyExpiry: new Date('2027-12-31'),
        mpesaMethod: 'paybill', mpesaAccountEnc: Buffer.from(phone).toString('base64'),
      },
    });
  }

  // Seed 30 workers
  for (let i = 0; i < 30; i++) {
    const phone = `+2547${String(10000000 + i).padStart(8, '0')}`;
    const user = await prisma.user.create({ data: { tenantId: TENANT, phone, role: 'WORKER' } });
    const workerSkills = [skills[i % skills.length], skills[(i + 1) % skills.length]];
    await prisma.worker.create({
      data: {
        tenantId: TENANT, userId: user.id,
        firstName: firstNames[i % firstNames.length], lastName: 'K.',
        idNumberHash: crypto.createHash('sha256').update(`ID-${i}`).digest('hex'),
        verificationStatus: 'APPROVED', skills: JSON.stringify(workerSkills),
        consentIdentity: true, consentGps: true, consentedAt: new Date(),
        mpesaNumberEnc: Buffer.from(phone).toString('base64'),
        showUpRate: 75 + Math.floor(Math.random() * 25),
        ratingAggregate: 3.5 + Math.random() * 1.5, ratingCount: 3 + Math.floor(Math.random() * 15),
        totalShifts: Math.floor(Math.random() * 50),
      },
    });
  }

  // Seed minimum wages
  for (const sector of skills) {
    await prisma.minimumWage.create({
      data: { tenantId: TENANT, sector: sector.toLowerCase(), location: 'nairobi', rateKes: 1000, effectiveFrom: new Date() },
    });
  }

  // Seed 15 available shifts
  const employers = await prisma.employer.findMany({ where: { tenantId: TENANT }, take: 10 });
  for (let i = 0; i < 15; i++) {
    const emp = employers[i % employers.length];
    const loc = locations[i % locations.length];
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1 + (i % 3));
    const start = new Date(tomorrow); start.setHours(8 + (i % 3) * 4, 0, 0, 0);
    const end = new Date(start); end.setHours(start.getHours() + 5);

    await prisma.shift.create({
      data: {
        tenantId: TENANT, employerId: emp.id,
        role: skills[i % skills.length], description: `${skills[i % skills.length]} needed at ${emp.businessName}`,
        date: tomorrow, startTime: start, endTime: end,
        rateKes: 1200 + (i % 5) * 200,
        locationLat: loc.lat + (Math.random() - 0.5) * 0.01,
        locationLng: loc.lng + (Math.random() - 0.5) * 0.01,
        locationName: loc.name, geoHash: `kzf${i}`,
        status: 'POSTED',
      },
    });
  }

  // Create admin user
  const adminUser = await prisma.user.create({ data: { tenantId: TENANT, phone: '+254700000001', role: 'ADMIN' } });

  res.json({
    success: true,
    message: '10 employers, 30 workers, 15 shifts, 6 min wage rates, 1 admin seeded',
    adminPhone: '+254700000001',
  });
});

export default router;
