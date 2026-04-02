import prisma from '../../config/database';
import { config } from '../../config';
import { paymentService } from './payment.service';

/**
 * Auto-Release Service.
 * Checks for escrows past their auto-release time and triggers disbursement.
 * Runs on a polling interval (in production: cron job or queue consumer).
 */
export class AutoReleaseService {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  /**
   * Process all escrows past their auto-release deadline.
   * Called periodically (every 60s in dev, every 30s in production).
   */
  async processAutoReleases(): Promise<number> {
    const now = new Date();

    const dueEscrows = await prisma.escrow.findMany({
      where: {
        status: 'FUNDED',
        autoReleaseAt: { lte: now },
      },
      include: {
        shift: { select: { id: true, tenantId: true, status: true } },
      },
    });

    let released = 0;

    for (const escrow of dueEscrows) {
      // Only auto-release for COMPLETED shifts (not DISPUTED)
      if (escrow.shift.status !== 'COMPLETED') continue;

      // Check no open dispute
      const dispute = await prisma.dispute.findUnique({
        where: { shiftId: escrow.shiftId },
      });
      if (dispute && dispute.status === 'OPEN') continue;

      try {
        await paymentService.disbursePayment(escrow.shiftId, escrow.shift.tenantId);
        released++;
        console.log(`[AUTO-RELEASE] Released payment for shift ${escrow.shiftId}`);
      } catch (err) {
        console.error(`[AUTO-RELEASE] Failed for shift ${escrow.shiftId}:`, err);
      }
    }

    return released;
  }

  /**
   * Start the auto-release polling loop.
   */
  start(intervalMs = 60_000) {
    if (this.intervalHandle) return;
    console.log(`[AUTO-RELEASE] Started (interval: ${intervalMs / 1000}s)`);
    this.intervalHandle = setInterval(() => this.processAutoReleases(), intervalMs);
  }

  /**
   * Stop the polling loop.
   */
  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log('[AUTO-RELEASE] Stopped');
    }
  }
}

export const autoReleaseService = new AutoReleaseService();
