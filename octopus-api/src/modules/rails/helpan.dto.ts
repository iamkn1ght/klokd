// Klokd v3 — Helpan AI rail DTOs
// Aligned to KMV_RAILS_INTEGRATION_GUIDE.md §7 (Helpan AI, LIVE on Railway).
//
// Klokd has TWO roles vs Helpan:
//   1. Consuming app: hosts helpan-klokd-v1 agent; issues authorities,
//      dispatches actions, ingests shift events.
//   2. Target rail: receives forwarded dispatches at
//      POST /api/v1/agents/dispatch/klokd.write.shift_signup
//      Validates via Helpan /v1/authorities/{jti}/validate per §A.11.
//
// Agent ID is STABLE kebab-case: 'helpan-klokd-v1' (NOT agt_<ULID>).
// App ID for HMAC is LITERAL 'klokd' (NOT klokd_sandbox — Helpan keys on the
// actual app slug; every other rail uses _sandbox suffix).

export const HELPAN_KLOKD_AGENT_ID = 'helpan-klokd-v1' as const;

// ─── Catalogue scope IDs (must EXACTLY match target_operation) ─

export const HELPAN_KLOKD_SCOPES = {
  SHIFT_PAY: 'klokd.write.shift_pay', // write_money, per-call 200_000, monthly 5_000_000, TTL 3600
  SHIFT_SIGNUP: 'klokd.write.shift_signup', // admin, app-side count, TTL 86400
  WORKER_REPUTATION: 'klokd.read.worker_reputation', // read_aggregate, TTL 86400
} as const;

export type HelpanKlokdScopeId = (typeof HELPAN_KLOKD_SCOPES)[keyof typeof HELPAN_KLOKD_SCOPES];

// ─── Authority lifecycle ──────────────────────────────────

export interface HelpanAuthorityScope {
  scopeId: HelpanKlokdScopeId | string;
  amountLimitMinor?: number;
  perPeriodLimitMinor?: number;
  period?: 'daily' | 'weekly' | 'monthly';
}

export interface HelpanIssueAuthorityRequest {
  accountUuid: `acc_${string}`;
  agentId: string; // e.g. HELPAN_KLOKD_AGENT_ID
  scopes: HelpanAuthorityScope[];
  ttlSeconds: number;
  /** RS256 step-up JWT for high-stakes scopes (default_grantable=false). */
  stepUpToken?: string;
}

