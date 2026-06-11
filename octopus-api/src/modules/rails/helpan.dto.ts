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

// ─── Inbound webhook payloads (Helpan → Klokd) ────────────

export type HelpanWebhookTopic =
  | 'helpan.briefing.events'
  | 'helpan.authority.events'
  | 'helpan.action.events';

export interface HelpanBriefingMatchedEvent {
  topic: 'helpan.briefing.events';
  type: 'BRIEFING_MATCHED';
  occurredAt: string;
  data: {
    briefingId: string;
    accountUuid: `acc_${string}`;
    eventId: string;
    confidence: 'low' | 'medium' | 'high';
    detail: {
      matchKind: string;
      briefingType: HelpanBriefingType;
      eventType: string;
      reasons: string[];
      distanceKm?: number;
      shiftId?: string;
      [key: string]: unknown;
    };
  };
}

export interface HelpanAuthorityRevokedEvent {
  topic: 'helpan.authority.events';
  type: 'AUTHORITY_REVOKED';
  occurredAt: string;
  data: {
    authorityId: string;
    accountUuid: `acc_${string}`;
    agentId: string;
    reason: HelpanRevokeReason;
  };
}

export interface HelpanActionCompletedEvent {
  topic: 'helpan.action.events';
  type: 'ACTION_COMPLETED' | 'ACTION_FAILED';
  occurredAt: string;
  data: {
    actionId: string;
    accountUuid: `acc_${string}`;
    agentId: string;
    delegatedAuthorityJti: string;
    targetRail: string;
    targetOperation: string;
    businessOpId: string;
    traceparent: string;
  };
}

export type HelpanWebhookPayload =
  | HelpanBriefingMatchedEvent
  | HelpanAuthorityRevokedEvent
  | HelpanActionCompletedEvent;

// ─── Inbound dispatch (Helpan → Klokd as target rail) ─────
// Per §A.11 — request shape Klokd receives at
// POST /api/v1/agents/dispatch/klokd.write.shift_signup

export interface HelpanInboundDispatchPayload {
  operation: HelpanKlokdScopeId | string;
  accountUuid: `acc_${string}`;
  payload: Record<string, unknown>;
  businessOpId: string;
}
