import prisma from '../../config/database';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { complianceService } from '../compliance/compliance.service';
import { logAudit } from '../../utils/auditLogger';
import { paymentRailClient, identityRailClient } from '../rails';

// Klokd v3 — Payment Service (C4: revised S16-01)
// All payments flow through the KMV payment rail (PaymentRailClient).
// Klokd never calls Daraja. Webhook updates from the rail land at
// POST /api/v1/webhooks/rails/payment-rail.

export class PaymentService {
  /**
   * Initiate escrow funding via the payment rail.
   * Status transitions to FUNDED arrive via the ESCROW_FUNDED webhook.
   */
  async initiateEscrow(
    shiftId: string,
    employerId: string,
    amountKes: number,
    tenantId: string
  ) {
    const employer = await prisma.employer.findUnique({ where: { id: employerId } });
    if (!employer?.accountUuid) {
      throw new AppError(422, 'Employer has no Identiti account — escrow cannot be funded');
    }

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { worker: { select: { accountUuid: true } } },
    });
    if (!shift?.worker?.accountUuid) {
      throw new AppError(422, 'Worker has no Identiti account — escrow cannot be funded');
    }

    const feeKes = Math.round(amountKes * (config.platform.feePercent / 100));

    const escrow = await prisma.escrow.create({
      data: {
        tenantId,
        shiftId,
        employerId,
        amountKes,
        feeKes,
        status: 'PENDING',
      },
    });

    const railResp = await paymentRailClient.fundEscrow({
      shiftId,
      employerAccountUuid: employer.accountUuid,
      amountGrossKes: amountKes,
      feeRate: config.platform.feePercent / 100,
      workerAccountUuid: shift.worker.accountUuid,
      idempotencyKey: `escrow-${escrow.id}`,
    });

    return prisma.escrow.update({
      where: { id: escrow.id },
      data: { stkPushRef: railResp.escrowRef },
    });
  }

  /**
   * Disburse payment to worker via the payment rail.
   * Compliance deductions calculated by Klokd; amounts passed to the rail.
   */
  async disbursePayment(shiftId: string, tenantId: string) {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { escrow: true, worker: true },
    });

    if (!shift || !shift.workerId || !shift.escrow) {
      throw new AppError(404, 'Shift or escrow not found');
    }
    if (shift.escrow.status !== 'FUNDED') {
      throw new AppError(422, 'Escrow not funded');
    }
    if (!shift.worker?.accountUuid) {
      throw new AppError(422, 'Worker has no Identiti account — payout cannot be initiated');
    }
    if (!shift.escrow.stkPushRef) {
      throw new AppError(422, 'Escrow has no rail reference — payout cannot be initiated');
    }

    const deductions = await complianceService.calculateDeductions(tenantId, shift.rateKes);

    const retainUntil = new Date();
    retainUntil.setFullYear(retainUntil.getFullYear() + config.platform.dataRetentionYears);

    const payment = await prisma.payment.create({
      data: {
        tenantId,
        shiftId,
        workerId: shift.workerId,
        grossKes: shift.rateKes,
        payeKes: deductions.payeKes,
        nssfTier1Kes: deductions.nssfTier1Kes,
        nssfTier2Kes: deductions.nssfTier2Kes,
        shifKes: deductions.shifKes,
        ahlKes: deductions.ahlKes,
        platformFeeKes: shift.escrow.feeKes,
        netKes: deductions.netKes,
        status: 'PROCESSING',
        retainUntil,
      },
    });

    let stepUpJwt: string | undefined;
    if (deductions.netKes > config.platform.payoutStepUpThresholdKes) {
      const challenge = await identityRailClient.initiateStepUp({
        accountUuid: shift.worker.accountUuid,
        operation: 'payout',
        contextRef: payment.id,
      });
      const result = await identityRailClient.getStepUpResult(challenge.challengeId);
      if (result.status !== 'approved' || !result.stepUpJwt) {
        await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
        throw new AppError(422, 'Step-up authentication required for payout was not approved');
      }
      stepUpJwt = result.stepUpJwt;
    }

    const railResp = await paymentRailClient.initiatePayout({
      workerAccountUuid: shift.worker.accountUuid,
      netAmountKes: deductions.netKes,
      shiftId,
      escrowRef: shift.escrow.stkPushRef,
      feeAmountKes: shift.escrow.feeKes,
      stepUpJwt,
      idempotencyKey: `payout-${payment.id}`,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { paymentRailRef: railResp.paymentId },
    });

    await paymentRailClient.releaseEscrow({
      escrowRef: shift.escrow.stkPushRef,
      idempotencyKey: `release-${shift.escrow.id}`,
    });

    await prisma.escrow.update({
      where: { id: shift.escrow.id },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });

    await prisma.shift.update({
      where: { id: shiftId },
      data: { status: 'PAID' },
    });

    await prisma.shiftEvent.create({
      data: {
        tenantId,
        shiftId,
        fromState: 'COMPLETED',
        toState: 'PAID',
        actorId: 'system',
        metadata: JSON.stringify({ paymentId: payment.id, netKes: deductions.netKes }),
      },
    });

    await prisma.worker.update({
      where: { id: shift.workerId },
      data: { totalShifts: { increment: 1 } },
    });

    await prisma.employer.update({
      where: { id: shift.employerId },
      data: { totalShifts: { increment: 1 } },
    });

    return payment;
  }

  /**
   * Handle payment failure with retry logic.
   * Rail-side failures arrive via PAYOUT_FAILED webhook; this is the retry kick.
   */
  async handlePaymentFailure(paymentId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new AppError(404, 'Payment not found');

    if (payment.retryCount >= 3) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'FAILED' },
      });
      return { status: 'FAILED', message: 'Max retries reached. Admin notified.' };
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'RETRYING', retryCount: { increment: 1 } },
    });

    return { status: 'RETRYING', retryCount: payment.retryCount + 1 };
  }

  async getPaymentByShift(shiftId: string) {
    return prisma.payment.findUnique({ where: { shiftId } });
  }

  async releasePayment(shiftId: string, tenantId: string, actorId: string) {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { escrow: true },
    });

    if (!shift || shift.status !== 'COMPLETED') {
      throw new AppError(422, 'Shift must be completed before payment can be released');
    }

    const dispute = await prisma.dispute.findUnique({ where: { shiftId } });
    if (dispute && dispute.status === 'OPEN') {
      throw new AppError(422, 'Cannot release payment while dispute is open');
    }

    const payment = await this.disbursePayment(shiftId, tenantId);

    await logAudit({
      tenantId,
      actorId,
      action: 'payment.released',
      resource: 'payment',
      resourceId: payment.id,
      metadata: { shiftId, netKes: payment.netKes },
    });

    return payment;
  }
}

export const paymentService = new PaymentService();
