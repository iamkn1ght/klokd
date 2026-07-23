import crypto from 'crypto';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { railStatusToAppStatus } from './rail-error';
import {
  toKpMinor,
  fromKpMinor,
  type PaymentRailCreateAccountRequest,
  type PaymentRailCreateAccountResponse,
  type PaymentRailWalletResponse,
  type PaymentRailHoldRequest,
  type PaymentRailHoldResponse,
  type PaymentRailHoldActionRequest,
  type PaymentRailPayoutRequest,
  type PaymentRailPayoutResponse,
  type PaymentRailWalletId,
  type PaymentRailAccountUuid,
  type PaymentRailHoldId,
  type PaymentRailPayoutId,
} from './payment-rail.dto';

// Klokd v3 — Payment Rail Client (S3-NEW-03)
// Rail-agnostic by NAME. Phase 1: Kipkiren Pay. Phase 3: LipaStack.
// Per AD-K06, this class is NEVER renamed to KipkirenPayClient — the env var
// PAYMENT_RAIL_API_BASE flips at Phase 3 and the client stays.
//
// Aligned to Kipkiren Pay live wire contract per handover 2026-06-10.
//
// Wire format (per platform-shared/dist/hmac.js verified live for Identiti + Todoku):
//   Authorization: KipkirenPay-HMAC-SHA256 app_id=<id>, signature=<base64>
//   X-KipkirenPay-Timestamp: <RFC 3339>
//   X-Idempotency-Key: <UUIDv4>  (writes)
// Canonical: METHOD\nPATH_AND_QUERY\nCONTENT_TYPE\nTIMESTAMP\nSHA256_HEX(body)
//
// Vocabulary: KP calls escrow "holds" and reverse "refund". DTOs use Klokd's
// semantic names externally; this file maps to wire terms internally.
//
// UNITS: KP carries KES MINOR units (bigint) everywhere. This file converts
// at the boundary. Business logic NEVER sees minor units.

interface RailEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; detail?: unknown; field?: string };
  meta?: { request_id?: string; timestamp?: string };
}

class PaymentRailClient {
  private get baseUrl(): string {
    return config.paymentRail.baseUrl;
  }

  private get appId(): string {
    return config.paymentRail.appId;
  }

  private get appSecret(): string {
    return config.paymentRail.appSecret;
  }

  private assertConfigured(): void {
    if (!this.baseUrl || !this.appId || !this.appSecret) {
      throw new AppError(
        503,
        'RAIL_CONFIG_INCOMPLETE: payment_rail (set PAYMENT_RAIL_API_BASE, PAYMENT_RAIL_APP_ID, PAYMENT_RAIL_APP_SECRET)'
      );
    }
  }

  private sign(method: string, path: string, contentType: string, timestamp: string, body: string): string {
    const bodyHash = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
    const canonical = [method, path, contentType, timestamp, bodyHash].join('\n');
    return crypto.createHmac('sha256', this.appSecret).update(canonical, 'utf8').digest('base64');
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    this.assertConfigured();

    const hasBody = body !== undefined && method !== 'GET';
    const serialized = hasBody ? JSON.stringify(body) : '';
    const contentType = hasBody ? 'application/json; charset=utf-8' : '';
    const timestamp = new Date().toISOString();
    const signature = this.sign(method, path, contentType, timestamp, serialized);

    const headers: Record<string, string> = {
      Authorization: `KipkirenPay-HMAC-SHA256 app_id=${this.appId}, signature=${signature}`,
      'X-KipkirenPay-Timestamp': timestamp,
    };
    if (hasBody) {
      headers['Content-Type'] = contentType;
      headers['X-Idempotency-Key'] = crypto.randomUUID();
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: hasBody ? serialized : undefined,
    });

    const text = await res.text();
    let envelope: RailEnvelope<T> | null = null;
    try { envelope = text.length > 0 ? (JSON.parse(text) as RailEnvelope<T>) : null; } catch { /* opaque */ }

