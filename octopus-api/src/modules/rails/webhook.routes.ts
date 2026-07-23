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
            // Tier 1+ unlocks shift apply — register/refresh in Hakken (S5-NEW-01).
            if (tierInt >= 1) {
              const { hakkenIntegrationService } = await import('../hakken/hakken.service');
              const worker = await prisma.worker.findFirst({
                where: { accountUuid: payload.accountUuid },
              });
              if (worker) void hakkenIntegrationService.upsertWorkerEntity(worker.id);
              const employer = await prisma.employer.findFirst({
                where: { accountUuid: payload.accountUuid },
              });
              if (employer) void hakkenIntegrationService.upsertEmployerEntity(employer.id);
            }
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
// The inbound MATCH webhook canonical is UNIQUE — and it is NOT the request HMAC
// (§20.1's 5-line) nor the earlier assumed 3-line. Per §20.6 (confirmed by Helpan
// 24 Jul), the `webhookDelivery` signer uses a 2-line canonical:
//   {x-helpan-timestamp}\n{SHA256_HEX(rawBody)}      (no method, no path, no CT)
// HMAC-SHA256, HEX-encoded. Headers: `x-helpan-signature: sha256=<hex>` (strip the
// `sha256=` prefix) + `x-helpan-timestamp` — NOT `X-Helpan-Webhook-*`.

function verifyHelpanWebhook(req: Request, _res: Response, next: NextFunction): void {
  const secret = config.helpan.webhookSecret;
  if (!secret) {
    return next(new AppError(503, 'Helpan webhook secret not configured'));
  }

  const sigHeader = req.header('x-helpan-signature') || '';
  const timestamp = req.header('x-helpan-timestamp') || '';
  if (!sigHeader || !timestamp) {
    return next(new AppError(401, 'Missing Helpan webhook signature or timestamp'));
  }
  // Signature header is `sha256=<hex>` — strip the scheme prefix.
  const signature = sigHeader.startsWith('sha256=') ? sigHeader.slice('sha256='.length) : sigHeader;

  const raw = (req.body as Buffer) ?? Buffer.alloc(0);
  const bodyHash = crypto.createHash('sha256').update(raw).digest('hex');
  const canonical = [timestamp, bodyHash].join('\n');
  const expected = crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('hex');

  // Constant-time compare on the decoded HMAC bytes (32 each when both valid hex).
  const sigBuf = Buffer.from(signature, 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  const ok = sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
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
      // §20.6: this webhook delivers only BRIEFING_MATCHED (flat envelope;
      // matcher output nested under `match_detail`, confidence top-level).
      if (payload.event_type === 'BRIEFING_MATCHED') {
        // Worker's standing briefing matched a new shift event. Audit + persist
        // the signal; the auto-apply decision (dispatchAction) is wired through
        // the agent-decision module later. audit_log.actor_id is a FK to
        // users.id, so attribute to the affected worker (resolved from
        // account_uuid) — a literal 'helpan-ai' would FK-violate and 500 the
        // webhook. Ack (no persist) if the account is unknown to Klokd.
        const worker = await prisma.user.findUnique({
          where: { accountUuid: payload.account_uuid },
          select: { id: true, tenantId: true },
        });
        if (worker) {
          await logAudit({
            tenantId: worker.tenantId,
            actorId: worker.id,
            action: 'briefing.matched',
            resource: 'briefing',
            resourceId: payload.briefing_id,
            metadata: {
              accountUuid: payload.account_uuid,
              sourceEventId: payload.source_event_id,
              confidence: payload.match_confidence,
              matchKind: payload.match_detail.match_kind,
              shiftId: payload.match_detail.shift_id,
              reasons: payload.match_detail.reasons,
              traceparent: payload.traceparent,
            },
          });
        } else {
          console.warn(`[HELPAN-WEBHOOK] BRIEFING_MATCHED for account ${payload.account_uuid} unknown to Klokd — acking without audit`);
        }
      } else {
        // Authority/action lifecycle events don't arrive here (they're Kafka
        // stream events, §20.2). Ack anything unexpected without processing.
        console.warn(
          `[HELPAN-WEBHOOK] unexpected event_type "${(payload as { event_type?: string }).event_type}" — the webhook delivers only BRIEFING_MATCHED (§20.6)`
        );
      }
      res.json({ received: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
