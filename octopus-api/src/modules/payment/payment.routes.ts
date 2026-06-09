import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { paymentService } from './payment.service';
import { payStatementService } from './paystatement.service';
import { reconciliationService } from './reconciliation.service';
import { authenticate, authorize } from '../../middleware/auth';
import prisma from '../../config/database';

const router = Router();

// Employer: release payment for a completed shift
router.post('/release/:shiftId', authenticate, authorize('EMPLOYER'), async (req: Request, res: Response) => {
  const result = await paymentService.releasePayment(
    req.params.shiftId as string,
    req.user!.tenantId,
    req.user!.userId
  );
  res.json({ success: true, data: result });
});

// Get payment details for a shift
router.get('/shift/:shiftId', authenticate, async (req: Request, res: Response) => {
  const payment = await paymentService.getPaymentByShift(req.params.shiftId as string);
  if (!payment) {
    res.status(404).json({ success: false, error: 'Payment not found' });
    return;
  }
  res.json({ success: true, data: payment });
});

// Worker: get my payment history
router.get('/my', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const worker = await prisma.worker.findUnique({ where: { userId: req.user!.userId } });
  if (!worker) {
    res.status(404).json({ success: false, error: 'Worker profile not found' });
    return;
  }

  const payments = await prisma.payment.findMany({
    where: { workerId: worker.id },
    include: {
      shift: {
        select: { role: true, date: true, locationName: true, employerId: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: payments });
});

// ─── Pay Statement PDF ─────────────────────────────────

router.get('/statement/:paymentId', authenticate, async (req: Request, res: Response) => {
  const pdf = await payStatementService.generatePayStatement(req.params.paymentId as string);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="klokd-paystatement-${req.params.paymentId as string}.pdf"`);
  res.send(pdf);
});

// Worker: monthly statement summary
router.get('/monthly/:year/:month', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const worker = await prisma.worker.findUnique({ where: { userId: req.user!.userId } });
  if (!worker) {
    res.status(404).json({ success: false, error: 'Worker profile not found' });
    return;
  }
  const result = await payStatementService.getMonthlyStatement(
    worker.id,
    parseInt(req.params.year as string),
    parseInt(req.params.month as string)
  );
  res.json({ success: true, data: result });
});

// Daraja callbacks removed per AD-K01. Payment rail status transitions arrive
// at POST /api/v1/webhooks/rails/payment-rail (HMAC-verified).

// ─── Admin: Reconciliation ──────────────────────────────

router.get('/reconciliation/:year/:month', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const result = await reconciliationService.generateMonthlyReport(
    req.user!.tenantId,
    parseInt(req.params.year as string),
    parseInt(req.params.month as string)
  );
  res.json({ success: true, data: result });
});

// Admin: retry a failed payment
router.post('/retry/:paymentId', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const result = await paymentService.handlePaymentFailure(req.params.paymentId as string);
  res.json({ success: true, data: result });
});

export default router;
