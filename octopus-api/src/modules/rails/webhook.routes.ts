import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import crypto from 'crypto';
import prisma from '../../config/database';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { logAudit } from '../../utils/auditLogger';
import type { IdentitiWebhookPayload } from './identiti.dto';
import type { TodokuWebhookPayload } from './todoku.dto';
import type { PaymentRailWebhookPayload } from './payment-rail.dto';

// Klokd v3 — Rail webhook ingress.
// Signature header is X-Webhook-Signature: hmac-sha256(secret, rawBody) hex.

function verifyHmac(getSecret: () => string) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const secret = getSecret();
    if (!secret) {
      return next(new AppError(503, 'Webhook secret not configured'));
    }

    const signature = req.header('X-Webhook-Signature') || '';
    const raw = (req.body as Buffer) ?? Buffer.alloc(0);
    const expected = crypto.createHmac('sha256', secret).update(raw).digest('hex');

    const ok =
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

    if (!ok) {
      return next(new AppError(401, 'Invalid webhook signature'));
    }

    try {
      (req as Request & { parsedBody: unknown }).parsedBody = JSON.parse(raw.toString('utf8'));
    } catch {
      return next(new AppError(400, 'Webhook body is not JSON'));
    }
    next();
  };
}

function getParsed<T>(req: Request): T {
  return (req as Request & { parsedBody: T }).parsedBody;
}

const router = Router();

router.use(express.raw({ type: '*/*', limit: '1mb' }));

// ─── Identiti ────────────────────────────────────────────

router.post(
  '/identiti',
  verifyHmac(() => config.identiti.webhookSecret),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = getParsed<IdentitiWebhookPayload>(req);
      switch (payload.event) {
        case 'KYC_TIER_CHANGED': {
          if (payload.tier) {
            const tierInt = parseInt(payload.tier.split('_')[1] ?? '0', 10);
            await prisma.worker.updateMany({
              where: { accountUuid: payload.accountUuid },
              data: { kycTier: tierInt },
            });
            await prisma.user.updateMany({
              where: { accountUuid: payload.accountUuid },
              data: { kycTier: tierInt },
            });
          }
          break;
        }
        case 'SIM_SWAP_DETECTED':
        case 'ACCOUNT_DEACTIVATED': {
          await logAudit({
            tenantId: config.defaultTenantId,
            actorId: 'identiti',
            action: `identiti.${payload.event.toLowerCase()}`,
            resource: 'account',
            resourceId: payload.accountUuid,
            metadata: { occurredAt: payload.occurredAt },
          });
          break;
        }
      }
      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Todoku ──────────────────────────────────────────────

router.post(
  '/todoku',
  verifyHmac(() => config.todoku.webhookSecret),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = getParsed<TodokuWebhookPayload>(req);
      await prisma.notificationLog.updateMany({
        where: { todokuMessageId: payload.messageId },
        data: {
          status: payload.event === 'MESSAGE_DELIVERED' ? 'DELIVERED' : 'FAILED',
          deliveredAt: payload.deliveredAt ? new Date(payload.deliveredAt) : null,
          failureReason: payload.failureReason ?? null,
        },
      });
      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  }
);

// ─── Payment Rail (Kipkiren Pay → LipaStack) ─────────────

router.post(
  '/payment-rail',
  verifyHmac(() => config.paymentRail.webhookSecret),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = getParsed<PaymentRailWebhookPayload>(req);
      switch (payload.event) {
        case 'ESCROW_FUNDED': {
          if (payload.escrowRef) {
            await prisma.escrow.updateMany({
              where: { stkPushRef: payload.escrowRef },
              data: { status: 'FUNDED', fundedAt: new Date() },
            });
          }
          break;
        }
        case 'ESCROW_FUND_FAILED': {
          if (payload.escrowRef) {
            await prisma.escrow.updateMany({
              where: { stkPushRef: payload.escrowRef },
              data: { status: 'PENDING' },
            });
          }
          break;
        }
        case 'PAYOUT_COMPLETED': {
          if (payload.paymentId) {
            await prisma.payment.updateMany({
              where: { paymentRailRef: payload.paymentId },
              data: {
                status: 'COMPLETED',
                paidAt: payload.settledAt ? new Date(payload.settledAt) : new Date(),
                mpesaRef: payload.mpesaRef ?? null,
              },
            });
          }
          break;
        }
        case 'PAYOUT_FAILED': {
          if (payload.paymentId) {
            await prisma.payment.updateMany({
              where: { paymentRailRef: payload.paymentId },
              data: { status: 'FAILED' },
            });
          }
          break;
        }
        case 'WALLET_CREDITED': {
          await logAudit({
            tenantId: config.defaultTenantId,
            actorId: 'payment-rail',
            action: 'wallet.credited',
            resource: 'wallet',
            resourceId: payload.walletId ?? 'unknown',
            metadata: { settledAt: payload.settledAt },
          });
          break;
        }
      }
      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
