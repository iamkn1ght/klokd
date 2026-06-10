// Klokd v3 — Payment Rail DTOs (AD-K06, AD-K07)
// Phase 1: Kipkiren Pay. Phase 3: LipaStack when KP is transcended.
// This file is the ONLY place wire-level field names should appear — business
// logic consumes the camelCase types only, so a future LipaStack response
// rename localizes here.
//
// Aligned to Kipkiren Pay live wire contract per handover 2026-06-10.
// Vocabulary:
//   "hold"   = Klokd's "escrow"
//   "refund" = Klokd's "reverse"
// Units: KES MINOR (×100) everywhere. Never expose to business logic.

import type { IdentitiAccountUuid } from './identiti.dto';

export type PaymentRailAccountUuid = IdentitiAccountUuid; // shared spine
export type PaymentRailWalletId = string;
export type PaymentRailHoldId = string;
export type PaymentRailPayoutId = string;

// ─── Boundary helpers — KES whole units ↔ KES minor units (bigint) ─

export const toKpMinor = (kes: number): bigint => BigInt(Math.round(kes * 100));
export const fromKpMinor = (minor: string | bigint | number): number => {
  const big = typeof minor === 'bigint' ? minor : BigInt(minor);
  return Number(big) / 100;
};

// ─── Accounts + wallets ──────────────────────────────────

export interface PaymentRailCreateAccountRequest {
  accountUuid: PaymentRailAccountUuid;
}

export interface PaymentRailCreateAccountResponse {
  accountUuid: PaymentRailAccountUuid;
  walletId: PaymentRailWalletId;
  tier: string; // 'tier_0' | 'tier_1' | ... (Identiti tier propagates via Kafka)
}

export interface PaymentRailWalletResponse {
  walletId: PaymentRailWalletId;
  spendableKes: number; // converted from spendable_minor
  reservedKes: number;
  currency: 'KES';
}

// ─── Holds (Klokd "escrow") ──────────────────────────────

export interface PaymentRailHoldRequest {
  payerAccountUuid: PaymentRailAccountUuid;
  payeeAccountUuid: PaymentRailAccountUuid;
  amountKes: number;
  purpose: string; // e.g. 'klokd_shift_escrow_<shift_id>'
  idempotencyKey: string;
}

export interface PaymentRailHoldResponse {
  holdId: PaymentRailHoldId;
  status: 'reserved' | 'released' | 'refunded' | 'pending';
  amountKes: number;
}

export interface PaymentRailHoldActionRequest {
  holdId: PaymentRailHoldId;
  idempotencyKey: string;
}

// ─── Payouts ─────────────────────────────────────────────

export interface PaymentRailPayoutRequest {
  workerAccountUuid: PaymentRailAccountUuid;
  amountKes: number;
  holdId: PaymentRailHoldId; // released hold backing the payout
  feeAmountKes: number;
  stepUpToken?: string; // Identiti-issued RS256 JWT for high-value payouts
  idempotencyKey: string;
}

export interface PaymentRailPayoutResponse {
  payoutId: PaymentRailPayoutId;
  status: 'pending' | 'completed' | 'failed';
  workerAccountUuid: PaymentRailAccountUuid;
  amountKes: number;
  settledAt?: string;
}

// ─── Step-up policy (KP-side; KES whole units in this file) ─

export const PAYOUT_STEP_UP_THRESHOLD_KES = 10_000; // KP rail contract §12.2

// ─── Webhook payloads (incoming HTTP fork-2, or Kafka data field for fork-1) ─

export type PaymentRailWebhookEvent =
  | 'WALLET_CREDITED'
  | 'PAYOUT_COMPLETED'
  | 'PAYOUT_FAILED'
  | 'HOLD_RESERVED'
  | 'HOLD_RELEASED'
  | 'HOLD_REFUNDED';

interface BaseEnvelope {
  topic: string;
  type: PaymentRailWebhookEvent;
  key: string;
  occurredAt: string;
}

export interface PaymentRailWalletCreditedEvent extends BaseEnvelope {
  type: 'WALLET_CREDITED';
  data: {
    accountUuid: PaymentRailAccountUuid;
    walletId: PaymentRailWalletId;
    amountKes: number;
    newSpendableKes: number;
    referenceType: 'topup' | 'payout_refund' | 'hold_release';
    referenceId: string;
    mpesaReceipt?: string; // present on topup
  };
}

export interface PaymentRailPayoutCompletedEvent extends BaseEnvelope {
  type: 'PAYOUT_COMPLETED';
  data: {
    payoutId: PaymentRailPayoutId;
    accountUuid: PaymentRailAccountUuid;
    amountKes: number;
    outcome: 'completed';
    mpesaConversationId: string; // Daraja B2C conversation ID
    refunded: boolean;
  };
}

export interface PaymentRailPayoutFailedEvent extends BaseEnvelope {
  type: 'PAYOUT_FAILED';
  data: {
    payoutId: PaymentRailPayoutId;
    accountUuid: PaymentRailAccountUuid;
    amountKes: number;
    outcome: 'failed';
    resultCode: number;
    failureReason: string;
    refunded: boolean;
  };
}

export interface PaymentRailHoldReservedEvent extends BaseEnvelope {
  type: 'HOLD_RESERVED';
  data: {
    holdId: PaymentRailHoldId;
    payerAccountUuid: PaymentRailAccountUuid;
    payeeAccountUuid: PaymentRailAccountUuid;
    amountKes: number;
    purpose: string;
  };
}

export interface PaymentRailHoldReleasedEvent extends BaseEnvelope {
  type: 'HOLD_RELEASED' | 'HOLD_REFUNDED';
  data: {
    holdId: PaymentRailHoldId;
    amountKes: number;
  };
}

export type PaymentRailWebhookPayload =
  | PaymentRailWalletCreditedEvent
  | PaymentRailPayoutCompletedEvent
  | PaymentRailPayoutFailedEvent
  | PaymentRailHoldReservedEvent
  | PaymentRailHoldReleasedEvent;
