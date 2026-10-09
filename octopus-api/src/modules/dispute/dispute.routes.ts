import { Router, Request, Response } from 'express';
import { attendanceService } from '../attendance/attendance.service';
import { notificationService } from '../notification/notification.service';
import { refundEscrowIfFunded } from '../payment/payment.service';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// Create dispute
router.post('/', authenticate, async (req: Request, res: Response) => {
  const schema = z.object({
    shiftId: z.string().uuid(),
    type: z.enum(['NO_SHOW', 'INCOMPLETE_SHIFT', 'CONDUCT_ISSUE', 'PAYMENT_NOT_RECEIVED', 'UNSAFE_CONDITIONS', 'OTHER']),
    description: z.string().min(10),
    evidenceKeys: z.array(z.string()).max(3).optional(),
  });
  const data = schema.parse(req.body);

  const shift = await prisma.shift.findUnique({ where: { id: data.shiftId } });
  if (!shift) throw new AppError(404, 'Shift not found');

  // Determine if worker or employer is filing — only the two parties can.
  const worker = await prisma.worker.findUnique({ where: { userId: req.user!.userId } });
  const employer = await prisma.employer.findUnique({ where: { userId: req.user!.userId } });
  const isParty = (!!worker && shift.workerId === worker.id) || (!!employer && shift.employerId === employer.id);
  if (!isParty) throw new AppError(404, 'Shift not found');
  const already = await prisma.dispute.findUnique({ where: { shiftId: data.shiftId } });
  if (already) throw new AppError(409, 'A problem has already been reported for this shift. Klokd is looking into it.');

  const dispute = await prisma.dispute.create({
    data: {
      tenantId: req.user!.tenantId,
      shiftId: data.shiftId,
      workerId: worker?.id,
      employerId: employer?.id,
      type: data.type,
      description: data.description,
      evidenceKeys: JSON.stringify(data.evidenceKeys || []),
      status: 'OPEN',
    },
  });

  // Pause the settlement and the auto-release timer
  await attendanceService.markDisputed(data.shiftId);
  await prisma.escrow.updateMany({
    where: { shiftId: data.shiftId },
    data: { autoReleaseAt: null },
  });

  // Update shift status to DISPUTED
  if (shift.status === 'COMPLETED') {
    await prisma.shift.update({
      where: { id: data.shiftId },
      data: { status: 'DISPUTED' },
    });

    await prisma.shiftEvent.create({
      data: {
        tenantId: req.user!.tenantId,
        shiftId: data.shiftId,
        fromState: 'COMPLETED',
        toState: 'DISPUTED',
        actorId: req.user!.userId,
        metadata: JSON.stringify({ disputeId: dispute.id, type: data.type }),
      },
    });
  }

  res.status(201).json({
    success: true,
    data: dispute,
    message: `Your dispute has been logged. Reference: ${dispute.id}. We'll respond within 24 hours.`,
  });
});

// Get dispute by shift
router.get('/shift/:shiftId', authenticate, async (req: Request, res: Response) => {
  const dispute = await prisma.dispute.findUnique({ where: { shiftId: req.params.shiftId as string } });
  if (!dispute) {
    res.status(404).json({ success: false, error: 'No dispute found' });
    return;
  }
  res.json({ success: true, data: dispute });
});

