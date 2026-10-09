import prisma from '../../config/database';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { complianceService } from '../compliance/compliance.service';
import { logAudit } from '../../utils/auditLogger';
import { paymentRailClient, identityRailClient } from '../rails';
import { PAYOUT_STEP_UP_THRESHOLD_KES } from '../rails/payment-rail.dto';
import { notificationService } from '../notification/notification.service';

/** Kipkiren Pay is live once its base URL and app credentials are set. */
export function isPaymentRailLive(): boolean {
  const r = config.paymentRail;
  return !!(r.baseUrl && r.appId && r.appSecret);
}

/** Refund the employer's hold if one was funded (cancel / no-show / dispute). */
export async function refundEscrowIfFunded(shiftId: string, tenantId: string, actorId: string) {
  if (!isPaymentRailLive()) return;
  const escrow = await prisma.escrow.findUnique({ where: { shiftId } });
  if (!escrow || !escrow.stkPushRef || !['FUNDED', 'PENDING'].includes(escrow.status)) return;
  try {
    await paymentService.refundEscrow(shiftId, tenantId, actorId);
  } catch (err) {
    console.error(`[ESCROW] refund failed for shift ${shiftId}:`, (err as Error).message);
  }
}

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
   * Pay the worker for an approved settlement via a KP payout.
   *
   * The amounts come from the ShiftSettlement the employer approved (or that
   * auto-approved), so what is paid is exactly what was approved. Idempotent:
   * a settlement already in flight returns its existing payment.
   *
   * Payouts above the step-up threshold need the worker to confirm with an
   * Identiti phone OTP first (KP rail policy): the first call creates the
   * challenge and returns `stepUpRequired`; the worker answers it through
   * POST /payments/:id/step-up, which calls this again with the token.
   */
  async disbursePayment(shiftId: string, tenantId: string, opts: { stepUpToken?: string } = {}) {
    if (!isPaymentRailLive()) {
      throw new AppError(503, 'M-Pesa payouts start when Kipkiren Pay goes live.', true, 'PAYMENT_RAIL_NOT_LIVE');
    }
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { escrow: true, worker: true, settlement: true },
    });

    if (!shift || !shift.workerId || !shift.escrow) {
      throw new AppError(404, 'Shift or hold not found');
    }
    const settlement = shift.settlement;
    if (!settlement || settlement.status !== 'APPROVED') {
      throw new AppError(422, 'Pay for this shift hasn’t been approved yet');
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

    const retainUntil = new Date();
    retainUntil.setFullYear(retainUntil.getFullYear() + config.platform.dataRetentionYears);

    let payment = await prisma.payment.findUnique({ where: { shiftId } });
    if (payment && ['PROCESSING', 'COMPLETED'].includes(payment.status)) return payment;
    if (!payment) {
      payment = await prisma.payment.create({
        data: {
          tenantId,
          shiftId,
          workerId: shift.workerId,
          grossKes: settlement.grossKes,
          payeKes: settlement.payeKes,
          nssfTier1Kes: settlement.nssfTier1Kes,
          nssfTier2Kes: settlement.nssfTier2Kes,
          shifKes: settlement.shifKes,
          ahlKes: settlement.ahlKes,
          platformFeeKes: settlement.platformFeeKes,
          netKes: settlement.netKes,
          status: 'PENDING',
          retainUntil,
        },
      });
      await prisma.shiftSettlement.update({ where: { id: settlement.id }, data: { paymentId: payment.id } });
    }

    // Step-up for large payouts (KP rail policy, not Klokd policy).
    if (settlement.netKes > PAYOUT_STEP_UP_THRESHOLD_KES && !opts.stepUpToken) {
      const challenge = await identityRailClient.createStepUpChallenge({
        accountUuid: shift.worker.accountUuid as `acc_${string}`,
        operationAudience: 'https://klokd.co.ke',
        operationKind: 'klokd.payout_high_value',
        operationRiskTier: 'high',
        factor: 'phone_otp',
      });
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'PENDING', stepUpChallengeId: challenge.challengeId },
      });
      return { ...payment, stepUpRequired: true as const, challengeId: challenge.challengeId };
    }

    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'PROCESSING', stepUpChallengeId: null } });

    const payoutResp = await paymentRailClient.initiatePayout({
      workerAccountUuid: shift.worker.accountUuid as `acc_${string}`,
      amountKes: settlement.netKes,
      holdId: shift.escrow.stkPushRef,
      feeAmountKes: settlement.platformFeeKes,
      stepUpToken: opts.stepUpToken,
      // A retry gets a fresh key, or the rail would replay the failed attempt.
      idempotencyKey: payment.retryCount ? `payout-${payment.id}-r${payment.retryCount}` : `payout-${payment.id}`,
    });

    payment = await prisma.payment.update({
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

    // The settlement and shift move to PAID when KP confirms the payout
    // (PAYOUT_COMPLETED webhook → markPayoutCompleted).
    return payment;
  }

  /** Worker answers the step-up OTP for a large payout. */
  async completeStepUp(paymentId: string, workerUserId: string, code: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { worker: true } });
    if (!payment || payment.worker.userId !== workerUserId) throw new AppError(404, 'Payment not found');
    if (!payment.stepUpChallengeId) throw new AppError(409, 'This payout doesn’t need confirming.');
    const verified = await identityRailClient.verifyStepUpChallenge({
      challengeId: payment.stepUpChallengeId,
      response: code,
    });
    return this.disbursePayment(payment.shiftId, payment.tenantId, { stepUpToken: verified.stepupToken });
  }

  /** KP PAYOUT_COMPLETED: close out the settlement and shift, tell the worker. */
  async markPayoutCompleted(payoutId: string, paidAt: Date, mpesaRef: string | undefined) {
    const payment = await prisma.payment.findFirst({ where: { paymentRailRef: payoutId } });
    if (!payment) return;
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'COMPLETED', paidAt, mpesaRef },
    });
    await prisma.shiftSettlement.updateMany({
      where: { shiftId: payment.shiftId },
      data: { status: 'PAID', paidAt },
    });
    const shift = await prisma.shift.findUnique({ where: { id: payment.shiftId } });
    if (shift && shift.status === 'COMPLETED') {
      await prisma.shift.update({ where: { id: shift.id }, data: { status: 'PAID' } });
      await prisma.shiftEvent.create({
        data: {
          tenantId: shift.tenantId,
          shiftId: shift.id,
          fromState: 'COMPLETED',
          toState: 'PAID',
          actorId: 'payment-rail',
          metadata: JSON.stringify({ paymentId: payment.id, netKes: payment.netKes }),
        },
      });
      await prisma.worker.update({ where: { id: payment.workerId }, data: { totalShifts: { increment: 1 } } });
      await prisma.employer.update({ where: { id: shift.employerId }, data: { totalShifts: { increment: 1 } } });
    }
    await notificationService.notifyPaymentSent(payment.tenantId, payment.workerId, payment.shiftId, payment.netKes, mpesaRef ?? '');
  }

  /**
   * Payout sweep (run by the attendance watcher): pay every approved
   * settlement whose hold is funded. No-op until Kipkiren Pay is live.
   */
  async payoutApprovedSettlements(): Promise<number> {
    if (!isPaymentRailLive()) return 0;
    const due = await prisma.shiftSettlement.findMany({
      where: { status: 'APPROVED', paymentId: null },
      include: { shift: { include: { escrow: true } } },
      take: 25,
    });
    let started = 0;
    for (const s of due) {
      if (s.shift.escrow?.status !== 'FUNDED') continue;
      try {
        await this.disbursePayment(s.shiftId, s.tenantId);
        started++;
      } catch (err) {
        console.error(`[PAYOUT] shift ${s.shiftId}:`, (err as Error).message);
      }
    }
    return started;
  }

  /** Admin retry of a failed payout: reset it and run it through the rail again. */
  async retryPayout(paymentId: string, adminId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new AppError(404, 'Payment not found');
    if (!['FAILED', 'RETRYING'].includes(payment.status)) {
      throw new AppError(409, `This payout is ${payment.status.toLowerCase()}, not failed.`);
    }
    await prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'PENDING', retryCount: { increment: 1 }, paymentRailRef: null },
    });
    await logAudit({ tenantId: payment.tenantId, actorId: adminId, action: 'payout.retry', resource: 'payment', resourceId: paymentId });
    return this.disbursePayment(payment.shiftId, payment.tenantId);
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

    await prisma.shiftSettlement.updateMany({
      where: { shiftId, status: 'AWAITING_APPROVAL' },
      data: { status: 'APPROVED', approvedAt: new Date(), approvedBy: actorId },
    });
    const payment = await this.disbursePayment(shiftId, tenantId);

    await logAudit({
      tenantId,
      actorId,
      action: 'payment.released',
      resource: 'payment',
      resourceId: payment.id,
      metadata: { shiftId, netKes: (payment as any).netKes },
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
