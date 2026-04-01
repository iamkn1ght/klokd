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

// ─── Daraja Callbacks ───────────────────────────────────

// STK Push callback (escrow funding confirmation)
router.post('/callback/stk', async (req: Request, res: Response) => {
  const body = req.body?.Body?.stkCallback;
  if (!body) {
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    return;
  }

  const checkoutRequestId = body.CheckoutRequestID;
  const resultCode = body.ResultCode;

  if (resultCode === 0) {
    // Find escrow by STK ref and confirm
    const escrow = await prisma.escrow.findFirst({
      where: { stkPushRef: checkoutRequestId },
    });
    if (escrow) {
      await paymentService.confirmEscrowFunding(escrow.id, checkoutRequestId);
    }
  }

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// B2C result callback (worker payment confirmation)
router.post('/callback/b2c', async (req: Request, res: Response) => {
  const result = req.body?.Result;
  if (!result) {
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    return;
  }

  const conversationId = result.ConversationID;
  const resultCode = result.ResultCode;

  const payment = await prisma.payment.findFirst({
    where: { darajaRef: conversationId },
  });

  if (payment) {
    if (resultCode === 0) {
      await paymentService.confirmDisbursement(payment.id, conversationId);
    } else {
      await paymentService.handlePaymentFailure(payment.id);
    }
  }

  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

// B2C timeout callback
router.post('/callback/timeout', async (req: Request, res: Response) => {
  const conversationId = req.body?.Result?.ConversationID;
  if (conversationId) {
    const payment = await prisma.payment.findFirst({
      where: { darajaRef: conversationId },
    });
    if (payment) {
      await paymentService.handlePaymentFailure(payment.id);
    }
  }
  res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
});

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
