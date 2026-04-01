import { Router, Request, Response } from 'express';
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

  // Determine if worker or employer is filing
  const worker = await prisma.worker.findUnique({ where: { userId: req.user!.userId } });
  const employer = await prisma.employer.findUnique({ where: { userId: req.user!.userId } });

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

  // Pause auto-release timer
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

  // Execute the payment action
  if (data.action === 'release_payment') {
    // Move shift back to COMPLETED so payment can release
    await prisma.shift.update({
      where: { id: dispute.shiftId },
      data: { status: 'COMPLETED' },
    });
    // Payment release handled separately via /payments/release/:shiftId
  } else if (data.action === 'reverse_escrow' && dispute.shift.escrow) {
    await prisma.escrow.update({
      where: { id: dispute.shift.escrow.id },
      data: { status: 'REFUNDED', releasedAt: new Date() },
    });
    await prisma.shift.update({
      where: { id: dispute.shiftId },
      data: { status: 'CANCELLED' },
    });
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
