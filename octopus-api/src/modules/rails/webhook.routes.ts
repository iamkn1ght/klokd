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
import type { HelpanWebhookPayload } from './helpan.dto';

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
//
// KP rail emits to Kafka today (kp.wallet.events, kp.payout.events,
// kp.hold.events). This HTTP handler activates when KP ships fork-2 (webhook
// signer service) and PAYMENT_RAIL_WEBHOOK_SECRET lands. Until then the route
// returns 503 via the HMAC verify shim if the secret is unset.
//
// Event shapes per KP handover 2026-06-10 (data field; raw envelope wraps it
// with topic/type/key/occurred_at):

router.post(
  '/payment-rail',
  verifyHmac(() => config.paymentRail.webhookSecret),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = getParsed<PaymentRailWebhookPayload>(req);
      switch (payload.type) {
        case 'HOLD_RESERVED': {
          // Klokd's old "ESCROW_FUNDED" — hold is reserved, shift can clock in.
          await prisma.escrow.updateMany({
            where: { stkPushRef: payload.data.holdId },
            data: { status: 'FUNDED', fundedAt: new Date(payload.occurredAt) },
          });
          break;
        }
        case 'HOLD_RELEASED': {
          await prisma.escrow.updateMany({
            where: { stkPushRef: payload.data.holdId },
            data: { status: 'RELEASED', releasedAt: new Date(payload.occurredAt) },
          });
          break;
        }
        case 'HOLD_REFUNDED': {
          await prisma.escrow.updateMany({
            where: { stkPushRef: payload.data.holdId },
            data: { status: 'REFUNDED' },
          });
          break;
        }
        case 'PAYOUT_COMPLETED': {
          await prisma.payment.updateMany({
            where: { paymentRailRef: payload.data.payoutId },
            data: {
              status: 'COMPLETED',
              paidAt: new Date(payload.occurredAt),
              // KP uses mpesa_conversation_id for payouts (vs mpesa_receipt for topups).
              mpesaRef: payload.data.mpesaConversationId,
            },
          });
          break;
        }
        case 'PAYOUT_FAILED': {
          await prisma.payment.updateMany({
            where: { paymentRailRef: payload.data.payoutId },
            data: { status: 'FAILED' },
          });
          await logAudit({
            tenantId: config.defaultTenantId,
            actorId: 'payment-rail',
            action: 'payout.failed',
            resource: 'payment',
            resourceId: payload.data.payoutId,
            metadata: {
              resultCode: payload.data.resultCode,
              failureReason: payload.data.failureReason,
              refunded: payload.data.refunded,
            },
          });
          break;
        }
        case 'WALLET_CREDITED': {
          await logAudit({
            tenantId: config.defaultTenantId,
            actorId: 'payment-rail',
            action: 'wallet.credited',
            resource: 'wallet',
            resourceId: payload.data.walletId,
            metadata: {
              accountUuid: payload.data.accountUuid,
              amountKes: payload.data.amountKes,
              referenceType: payload.data.referenceType,
              mpesaReceipt: payload.data.mpesaReceipt,
              occurredAt: payload.occurredAt,
            },
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

// ─── Helpan AI ───────────────────────────────────────────
// Webhook canonical is UNIQUE — different from request signing:
//   {TIMESTAMP}\n{PATH}\n{SHA256_HEX(body)}
// (no method, no content type). Base64 HMAC.
// Headers: X-Helpan-Webhook-Signature + X-Helpan-Webhook-Timestamp.

function verifyHelpanWebhook(req: Request, _res: Response, next: NextFunction): void {
  const secret = config.helpan.webhookSecret;
  if (!secret) {
    return next(new AppError(503, 'Helpan webhook secret not configured'));
  }

  const signature = req.header('X-Helpan-Webhook-Signature') || '';
  const timestamp = req.header('X-Helpan-Webhook-Timestamp') || '';
  if (!signature || !timestamp) {
    return next(new AppError(401, 'Missing Helpan webhook signature or timestamp'));
  }

  const raw = (req.body as Buffer) ?? Buffer.alloc(0);
  const bodyHash = crypto.createHash('sha256').update(raw).digest('hex');
  const canonical = [timestamp, req.path, bodyHash].join('\n');
  const expected = crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('base64');

  const ok =
    signature.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));

  if (!ok) {
    return next(new AppError(401, 'Invalid Helpan webhook signature'));
  }

  try {
    (req as Request & { parsedBody: unknown }).parsedBody = JSON.parse(raw.toString('utf8'));
  } catch {
    return next(new AppError(400, 'Helpan webhook body is not JSON'));
  }
  next();
}

router.post(
  '/helpan',
  verifyHelpanWebhook,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = getParsed<HelpanWebhookPayload>(req);
      switch (payload.type) {
        case 'BRIEFING_MATCHED': {
          // Worker's standing briefing matched a new shift event. Decide
          // whether to auto-apply via dispatchAction (will be wired through
          // an agent decision module — for now log + persist).
          await logAudit({
            tenantId: config.defaultTenantId,
            actorId: 'helpan-ai',
            action: 'briefing.matched',
            resource: 'briefing',
            resourceId: payload.data.briefingId,
            metadata: {
              accountUuid: payload.data.accountUuid,
              eventId: payload.data.eventId,
              confidence: payload.data.confidence,
              matchKind: payload.data.detail.matchKind,
              shiftId: payload.data.detail.shiftId,
              reasons: payload.data.detail.reasons,
            },
          });
          break;
        }
        case 'AUTHORITY_REVOKED': {
          await prisma.delegatedAuthority.updateMany({
            where: { authorityJti: payload.data.authorityId },
            data: { status: 'REVOKED', revokedAt: new Date(payload.occurredAt) },
          });
          break;
        }
        case 'ACTION_COMPLETED':
        case 'ACTION_FAILED': {
          await prisma.agentAction.updateMany({
            where: { helpanActionId: payload.data.actionId },
            data: {
              status: payload.type === 'ACTION_COMPLETED' ? 'COMPLETED' : 'FAILED',
              completedAt: new Date(payload.occurredAt),
            },
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
