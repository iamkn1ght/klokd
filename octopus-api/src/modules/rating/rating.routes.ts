import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../middleware/auth';
import prisma from '../../config/database';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// Submit rating after shift
router.post('/', authenticate, async (req: Request, res: Response) => {
  const schema = z.object({
    shiftId: z.string().uuid(),
    stars: z.number().int().min(1).max(5),
    comment: z.string().max(500).optional(),
  });
  const data = schema.parse(req.body);

  const shift = await prisma.shift.findUnique({ where: { id: data.shiftId } });
  if (!shift || !['COMPLETED', 'PAID'].includes(shift.status)) {
    throw new AppError(422, 'Shift must be completed before rating');
  }

  const worker = await prisma.worker.findUnique({ where: { userId: req.user!.userId } });
  const employer = await prisma.employer.findUnique({ where: { userId: req.user!.userId } });

  const raterRole = req.user!.role;

  const rating = await prisma.rating.create({
    data: {
      tenantId: req.user!.tenantId,
      shiftId: data.shiftId,
      workerId: raterRole === 'EMPLOYER' ? shift.workerId : undefined,
      employerId: raterRole === 'WORKER' ? shift.employerId : undefined,
      raterRole,
      stars: data.stars,
      comment: data.comment,
    },
  });

  // Update aggregate rating
  if (raterRole === 'EMPLOYER' && shift.workerId) {
    await updateWorkerRating(shift.workerId);
  } else if (raterRole === 'WORKER') {
    await updateEmployerRating(shift.employerId);
  }

  res.status(201).json({ success: true, data: rating });
});

// Helper functions as module-level
async function updateWorkerRating(workerId: string) {
  const ratings = await prisma.rating.findMany({
    where: { workerId, raterRole: 'EMPLOYER' },
    select: { stars: true },
  });

  const count = ratings.length;
  const aggregate = count > 0 ? ratings.reduce((sum, r) => sum + r.stars, 0) / count : null;

  await prisma.worker.update({
    where: { id: workerId },
    data: {
      ratingAggregate: count >= config.platform.minRatingsForDisplay ? aggregate : null,
      ratingCount: count,
    },
  });
}

async function updateEmployerRating(employerId: string) {
  const ratings = await prisma.rating.findMany({
    where: { employerId, raterRole: 'WORKER' },
    select: { stars: true },
  });

  const count = ratings.length;
  const aggregate = count > 0 ? ratings.reduce((sum, r) => sum + r.stars, 0) / count : null;

  await prisma.employer.update({
    where: { id: employerId },
    data: {
      ratingAggregate: count >= config.platform.minRatingsForDisplay ? aggregate : null,
      ratingCount: count,
    },
  });
}

export default router;