// Admin: every dispute, open first
router.get('/admin/all', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const disputes = await prisma.dispute.findMany({
    where: { tenantId: req.user!.tenantId },
    include: {
      shift: {
        select: {
          id: true, role: true, date: true, startTime: true, endTime: true, rateKes: true, locationName: true, status: true,
          clockInAt: true, clockOutAt: true,
          worker: { select: { firstName: true, lastName: true } },
          employer: { select: { businessName: true } },
          settlement: { select: { grossKes: true, netKes: true, workedMinutes: true, scheduledMinutes: true, status: true } },
        },
      },
      worker: { select: { firstName: true, lastName: true } },
      employer: { select: { businessName: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });
  const rank: Record<string, number> = { OPEN: 0, UNDER_REVIEW: 1 };
  disputes.sort((a, b) => (rank[a.status] ?? 2) - (rank[b.status] ?? 2));
  res.json({ success: true, data: disputes });
});

// Admin: list all open disputes
router.get('/admin/open', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const disputes = await prisma.dispute.findMany({
    where: { tenantId: req.user!.tenantId, status: { in: ['OPEN', 'UNDER_REVIEW'] } },
    include: {
      shift: { select: { role: true, date: true, rateKes: true, locationName: true } },
      worker: { select: { firstName: true, lastName: true } },
      employer: { select: { businessName: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  res.json({ success: true, data: disputes });
});

// Admin: escalate dispute to under review
router.patch('/:id/review', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const dispute = await prisma.dispute.update({
    where: { id: req.params.id as string },
    data: { status: 'UNDER_REVIEW' },
  });
  res.json({ success: true, data: dispute });
});

// Admin: resolve dispute with payment action
router.patch('/:id/resolve', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const schema = z.object({
    resolution: z.string().min(10),
    action: z.enum(['release_payment', 'partial_payment', 'reverse_escrow']),
    partialAmountKes: z.number().positive().optional(),
  });
  const data = schema.parse(req.body);

  const dispute = await prisma.dispute.findUnique({
    where: { id: req.params.id as string },
    include: { shift: { include: { escrow: true } } },
  });
  if (!dispute) throw new AppError(404, 'Dispute not found');

  // Resolve the dispute
  const resolved = await prisma.dispute.update({
    where: { id: req.params.id as string },
    data: {
      status: 'RESOLVED',
      resolution: data.resolution,
      resolvedBy: req.user!.userId,
      resolvedAt: new Date(),
    },
  });

  if (data.action === 'partial_payment' && !data.partialAmountKes) {
    throw new AppError(422, 'Enter the amount to pay for a partial payment.');
  }

  // Execute the payment action. Pay itself goes out through the payout sweep
  // (Kipkiren Pay) once the settlement is approved.
  if (data.action === 'release_payment' || data.action === 'partial_payment') {
    if (dispute.shift.status === 'DISPUTED') {
      await prisma.shift.update({ where: { id: dispute.shiftId }, data: { status: 'COMPLETED' } });
    }
  } else if (data.action === 'reverse_escrow') {
    await refundEscrowIfFunded(dispute.shiftId, req.user!.tenantId, req.user!.userId);
    await prisma.shift.update({
      where: { id: dispute.shiftId },
      data: { status: 'CANCELLED' },
    });
  }
  await attendanceService.applyDisputeResolution(dispute.shiftId, req.user!.userId, data.action, data.partialAmountKes);

  // Tell both parties the outcome.
  const parties = await prisma.shift.findUnique({
    where: { id: dispute.shiftId },
    include: { worker: { select: { userId: true } }, employer: { select: { userId: true } } },
  });
  const outcome =
    data.action === 'release_payment' ? 'Pay will go out as calculated.'
    : data.action === 'partial_payment' ? `Pay was adjusted to KES ${data.partialAmountKes!.toLocaleString()}.`
    : 'No pay is due for this shift; the employer’s funds are returned.';
  for (const uid of [parties?.worker?.userId, parties?.employer.userId].filter((x): x is string => !!x)) {
    void notificationService
      .send({
        tenantId: req.user!.tenantId,
        userId: uid,
        type: 'dispute.resolved',
        title: 'Your reported problem is resolved',
        body: `${outcome} ${data.resolution}`,
        shiftId: dispute.shiftId,
      })
      .catch(() => undefined);
  }

  // Log the resolution
  await prisma.shiftEvent.create({
    data: {
      tenantId: req.user!.tenantId,
      shiftId: dispute.shiftId,
      fromState: 'DISPUTED',
      toState: data.action === 'reverse_escrow' ? 'CANCELLED' : 'COMPLETED',
      actorId: req.user!.userId,
      metadata: JSON.stringify({
        disputeId: dispute.id,
        action: data.action,
        resolution: data.resolution,
      }),
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: req.user!.tenantId,
      actorId: req.user!.userId,
      action: 'dispute.resolved',
      resource: 'dispute',
      resourceId: dispute.id,
      metadata: JSON.stringify({ action: data.action, shiftId: dispute.shiftId }),
    },
  });

  res.json({ success: true, data: resolved });
});

export default router;
