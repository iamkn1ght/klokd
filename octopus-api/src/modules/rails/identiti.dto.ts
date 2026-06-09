// Klokd v3 — Identiti DTOs (AD-K02, AD-K10)
// All identity documents flow to Identiti. Klokd never holds National ID, biometrics,
// raw phone numbers, or KYC document images.

export type KycTier = 0 | 1 | 2;

export interface IdentitiCreateAccountRequest {
  phone: string;
}

export interface IdentitiCreateAccountResponse {
  accountUuid: string;
  status: 'phone_pending' | 'active';
}

export interface IdentitiLookupRequest {
  phoneToken: string;
}

export interface IdentitiLookupResponse {
  accountUuid: string | null;
  found: boolean;
}

export interface IdentitiVerifyOtpRequest {
  accountUuid: string;
  otp: string;
}

export interface IdentitiVerifyOtpResponse {
  accountUuid: string;
  status: 'active';
  kycTier: KycTier;
}

export interface IdentitiKycSubmitRequest {
  accountUuid: string;
  idFront: string;
  idBack: string;
  selfie: string;
}

export interface IdentitiKycSubmitResponse {
  verificationId: string;
  status: 'pending';
}

export interface IdentitiKycSummary {
  accountUuid: string;
  kycTier: KycTier;
  verificationStatus: 'pending' | 'approved' | 'rejected';
  maskedIdLast4?: string;
  verifiedAt?: string;
}

export interface IdentitiPhoneTokenRequest {
  accountUuid: string;
  audience: 'todoku';
}

export interface IdentitiPhoneTokenResponse {
  phoneToken: string;
  expiresAt: string;
}

export interface IdentitiStepUpRequest {
  accountUuid: string;
  operation: 'payout' | 'wallet_topup' | 'profile_change';
  contextRef?: string;
}

export interface IdentitiStepUpInitResponse {
  challengeId: string;
  status: 'pending';
  expiresAt: string;
}

export interface IdentitiStepUpResultResponse {
  challengeId: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  stepUpJwt?: string;
}

export type IdentitiWebhookEvent =
  | 'KYC_TIER_CHANGED'
  | 'SIM_SWAP_DETECTED'
  | 'ACCOUNT_DEACTIVATED';

export interface IdentitiWebhookPayload {
  event: IdentitiWebhookEvent;
  accountUuid: string;
  kycTier?: KycTier;
  verificationStatus?: 'pending' | 'approved' | 'rejected';
  occurredAt: string;
}
