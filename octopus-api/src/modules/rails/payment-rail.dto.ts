// Klokd v3 — Payment Rail DTOs (AD-K06, AD-K07)
// Phase 1: Kipkiren Pay. Phase 3: LipaStack when Kipkiren Pay is transcended.
// Update PAYMENT_RAIL_BASE_URL in env config. This file absorbs any field name changes
// between rails — business logic never sees the raw provider response.

export interface PaymentRailWalletRequest {
  accountUuid: string;
  type: 'worker' | 'employer';
}

export interface PaymentRailWalletResponse {
  walletId: string;
  accountUuid: string;
}

export interface PaymentRailBalanceResponse {
  walletId: string;
  balanceKes: number;
  asOf: string;
}

export interface PaymentRailLimitsResponse {
  walletId: string;
  perTransactionLimitKes: number;
  monthlyAggregateLimitKes: number;
  monthlyAggregateUsedKes: number;
  stepUpRequiredAboveKes: number;
}

export interface PaymentRailEscrowFundRequest {
  shiftId: string;
  employerAccountUuid: string;
  amountGrossKes: number;
  feeRate: number;
  workerAccountUuid: string;
  idempotencyKey: string;
}

export interface PaymentRailEscrowFundResponse {
  escrowRef: string;
  status: 'pending' | 'funded' | 'failed';
}

export interface PaymentRailPayoutRequest {
  workerAccountUuid: string;
  netAmountKes: number;
  shiftId: string;
  escrowRef: string;
  feeAmountKes: number;
  stepUpJwt?: string;
  idempotencyKey: string;
}

export interface PaymentRailPayoutResponse {
  paymentId: string;
  status: 'pending' | 'completed' | 'failed';
  workerAccountUuid: string;
  netAmountKes: number;
  settledAt?: string;
}

export interface PaymentRailReleaseRequest {
  escrowRef: string;
  idempotencyKey: string;
}

export type PaymentRailWebhookEvent =
  | 'ESCROW_FUNDED'
  | 'ESCROW_FUND_FAILED'
  | 'PAYOUT_COMPLETED'
  | 'PAYOUT_FAILED'
  | 'WALLET_CREDITED';

export interface PaymentRailWebhookPayload {
  event: PaymentRailWebhookEvent;
  paymentId?: string;
  escrowRef?: string;
  walletId?: string;
  mpesaRef?: string;
  failureReason?: string;
  settledAt?: string;
}
