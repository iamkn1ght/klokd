import { Router, Request, Response } from 'express';
import prisma from '../../config/database';
import { config } from '../../config';
import { authenticate, authorize } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { isPaymentRailLive } from '../payment/payment.service';

/**
 * /api/v1/employer — the signed-in employer's numbers.
 *
 *   GET /overview          dashboard figures (all real, no estimates)
 *   GET /billing           pay due, approved, paid + per-shift lines
 *   GET /billing.csv       the same lines as CSV for the accountant
 *   GET /team              workers who have worked here, for re-hiring
 */
const router = Router();

async function employerFor(userId: string) {
  const employer = await prisma.employer.findUnique({ where: { userId } });
  if (!employer) throw new AppError(404, 'Employer profile not found');
  return employer;
}

const weekStart = () => {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
};
const fee = (kes: number) => Math.round((kes * config.platform.feePercent) / 100);

router.get('/overview', authenticate, authorize('EMPLOYER'), async (req: Request, res: Response) => {
  const employer = await employerFor(req.user!.userId);
  const since = weekStart();

  const [weekShifts, openShifts, upcoming, spentWeek, awaiting, starts, noShows] = await Promise.all([
    prisma.shift.count({ where: { employerId: employer.id, startTime: { gte: since }, status: { not: 'CANCELLED' } } }),
    prisma.shift.count({ where: { employerId: employer.id, status: 'POSTED' } }),
    prisma.shift.findMany({
      where: { employerId: employer.id, status: { in: ['POSTED', 'CONFIRMED', 'ACCEPTED', 'ACTIVE'] } },
      select: { rateKes: true },
    }),
    prisma.shiftSettlement.aggregate({
      where: { employerId: employer.id, createdAt: { gte: since }, status: { in: ['APPROVED', 'PAID', 'AWAITING_APPROVAL'] } },
      _sum: { employerTotalKes: true },
    }),
    prisma.shiftSettlement.count({ where: { employerId: employer.id, status: 'AWAITING_APPROVAL' } }),
    prisma.attendanceEvent.count({ where: { employerId: employer.id, type: { in: ['STARTED', 'OVERRIDE_START'] } } }),
    prisma.attendanceEvent.count({ where: { employerId: employer.id, type: 'NO_SHOW' } }),
  ]);

  const committed = upcoming.reduce((n, s) => n + s.rateKes + fee(s.rateKes), 0);
  res.json({
    success: true,
    data: {
      shiftsThisWeek: weekShifts,
      openShifts,
      committedKes: committed,
      committedShifts: upcoming.length,
      spentThisWeekKes: spentWeek._sum.employerTotalKes ?? 0,
      awaitingApproval: awaiting,
      showUpRate: starts + noShows > 0 ? Math.round((starts / (starts + noShows)) * 100) : null,
      paymentsLive: isPaymentRailLive(),
    },
  });
});

