// Klokd v3 — Identiti DTOs (AD-K02, AD-K10)
// Mirrors the LIVE Identiti rail contract discovered against
// https://identiti-production.up.railway.app on 2026-06-09.
//
// Wire format facts:
// - Auth signature is BASE64 (the operator pack §4 + LD client both say hex
//   but the production rail at vendor/platform-shared/dist/hmac.js uses base64).
// - All endpoints under /v1/* prefix.
// - Customer create requires name_first + name_last + app_correlation + consent;
//   consent.captured_via ∈ {app_onboarding, operator_console, self_service_portal}.
// - Responses wrap in {ok, data, meta}; clients unwrap to data.

export type IdentitiAccountUuid = `acc_${string}`;
export type IdentitiTier = 'tier_0' | 'tier_1' | 'tier_2' | 'tier_3';
export type IdentitiCustomerState = 'pending_onboarding' | 'active' | 'suspended';

export type IdentitiConsentChannel = 'app_onboarding' | 'operator_console' | 'self_service_portal';

export interface IdentitiConsent {
  dpa_consent: boolean;
  kyc_consent: boolean;
  marketing_consent: boolean;
  captured_at: string;
  captured_via: IdentitiConsentChannel;
}

export interface IdentitiCreateCustomerRequest {
  phone: string;
  nameFirst: string;
  nameLast: string;
  appCorrelation: string;
  consent: IdentitiConsent;
}

export interface IdentitiCreateCustomerResponse {
  accountUuid: IdentitiAccountUuid;
  state: IdentitiCustomerState;
  tier: IdentitiTier;
  createdAt: string;
}

export interface IdentitiTierResponse {
  tier: IdentitiTier;
  assignedAt: string;
  reason: string;
}

export interface IdentitiPhoneTokenRequest {
  accountUuid: IdentitiAccountUuid;
  audience: 'todoku';
  ttlSeconds?: number;
}

export interface IdentitiPhoneTokenResponse {
  phoneToken: string;
  jti: string;
  audience: 'todoku';
  expiresAt: string;
}

// ─── KYC (IPRS) ──────────────────────────────────────────
//
// Identiti KYC is an IPRS data lookup against the national register — it is NOT
// an image/document upload. Klokd sends typed fields only; no National ID image
// ever leaves the device or touches Klokd storage (AD-K02).
//
// Contract verified against Identiti `src/schemas/kyc.ts` (0.1.2, 22 Jul 2026):
// additionalProperties: false, all four fields required.

export interface IdentitiIprsKycRequest {
  /** 7-9 digits, no letters or spaces (rail regex ^[0-9]{7,9}$). */
  nationalId: string;
  nameFirst: string;
  nameLast: string;
  /** YYYY-MM-DD. A full date-time (…T00:00:00Z) is rejected by the rail. */
  dateOfBirth: string;
}

export type IdentitiKycArtefactState =
  | 'pending'
  | 'verified'
  | 'failed'
  | 'expired'
  | 'revoked';

export interface IdentitiIprsKycResponse {
  artefactId: string;
  state: IdentitiKycArtefactState;
  iprsSummary?: {
    match: 'full_match' | 'partial_match' | 'no_match';
    confidenceBand: 'high' | 'medium' | 'low';
    verifiedAt?: string;
    expiresAt?: string;
  };
  /** Present only when this verification unlocked a tier promotion. */
  tierPromotedTo?: IdentitiTier;
}

export type IdentitiStepUpFactor = 'phone_otp' | 'webauthn' | 'biometric';
export type IdentitiStepUpRiskTier = 'low' | 'medium' | 'high';

// Operation kinds are an Identiti-side ENUM registered per-app. As of 2026-06-09
// only kipkiren_pay.* kinds were registered for klokd_sandbox; klokd.* kinds
// pending registration request to Silvia.
export type IdentitiOperationKind = string;

export interface IdentitiStepUpChallengeRequest {
  accountUuid: IdentitiAccountUuid;
  operationAudience: string;
  operationKind: IdentitiOperationKind;
  operationRiskTier: IdentitiStepUpRiskTier;
  factor: IdentitiStepUpFactor;
}

export interface IdentitiStepUpChallengeResponse {
  challengeId: string;
  factor: IdentitiStepUpFactor;
  expiresAt: string;
  deliveryStatus: string;
  // Sandbox only — production strips both.
  otpPlaintext?: string;
  sandboxOnly?: boolean;
}

export interface IdentitiStepUpVerifyRequest {
  challengeId: string;
  response: string;
}

export interface IdentitiStepUpVerifyResponse {
  stepupToken: string;
  expiresIn: number;
}

// Webhook events — Identiti emits via Kafka today; HTTP webhook signing ships
// in ID-14 Phase 2. Klokd's webhook handler is built but inert until then.
export type IdentitiWebhookEvent =
  | 'KYC_TIER_CHANGED'
  | 'SIM_SWAP_DETECTED'
  | 'ACCOUNT_DEACTIVATED';

export interface IdentitiWebhookPayload {
  event: IdentitiWebhookEvent;
  accountUuid: IdentitiAccountUuid;
  tier?: IdentitiTier;
  occurredAt: string;
}