    if (!res.ok) {
      const code = envelope?.error?.code ?? 'unknown';
      const msg = envelope?.error?.message ?? `Payment Rail HTTP ${res.status}`;
      throw new AppError(railStatusToAppStatus(res.status), `Payment Rail ${method} ${path} failed: ${code} — ${msg}`);
    }
    if (!envelope || envelope.ok === false || envelope.data === undefined) {
      throw new AppError(502, `Payment Rail ${method} ${path} returned invalid envelope`);
    }
    return envelope.data;
  }

  // ─── Accounts + wallets ────────────────────────────────
  // POST /v1/accounts combines KP account + wallet creation. Tier is set
  // server-side from Identiti's account.events.TIER_CHANGED Kafka event.

  async createAccount(req: PaymentRailCreateAccountRequest): Promise<PaymentRailCreateAccountResponse> {
    const raw = await this.request<{
      account_uuid: PaymentRailAccountUuid;
      wallet_id: PaymentRailWalletId;
      tier: string;
    }>('POST', '/v1/accounts', {
      account_uuid: req.accountUuid,
    });
    return { accountUuid: raw.account_uuid, walletId: raw.wallet_id, tier: raw.tier };
  }

  async getWallet(accountUuid: PaymentRailAccountUuid): Promise<PaymentRailWalletResponse> {
    const raw = await this.request<{
      wallet_id: PaymentRailWalletId;
      spendable_bal: string;
      reserved_bal: string;
      currency: 'KES';
    }>('GET', `/v1/accounts/${encodeURIComponent(accountUuid)}/wallet`);
    return {
      walletId: raw.wallet_id,
      spendableKes: fromKpMinor(raw.spendable_bal),
      reservedKes: fromKpMinor(raw.reserved_bal),
      currency: raw.currency,
    };
  }

  // ─── Holds (Klokd's "escrow") ─────────────────────────
  // POST /v1/holds — reserve funds from payer.
  // POST /v1/holds/:id/release — settle to payee.
  // POST /v1/holds/:id/refund — return to payer.
  // GET  /v1/holds/:id — pending; request from KP if needed.

  async createHold(req: PaymentRailHoldRequest): Promise<PaymentRailHoldResponse> {
    const raw = await this.request<{
      hold_id: PaymentRailHoldId;
      status: PaymentRailHoldResponse['status'];
      amount_minor: string;
    }>('POST', '/v1/holds', {
      payer_account_uuid: req.payerAccountUuid,
      payee_account_uuid: req.payeeAccountUuid,
      amount_minor: toKpMinor(req.amountKes).toString(),
      purpose: req.purpose,
      idempotency_key: req.idempotencyKey,
    });
    return { holdId: raw.hold_id, status: raw.status, amountKes: fromKpMinor(raw.amount_minor) };
  }

  async releaseHold(req: PaymentRailHoldActionRequest): Promise<{ status: string }> {
    return this.request<{ status: string }>('POST', `/v1/holds/${encodeURIComponent(req.holdId)}/release`, {
      idempotency_key: req.idempotencyKey,
    });
  }

  /** Refund (KP term) maps to Klokd's "reverse escrow". Used for dispute resolution. */
  async refundHold(req: PaymentRailHoldActionRequest): Promise<{ status: string }> {
    return this.request<{ status: string }>('POST', `/v1/holds/${encodeURIComponent(req.holdId)}/refund`, {
      idempotency_key: req.idempotencyKey,
    });
  }

  // ─── Payouts ──────────────────────────────────────────

  async initiatePayout(req: PaymentRailPayoutRequest): Promise<PaymentRailPayoutResponse> {
    const raw = await this.request<{
      payout_id: PaymentRailPayoutId;
      status: PaymentRailPayoutResponse['status'];
      account_uuid: PaymentRailAccountUuid;
      amount_minor: string;
      settled_at?: string;
    }>('POST', '/v1/payouts/initiate', {
      worker_account_uuid: req.workerAccountUuid,
      amount_minor: toKpMinor(req.amountKes).toString(),
      hold_id: req.holdId,
      fee_amount_minor: toKpMinor(req.feeAmountKes).toString(),
      step_up_token: req.stepUpToken,
      idempotency_key: req.idempotencyKey,
    });
    return {
      payoutId: raw.payout_id,
      status: raw.status,
      workerAccountUuid: raw.account_uuid,
      amountKes: fromKpMinor(raw.amount_minor),
      settledAt: raw.settled_at,
    };
  }

  async getPayout(payoutId: PaymentRailPayoutId): Promise<PaymentRailPayoutResponse> {
    const raw = await this.request<{
      payout_id: PaymentRailPayoutId;
      status: PaymentRailPayoutResponse['status'];
      account_uuid: PaymentRailAccountUuid;
      amount_minor: string;
      settled_at?: string;
    }>('GET', `/v1/payouts/${encodeURIComponent(payoutId)}`);
    return {
      payoutId: raw.payout_id,
      status: raw.status,
      workerAccountUuid: raw.account_uuid,
      amountKes: fromKpMinor(raw.amount_minor),
      settledAt: raw.settled_at,
    };
  }
}

export const paymentRailClient = new PaymentRailClient();