async function billingLines(employerId: string) {
  return prisma.shiftSettlement.findMany({
    where: { employerId },
    include: {
      shift: {
        select: {
          id: true, role: true, startTime: true, locationName: true,
          worker: { select: { firstName: true, lastName: true } },
          payment: { select: { status: true, mpesaRef: true, paidAt: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
}

router.get('/billing', authenticate, authorize('EMPLOYER'), async (req: Request, res: Response) => {
  const employer = await employerFor(req.user!.userId);
  const rows = await billingLines(employer.id);
  const sum = (status: string[]) => rows.filter(r => status.includes(r.status)).reduce((n, r) => n + r.employerTotalKes, 0);
  const upcoming = await prisma.shift.findMany({
    where: { employerId: employer.id, status: { in: ['POSTED', 'CONFIRMED', 'ACCEPTED', 'ACTIVE'] } },
    select: { rateKes: true, escrow: { select: { status: true } } },
  });
  res.json({
    success: true,
    data: {
      paymentsLive: isPaymentRailLive(),
      totals: {
        awaitingApprovalKes: sum(['AWAITING_APPROVAL']),
        approvedUnpaidKes: sum(['APPROVED']),
        paidKes: sum(['PAID']),
        disputedKes: sum(['DISPUTED']),
        committedKes: upcoming.reduce((n, s) => n + s.rateKes + fee(s.rateKes), 0),
        fundedKes: upcoming.filter(s => s.escrow?.status === 'FUNDED').reduce((n, s) => n + s.rateKes + fee(s.rateKes), 0),
      },
      lines: rows.map(r => ({
        shiftId: r.shiftId,
        date: r.shift.startTime,
        role: r.shift.role,
        area: r.shift.locationName,
        worker: r.shift.worker ? `${r.shift.worker.firstName} ${r.shift.worker.lastName.charAt(0)}.` : null,
        workedMinutes: r.workedMinutes,
        grossKes: r.grossKes,
        feeKes: r.platformFeeKes,
        totalKes: r.employerTotalKes,
        status: r.status,
        approveBy: r.approveBy,
        paidAt: r.paidAt,
        mpesaRef: r.shift.payment?.mpesaRef ?? null,
      })),
    },
  });
});

router.get('/billing.csv', authenticate, authorize('EMPLOYER'), async (req: Request, res: Response) => {
  const employer = await employerFor(req.user!.userId);
  const rows = await billingLines(employer.id);
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['Date', 'Role', 'Area', 'Worker', 'Hours worked', 'Shift pay (KES)', 'Klokd fee (KES)', 'Total (KES)', 'PAYE', 'NSSF', 'SHIF', 'Housing levy', 'Worker net (KES)', 'Status', 'Paid at', 'M-Pesa ref'];
  const lines = rows.map(r =>
    [
      r.shift.startTime.toISOString().slice(0, 10),
      r.shift.role,
      r.shift.locationName ?? '',
      r.shift.worker ? `${r.shift.worker.firstName} ${r.shift.worker.lastName}` : '',
      (r.workedMinutes / 60).toFixed(2),
      r.grossKes,
      r.platformFeeKes,
      r.employerTotalKes,
      r.payeKes,
      r.nssfTier1Kes + r.nssfTier2Kes,
      r.shifKes,
      r.ahlKes,
      r.netKes,
      r.status,
      r.paidAt ? r.paidAt.toISOString() : '',
      r.shift.payment?.mpesaRef ?? '',
    ].map(esc).join(',')
  );
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="klokd-billing-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send([header.join(','), ...lines].join('\n'));
});

router.get('/team', authenticate, authorize('EMPLOYER'), async (req: Request, res: Response) => {
  const employer = await employerFor(req.user!.userId);
  const shifts = await prisma.shift.findMany({
    where: { employerId: employer.id, status: { in: ['COMPLETED', 'PAID'] }, workerId: { not: null } },
    select: {
      workerId: true,
      role: true,
      startTime: true,
      ratings: { where: { raterRole: 'EMPLOYER' }, select: { stars: true } },
      worker: {
        select: { id: true, firstName: true, lastName: true, showUpRate: true, ratingAggregate: true, ratingCount: true, totalShifts: true, verificationStatus: true, skills: true },
      },
    },
    orderBy: { startTime: 'desc' },
  });
  const team = new Map<string, any>();
  for (const s of shifts) {
    if (!s.worker) continue;
    const t = team.get(s.worker.id) ?? {
      workerId: s.worker.id,
      name: `${s.worker.firstName} ${s.worker.lastName.charAt(0)}.`,
      initials: `${s.worker.firstName.charAt(0)}${s.worker.lastName.charAt(0)}`.toUpperCase(),
      shiftsHere: 0,
      lastWorked: s.startTime,
      roles: new Set<string>(),
      yourStars: [] as number[],
      rating: s.worker.ratingCount >= config.platform.minRatingsForDisplay ? s.worker.ratingAggregate : null,
      showUpRate: s.worker.showUpRate,
      totalShifts: s.worker.totalShifts,
      verified: s.worker.verificationStatus === 'APPROVED',
    };
    t.shiftsHere += 1;
    t.roles.add(s.role);
    for (const r of s.ratings) t.yourStars.push(r.stars);
    team.set(s.worker.id, t);
  }
  const rows = [...team.values()]
    .map(t => ({
      ...t,
      roles: [...t.roles],
      yourRating: t.yourStars.length ? +(t.yourStars.reduce((a: number, b: number) => a + b, 0) / t.yourStars.length).toFixed(1) : null,
      yourStars: undefined,
      trusted: t.shiftsHere >= 3,
    }))
    .sort((a, b) => b.shiftsHere - a.shiftsHere || +new Date(b.lastWorked) - +new Date(a.lastWorked));
  res.json({ success: true, data: rows });
});

export default router;