export interface HelpanIssueAuthorityResponse {
  id: string; // daa_<ULID>
  accountUuid: `acc_${string}`;
  agentId: string;
  scopes: HelpanAuthorityScope[];
  status: 'active' | 'revoked' | 'expired';
  /** RS256 JWT — capture on 201; NEVER returned on GET reads. */
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface HelpanValidateAuthorityRequest {
  /** The X-Delegated-Authority JWT received by the relying rail. */
  token: string;
  /** Must equal authority's scope_id exactly. */
  intendedOperation: HelpanKlokdScopeId | string;
  /** Optional; enforces per-call + per-period ceilings when present. */
  amountMinor?: number;
}

export type HelpanAuthorityRejection =
  | 'token_invalid_signature'
  | 'token_expired'
  | 'token_revoked'
  | 'scope_not_covered'
  | 'amount_exceeds_limit'
  | 'period_limit_exhausted'
  | 'account_suspended';

export interface HelpanValidateAuthorityResponse {
  valid: boolean;
  status: 'active' | 'revoked' | 'expired';
  scopeCovers: boolean;
  withinLimits: boolean;
  authority: {
    id: string;
    accountUuid: `acc_${string}`;
    agentId: string;
    scopes: HelpanAuthorityScope[];
  };
  rejectionReason: HelpanAuthorityRejection | null;
}

export type HelpanRevokeReason =
  | 'user_initiated'
  | 'operator_initiated'
  | 'account_suspended'
  | 'kyc_downgraded'
  | 'cascade_user_deleted'
  | 'cascade_consent_revoked'
  | 'security_incident'
  | 'other';

export interface HelpanRevokeAuthorityRequest {
  reason: HelpanRevokeReason;
  detail?: string;
}

// ─── Action dispatch ──────────────────────────────────────

export interface HelpanDispatchActionRequest {
  delegatedAuthorityJwt: string; // header X-Delegated-Authority
  accountUuid: `acc_${string}`;
  targetRail: 'kipkiren_pay' | 'identiti' | 'todoku' | 'klokd';
  targetOperation: HelpanKlokdScopeId | string;
  /** Opaque to Helpan; forwarded to target rail. */
  payload: Record<string, unknown>;
  initiatedBy?: 'agent' | 'human';
  amountMinor?: number;
  /** Cross-rail audit join key; auto-generated if absent. */
  businessOpId?: string;
  /** W3C trace context; auto-generated if absent. */
  traceparent?: string;
}

export interface HelpanDispatchActionResponse {
  id: string; // act_<ULID>
  status: 'completed' | 'failed';
  agentId: string;
  delegatedAuthorityJti: string;
  targetRail: string;
  targetOperation: string;
  /** Target-rail-returned data (success) or null (failure). */
  result?: Record<string, unknown>;
  errorCode?: string;
  businessOpId: string;
  traceparent: string;
  createdAt: string;
  completedAt?: string;
}

// ─── Briefings + matchers ─────────────────────────────────

export type HelpanBriefingType = 'alert' | 'standing_basket' | 'scheduled_action' | 'threshold_watch';

/** Klokd's pre-registered matcher (§7.8). */
export interface HelpanKlokdShiftSearchIntent {
  domain: 'klokd.shift_search';
  categories: string[];
  maxDistanceKm: number;
  origin: { lat: number; lng: number };
  timeWindow: { start: string; end: string; tz: string };
  minPayMinor: number;
}

export interface HelpanCreateBriefingRequest {
  briefingType: HelpanBriefingType;
  intent: HelpanKlokdShiftSearchIntent | Record<string, unknown>;
  expiresAt: string;
  appCorrelationId?: string;
}

export interface HelpanBriefingResponse {
  id: string; // brf_<ULID>
  accountUuid: `acc_${string}`;
  briefingType: HelpanBriefingType;
  intent: Record<string, unknown>;
  status: 'active' | 'expired' | 'revoked';
  createdAt: string;
  expiresAt: string;
}

// ─── Events ingest ────────────────────────────────────────

export interface HelpanIngestEventRequest {
  eventType: string; // e.g. 'klokd.shift_offer'
  appId: 'klokd';
  accountUuid?: `acc_${string}` | null;
  payload: Record<string, unknown>;
  publishedAt: string;
  appCorrelationId?: string;
}

export interface HelpanIngestEventResponse {
  eventId: string;
  acceptedAt: string;
  matchedBriefings: string[];
}

// ─── Inbound match webhook (Helpan → Klokd) — §20.6 ───────
//
// The HTTP webhook at POST /api/v1/webhooks/rails/helpan delivers EXACTLY ONE
// event: BRIEFING_MATCHED (confirmed by Helpan 24 Jul). Its body is a flat
// ENVELOPE — the matcher output is nested under `match_detail`, and the
// confidence is a TOP-LEVEL `match_confidence` (NOT `detail.confidence`). Field
// names are snake_case; the discriminator is `event_type` (NOT `type`).
//
// Authority-revocation and action-lifecycle events (AUTHORITY_REVOKED, ACTION_*)
// do NOT arrive on this webhook — they propagate via Helpan's Kafka authority /
// action event streams (§20.2, 5s SLA). A stream consumer is pending Kafka
// wiring (Helpan gap #7); until then Klokd reconciles those via its own flows.
export interface HelpanBriefingMatchedWebhook {
  event_id: string;
  event_type: 'BRIEFING_MATCHED';
  schema_version: string;
  occurred_at: string;
  account_uuid: `acc_${string}`;
  app_id: string;
  briefing_id: string;
  source_event_id: string;
  match_confidence: 'low' | 'medium' | 'high';
  match_detail: {
    match_kind: string;
    briefing_type: HelpanBriefingType;
    event_type: string;
    reasons: string[];
    distance_km?: number;
    shift_id?: string;
    [key: string]: unknown;
  };
  traceparent?: string;
}

export type HelpanWebhookPayload = HelpanBriefingMatchedWebhook;

// ─── Inbound dispatch (Helpan → Klokd as target rail) ─────
// Per §A.11 — request shape Klokd receives at
// POST /api/v1/agents/dispatch/klokd.write.shift_signup

export interface HelpanInboundDispatchPayload {
  operation: HelpanKlokdScopeId | string;
  accountUuid: `acc_${string}`;
  payload: Record<string, unknown>;
  businessOpId: string;
}
