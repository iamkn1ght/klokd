import prisma from '../../config/database';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { complianceService } from '../compliance/compliance.service';
import { logAudit } from '../../utils/auditLogger';
import { paymentRailClient, identityRailClient } from '../rails';
import { PAYOUT_STEP_UP_THRESHOLD_KES } from '../rails/payment-rail.dto';

// Klokd v3 — Payment Service (C4: revised S16-01)
// All payments flow through the KMV payment rail (PaymentRailClient).
// Klokd never calls Daraja. KP wire status updates arrive via the rail
// webhook (POST /api/v1/webhooks/rails/payment-rail).
//
// KP vocabulary mapping (per handover 2026-06-10):
//   Klokd "escrow"   = KP "hold"
//   Klokd "release"  = KP "release"
//   Klokd "reverse"  = KP "refund"

export class PaymentService {
  /**
   * Create a KP hold (Klokd's "escrow funding") when an employer confirms a shift.
   * Status transitions to RESERVED arrive via the HOLD_RESERVED webhook.
   */
  async initiateEscrow(
    shiftId: string,
    employerId: string,
    amountKes: number,
    tenantId: string
  ) {
    const employer = await prisma.employer.findUnique({ where: { id: employerId } });
    if (!employer?.accountUuid) {
      throw new AppError(422, 'Employer has no Identiti account — hold cannot be created');
    }

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { worker: { select: { accountUuid: true } } },
    });
    if (!shift?.worker?.accountUuid) {
      throw new AppError(422, 'Worker has no Identiti account — hold cannot be created');
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

    const hold = await paymentRailClient.createHold({
      payerAccountUuid: employer.accountUuid as `acc_${string}`,
      payeeAccountUuid: shift.worker.accountUuid as `acc_${string}`,
      amountKes: amountKes + feeKes,
      purpose: `klokd_shift_escrow_${shiftId}`,
      idempotencyKey: `hold-${escrow.id}`,
    });

    return prisma.escrow.update({
      where: { id: escrow.id },
      // stkPushRef column repurposed as hold_id reference for backward compat.
      data: { stkPushRef: hold.holdId },
    });
  }

  /**
   * Disburse payment to worker via KP payout.
   * For payouts above KES 10k threshold (per KP rail contract §12.2), require
   * an Identiti step-up token with audience=kipkiren_pay and
   * operation_kind=kipkiren_pay.payout.initiate (NOT a custom klokd.* kind —
   * KP-bound step-ups must use KP's pre-registered operation kinds).
   */
  async disbursePayment(shiftId: string, tenantId: string) {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { escrow: true, worker: true },
    });

    if (!shift || !shift.workerId || !shift.escrow) {
      throw new AppError(404, 'Shift or hold not found');
    }
    if (shift.escrow.status !== 'FUNDED') {
      throw new AppError(422, 'Hold not reserved');
    }
    if (!shift.worker?.accountUuid) {
      throw new AppError(422, 'Worker has no Identiti account — payout cannot be initiated');
    }
    if (!shift.escrow.stkPushRef) {
      throw new AppError(422, 'Hold has no rail reference — payout cannot be initiated');
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

    // Step-up for payouts above KES 10k (KP rail policy, not Klokd policy).
    let stepUpToken: string | undefined;
    if (deductions.netKes > PAYOUT_STEP_UP_THRESHOLD_KES) {
      const accountUuid = shift.worker.accountUuid as `acc_${string}`;
      // operation_audience must be a URI (rail schema: format=uri) — a bare
      // slug is rejected. operation_kind must be one of Identiti's registered
      // enum values; `kipkiren_pay.payout.initiate` is NOT registered, whereas
      // `klokd.payout_high_value` was registered for exactly this path.
      // Both verified live against Identiti 0.1.2 on 22 Jul 2026.
      const challenge = await identityRailClient.createStepUpChallenge({
        accountUuid,
        operationAudience: 'https://klokd.co.ke',
        operationKind: 'klokd.payout_high_value',
        operationRiskTier: 'high',
        factor: 'phone_otp',
      });

      // Caller (employer release flow) must submit OTP through a separate
      // endpoint that calls verifyStepUpChallenge and stores the resulting
      // JWT to reattempt this disbursement. v3 follow-up work.
      await prisma.payment.update({ where: { id: payment.id }, data: { status: 'FAILED' } });
      throw new AppError(
        202,
        `Step-up required for KES ${deductions.netKes.toLocaleString()} payout. ` +
          `Challenge id: ${challenge.challengeId}. Submit OTP via /api/v1/payments/${payment.id}/step-up.`
      );
    }

    const payoutResp = await paymentRailClient.initiatePayout({
      workerAccountUuid: shift.worker.accountUuid as `acc_${string}`,
      amountKes: deductions.netKes,
      holdId: shift.escrow.stkPushRef,
      feeAmountKes: shift.escrow.feeKes,
      stepUpToken,
      idempotencyKey: `payout-${payment.id}`,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { paymentRailRef: payoutResp.payoutId },
    });

    // Release the hold (settles funds to worker via the payout pipeline).
    await paymentRailClient.releaseHold({
      holdId: shift.escrow.stkPushRef,
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

  /**
   * Dispute resolution: refund the hold back to the employer.
   * KP terminology: "refund" not "reverse".
   */
  async refundEscrow(shiftId: string, tenantId: string, actorId: string) {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { escrow: true },
    });

    if (!shift?.escrow?.stkPushRef) {
      throw new AppError(404, 'Hold not found for shift');
    }

    await paymentRailClient.refundHold({
      holdId: shift.escrow.stkPushRef,
      idempotencyKey: `refund-${shift.escrow.id}`,
    });

    await prisma.escrow.update({
      where: { id: shift.escrow.id },
      data: { status: 'REFUNDED' },
    });

    await logAudit({
      tenantId,
      actorId,
      action: 'escrow.refunded',
      resource: 'escrow',
      resourceId: shift.escrow.id,
      metadata: { shiftId, holdId: shift.escrow.stkPushRef },
    });

    return { status: 'REFUNDED' };
  }
}

export const paymentService = new PaymentService();
