import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import type {
  PaymentRailWalletRequest,
  PaymentRailWalletResponse,
  PaymentRailBalanceResponse,
  PaymentRailLimitsResponse,
  PaymentRailEscrowFundRequest,
  PaymentRailEscrowFundResponse,
  PaymentRailPayoutRequest,
  PaymentRailPayoutResponse,
  PaymentRailReleaseRequest,
} from './payment-rail.dto';

// Klokd v3 — Payment Rail Client (S3-NEW-03)
// Rail-agnostic by design. Phase 1: Kipkiren Pay sandbox. Phase 3: LipaStack.
// The base URL changes via env var only. This class name must NEVER reference
// a specific rail (no KipkirenPayClient, no LipaStackClient).
//
// AD-K06: PAYMENT_RAIL_BASE_URL must come from env, never hardcoded.
// AD-K07: All responses pass through typed DTOs at this boundary.

class PaymentRailClient {
  private get baseUrl(): string {
    return config.paymentRail.baseUrl;
  }

  private get apiKey(): string {
    return config.paymentRail.apiKey;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.baseUrl || !this.apiKey) {
      throw new AppError(
        503,
        'Payment rail not configured. Set PAYMENT_RAIL_BASE_URL and PAYMENT_RAIL_API_KEY.'
      );
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new AppError(502, `Payment rail ${method} ${path} failed (${res.status}): ${detail}`);
    }

    return res.json() as Promise<T>;
  }

  // ─── Wallets ─────────────────────────────────────────

  async createWallet(req: PaymentRailWalletRequest): Promise<PaymentRailWalletResponse> {
    return this.request<PaymentRailWalletResponse>('POST', '/wallets', {
      account_uuid: req.accountUuid,
      type: req.type,
    });
  }

  async getBalance(walletId: string): Promise<PaymentRailBalanceResponse> {
    return this.request<PaymentRailBalanceResponse>('GET', `/wallets/${walletId}/balance`);
  }

  async getLimits(walletId: string): Promise<PaymentRailLimitsResponse> {
    return this.request<PaymentRailLimitsResponse>('GET', `/wallets/${walletId}/limits`);
  }

  // ─── Escrow ──────────────────────────────────────────

  async fundEscrow(req: PaymentRailEscrowFundRequest): Promise<PaymentRailEscrowFundResponse> {
    return this.request<PaymentRailEscrowFundResponse>('POST', '/escrow/fund', {
      shift_id: req.shiftId,
      employer_account_uuid: req.employerAccountUuid,
      amount_gross_kes: req.amountGrossKes,
      fee_rate: req.feeRate,
      worker_account_uuid: req.workerAccountUuid,
      idempotency_key: req.idempotencyKey,
    });
  }

  async releaseEscrow(req: PaymentRailReleaseRequest): Promise<{ status: string }> {
    return this.request<{ status: string }>('POST', `/escrow/${req.escrowRef}/release`, {
      idempotency_key: req.idempotencyKey,
    });
  }

  // ─── Payouts ─────────────────────────────────────────

  async initiatePayout(req: PaymentRailPayoutRequest): Promise<PaymentRailPayoutResponse> {
    return this.request<PaymentRailPayoutResponse>('POST', '/payouts', {
      worker_account_uuid: req.workerAccountUuid,
      net_amount_kes: req.netAmountKes,
      shift_id: req.shiftId,
      escrow_ref: req.escrowRef,
      fee_amount_kes: req.feeAmountKes,
      step_up_jwt: req.stepUpJwt,
      idempotency_key: req.idempotencyKey,
    });
  }
}

export const paymentRailClient = new PaymentRailClient();
