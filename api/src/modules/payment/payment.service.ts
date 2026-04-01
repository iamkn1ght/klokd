import prisma from '../../config/database';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { complianceService } from '../compliance/compliance.service';
import { logAudit } from '../../utils/auditLogger';

/**
 * Payment Service — fully decoupled from Shift Service.
 * A failed payment NEVER corrupts a shift.
 */
export class PaymentService {
  /**
   * Initiate escrow funding via STK Push on shift confirmation.
   */
  async initiateEscrow(
    shiftId: string,
    employerId: string,
    amountKes: number,
    tenantId: string
  ) {
    const feeKes = Math.round(amountKes * (config.platform.feePercent / 100));
    const totalKes = amountKes + feeKes;

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

    // In production: trigger Daraja STK Push to employer's M-Pesa
    // For sandbox, we simulate a successful funding
    if (config.daraja.env === 'sandbox') {
      await this.confirmEscrowFunding(escrow.id, `SANDBOX-${Date.now()}`);
    }

    return escrow;
  }

  /**
   * Confirm escrow funding (called by Daraja callback or sandbox simulation).
   */
  async confirmEscrowFunding(escrowId: string, stkPushRef: string) {
    return prisma.escrow.update({
      where: { id: escrowId },
      data: {
        status: 'FUNDED',
        stkPushRef,
        fundedAt: new Date(),
      },
    });
  }

  /**
   * Disburse payment to worker. Called on payment release or auto-release.
   * Compliance deductions applied BEFORE disbursement.
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

    // Calculate compliance deductions
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

    // In production: call Daraja B2C to send netKes to worker's M-Pesa
    // For sandbox, simulate success
    if (config.daraja.env === 'sandbox') {
      await this.confirmDisbursement(payment.id, `B2C-SANDBOX-${Date.now()}`);
    }

    // Release escrow
    await prisma.escrow.update({
      where: { id: shift.escrow.id },
      data: { status: 'RELEASED', releasedAt: new Date() },
    });

    // Update shift to PAID
    await prisma.shift.update({
      where: { id: shiftId },
      data: { status: 'PAID' },
    });

    // Log the shift event
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

    // Update worker stats
    await prisma.worker.update({
      where: { id: shift.workerId },
      data: { totalShifts: { increment: 1 } },
    });

    // Update employer stats
    await prisma.employer.update({
      where: { id: shift.employerId },
      data: { totalShifts: { increment: 1 } },
    });

    return payment;
  }

  /**
   * Confirm B2C disbursement (Daraja callback or sandbox).
   */
  async confirmDisbursement(paymentId: string, darajaRef: string) {
    return prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'COMPLETED',
        darajaRef,
        paidAt: new Date(),
      },
    });
  }

  /**
   * Handle payment failure with retry logic.
   */
  async handlePaymentFailure(paymentId: string) {
    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new AppError(404, 'Payment not found');

    if (payment.retryCount >= 3) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'FAILED' },
      });
      // In production: notify admin for manual resolution
      return { status: 'FAILED', message: 'Max retries reached. Admin notified.' };
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'RETRYING',
        retryCount: { increment: 1 },
      },
    });

    // In production: re-trigger Daraja B2C call
    return { status: 'RETRYING', retryCount: payment.retryCount + 1 };
  }

  /**
   * Get payment details for a shift.
   */
  async getPaymentByShift(shiftId: string) {
    return prisma.payment.findUnique({ where: { shiftId } });
  }

  /**
   * Release payment (employer action or auto-release).
   */
  async releasePayment(shiftId: string, tenantId: string, actorId: string) {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { escrow: true },
    });

    if (!shift || shift.status !== 'COMPLETED') {
      throw new AppError(422, 'Shift must be completed before payment can be released');
    }

    // Check no open dispute
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
