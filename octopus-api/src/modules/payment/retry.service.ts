import prisma from '../../config/database';
import { darajaService } from './daraja.service';

/**
 * Payment Retry Service.
 * Handles failed B2C payments with exponential backoff (3 max retries).
 * Backoff: 1min, 5min, 15min.
 */
export class PaymentRetryService {
  private static readonly BACKOFF_MS = [60_000, 300_000, 900_000]; // 1m, 5m, 15m

  /**
   * Process all payments in RETRYING status that are due for retry.
   */
  async processRetries(): Promise<number> {
    const retriable = await prisma.payment.findMany({
      where: { status: 'RETRYING' },
      include: {
        worker: { select: { mpesaNumberEnc: true } },
      },
    });

    let retried = 0;

    for (const payment of retriable) {
      const backoffMs = PaymentRetryService.BACKOFF_MS[payment.retryCount - 1] || 900_000;
      const retryAfter = new Date(payment.updatedAt.getTime() + backoffMs);

      if (new Date() < retryAfter) continue; // Not yet due

      try {
        // Decrypt M-Pesa number (base64 in MVP)
        const phone = payment.worker.mpesaNumberEnc
          ? Buffer.from(payment.worker.mpesaNumberEnc, 'base64').toString('utf-8')
          : null;

        if (!phone) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' },
          });
          console.error(`[RETRY] No M-Pesa number for payment ${payment.id}`);
          continue;
        }

        const result = await darajaService.b2cPayment({
          phoneNumber: phone,
          amountKes: payment.netKes,
          remarks: `Klokd shift payment retry #${payment.retryCount}`,
          occasion: payment.shiftId,
          resultUrl: `https://api.klokd.co.ke/api/v1/payments/callback/b2c`,
          timeoutUrl: `https://api.klokd.co.ke/api/v1/payments/callback/timeout`,
        });

        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: 'PROCESSING',
            darajaRef: result.conversationId,
          },
        });

        retried++;
        console.log(`[RETRY] Payment ${payment.id} retry #${payment.retryCount} sent`);
      } catch (err) {
        if (payment.retryCount >= 3) {
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' },
          });
          console.error(`[RETRY] Payment ${payment.id} failed permanently after 3 retries`);
        }
      }
    }

    return retried;
  }
}

export const paymentRetryService = new PaymentRetryService();
