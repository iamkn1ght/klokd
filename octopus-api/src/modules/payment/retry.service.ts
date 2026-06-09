import prisma from '../../config/database';
import { paymentRailClient } from '../rails';

// Klokd v3 — Payment Retry Service (C4)
// Failures arrive via PAYOUT_FAILED webhook; this loop re-initiates payouts
// for payments stuck in RETRYING status with exponential backoff (1m, 5m, 15m).

export class PaymentRetryService {
  private static readonly BACKOFF_MS = [60_000, 300_000, 900_000];

  async processRetries(): Promise<number> {
    const retriable = await prisma.payment.findMany({
      where: { status: 'RETRYING' },
      include: { shift: { include: { worker: true, escrow: true } } },
    });

    let retried = 0;

    for (const payment of retriable) {
      const backoffMs =
        PaymentRetryService.BACKOFF_MS[payment.retryCount - 1] ?? 900_000;
      const retryAfter = new Date(payment.updatedAt.getTime() + backoffMs);
      if (new Date() < retryAfter) continue;

      const workerAccountUuid = payment.shift.worker?.accountUuid;
      const escrowRef = payment.shift.escrow?.stkPushRef;

      if (!workerAccountUuid || !escrowRef) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });
        console.error(`[RETRY] Missing accountUuid or escrowRef for payment ${payment.id}`);
        continue;
      }

      try {
        const railResp = await paymentRailClient.initiatePayout({
          workerAccountUuid,
          netAmountKes: payment.netKes,
          shiftId: payment.shiftId,
          escrowRef,
          feeAmountKes: payment.platformFeeKes,
          idempotencyKey: `payout-${payment.id}-retry-${payment.retryCount}`,
        });

        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'PROCESSING', paymentRailRef: railResp.paymentId },
        });

        retried++;
        console.log(`[RETRY] Payment ${payment.id} retry #${payment.retryCount} sent`);
      } catch {
        if (payment.retryCount >= 3) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' },
          });
          console.error(`[RETRY] Payment ${payment.id} failed permanently`);
        }
      }
    }

    return retried;
  }
}

export const paymentRetryService = new PaymentRetryService();
