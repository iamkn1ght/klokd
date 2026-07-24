import crypto from 'crypto';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { railStatusToAppStatus } from './rail-error';
import { identityRailClient } from './identiti.client';
import type { IdentitiAccountUuid } from './identiti.dto';
import {
  HELPAN_KLOKD_AGENT_ID,
  type HelpanIssueAuthorityRequest,
  type HelpanIssueAuthorityResponse,
  type HelpanValidateAuthorityRequest,
  type HelpanValidateAuthorityResponse,
  type HelpanRevokeAuthorityRequest,
  type HelpanDispatchActionRequest,
  type HelpanDispatchActionResponse,
  type HelpanCreateBriefingRequest,
  type HelpanBriefingResponse,
  type HelpanBriefingType,
  type HelpanIngestEventRequest,
  type HelpanIngestEventResponse,
  type HelpanAuthorityRejection,
} from './helpan.dto';

// Klokd v3 — Helpan AI rail client
// Aligned to KMV_RAILS_INTEGRATION_GUIDE.md §7 (Helpan AI, LIVE).
//
// Wire format:
//   Authorization: Helpan-HMAC-SHA256 app_id=<id>, signature=<base64>
//   x-helpan-timestamp: <RFC 3339>
//   X-Idempotency-Key: <UUIDv4>  (writes except /validate)
//   X-Delegated-Authority: <RS256 JWT>  (dispatch only)
//   Traceparent: 00-<32 hex>-<16 hex>-<2 hex>  (W3C; auto-generated if absent)
//
// Canonical (same as other rails):
//   METHOD\nPATH_AND_QUERY\nCONTENT_TYPE\nTIMESTAMP\nSHA256_HEX(body)
//
// app_id is LITERAL 'klokd' (NOT klokd_sandbox). Helpan keys on app slug.

interface HelpanEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; detail?: unknown; field?: string };
  meta?: { request_id?: string; timestamp?: string };
}

function generateTraceparent(): string {
  const traceId = crypto.randomBytes(16).toString('hex');
  const spanId = crypto.randomBytes(8).toString('hex');
  return `00-${traceId}-${spanId}-01`;
}

class HelpanRailClient {
  private get baseUrl(): string {
    return config.helpan.baseUrl;
  }

  private get appId(): string {
    return config.helpan.appId;
  }

  private get appSecret(): string {
    return config.helpan.appSecret;
  }

  private assertConfigured(): void {
    if (!this.baseUrl || !this.appId || !this.appSecret) {
      throw new AppError(
        503,
        'RAIL_CONFIG_INCOMPLETE: helpan (set HELPAN_API_BASE, HELPAN_APP_ID, HELPAN_APP_SECRET)'
      );
    }
  }

  private sign(method: string, path: string, contentType: string, timestamp: string, body: string): string {
    const bodyHash = crypto.createHash('sha256').update(body, 'utf8').digest('hex');
    const canonical = [method, path, contentType, timestamp, bodyHash].join('\n');
    return crypto.createHmac('sha256', this.appSecret).update(canonical, 'utf8').digest('base64');
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>
  ): Promise<T> {
    this.assertConfigured();

    const hasBody = body !== undefined && method !== 'GET';
    const serialized = hasBody ? JSON.stringify(body) : '';
    const contentType = hasBody ? 'application/json; charset=utf-8' : '';
    const timestamp = new Date().toISOString();
    const signature = this.sign(method, path, contentType, timestamp, serialized);

    const headers: Record<string, string> = {
      Authorization: `Helpan-HMAC-SHA256 app_id=${this.appId}, signature=${signature}`,
      'x-helpan-timestamp': timestamp,
      Traceparent: generateTraceparent(),
      ...(extraHeaders ?? {}),
    };
    if (hasBody) {
      headers['Content-Type'] = contentType;
      // /validate exempted from idempotency per §7.3.
      if (!path.endsWith('/validate')) {
        headers['X-Idempotency-Key'] = crypto.randomUUID();
      }
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: hasBody ? serialized : undefined,
    });

    const text = await res.text();
    let envelope: HelpanEnvelope<T> | null = null;
    try { envelope = text.length > 0 ? (JSON.parse(text) as HelpanEnvelope<T>) : null; } catch { /* opaque */ }

    if (!res.ok) {
      const code = envelope?.error?.code ?? 'unknown';
      const msg = envelope?.error?.message ?? `Helpan HTTP ${res.status}`;
      throw new AppError(railStatusToAppStatus(res.status), `Helpan ${method} ${path} failed: ${code} — ${msg}`);
    }
    if (!envelope || envelope.ok === false || envelope.data === undefined) {
      throw new AppError(502, `Helpan ${method} ${path} returned invalid envelope`);
    }
    return envelope.data;
  }

  // ─── Authorities ──────────────────────────────────────

  /** Issue a delegated authority for an agent. Capture .token immediately — never returned again. */
  async issueAuthority(req: HelpanIssueAuthorityRequest): Promise<HelpanIssueAuthorityResponse> {
    const raw = await this.request<{
      id: string;
      account_uuid: HelpanIssueAuthorityResponse['accountUuid'];
      agent_id: string;
      scopes: Array<{
        scope_id: string;
        amount_limit_minor?: number;
        per_period_limit_minor?: number;
        period?: 'daily' | 'weekly' | 'monthly';
      }>;
      status: HelpanIssueAuthorityResponse['status'];
      token: string;
      expires_at: string;
      created_at: string;
    }>('POST', '/v1/authorities', {
      account_uuid: req.accountUuid,
      agent_id: req.agentId,
      scopes: req.scopes.map(s => ({
        scope_id: s.scopeId,
        amount_limit_minor: s.amountLimitMinor,
        per_period_limit_minor: s.perPeriodLimitMinor,
        period: s.period,
      })),
      ttl_seconds: req.ttlSeconds,
      step_up_token: req.stepUpToken,
    });
    return {
      id: raw.id,
      accountUuid: raw.account_uuid,
      agentId: raw.agent_id,
      scopes: raw.scopes.map(s => ({
        scopeId: s.scope_id,
        amountLimitMinor: s.amount_limit_minor,
        perPeriodLimitMinor: s.per_period_limit_minor,
        period: s.period,
      })),
      status: raw.status,
      token: raw.token,
      expiresAt: raw.expires_at,
      createdAt: raw.created_at,
    };
  }

  /**
   * Validate a delegated authority JWT. Called by relying rails (this method is
   * used by Klokd-as-target-rail when receiving forwarded dispatches per §A.11).
   * Always returns 200 for known JTI; .valid carries the answer.
   */
  async validateAuthority(jti: string, req: HelpanValidateAuthorityRequest): Promise<HelpanValidateAuthorityResponse> {
    const raw = await this.request<{
      valid: boolean;
      status: HelpanValidateAuthorityResponse['status'];
      scope_covers: boolean;
      within_limits: boolean;
      authority: {
        id: string;
        account_uuid: HelpanValidateAuthorityResponse['authority']['accountUuid'];
        agent_id: string;
        scopes: Array<{
          scope_id: string;
          amount_limit_minor?: number;
          per_period_limit_minor?: number;
          period?: 'daily' | 'weekly' | 'monthly';
        }>;
      };
      rejection_reason: HelpanAuthorityRejection | null;
    }>('POST', `/v1/authorities/${encodeURIComponent(jti)}/validate`, {
      token: req.token,
      intended_operation: req.intendedOperation,
      amount_minor: req.amountMinor,
    });
    return {
      valid: raw.valid,
      status: raw.status,
      scopeCovers: raw.scope_covers,
      withinLimits: raw.within_limits,
      authority: {
        id: raw.authority.id,
        accountUuid: raw.authority.account_uuid,
        agentId: raw.authority.agent_id,
        scopes: raw.authority.scopes.map(s => ({
          scopeId: s.scope_id,
          amountLimitMinor: s.amount_limit_minor,
          perPeriodLimitMinor: s.per_period_limit_minor,
          period: s.period,
        })),
      },
      rejectionReason: raw.rejection_reason,
    };
  }

  async revokeAuthority(jti: string, req: HelpanRevokeAuthorityRequest): Promise<{ status: string }> {
    return this.request<{ status: string }>('POST', `/v1/authorities/${encodeURIComponent(jti)}/revoke`, {
      reason: req.reason,
      detail: req.detail,
    });
  }

  // ─── Action dispatch ──────────────────────────────────

  async dispatchAction(req: HelpanDispatchActionRequest): Promise<HelpanDispatchActionResponse> {
    const traceparent = req.traceparent ?? generateTraceparent();
    const businessOpId = req.businessOpId ?? `boi_${crypto.randomUUID()}`;

    const raw = await this.request<{
      id: string;
      status: HelpanDispatchActionResponse['status'];
      agent_id: string;
      delegated_authority_jti: string;
      target_rail: string;
      target_operation: string;
      result?: Record<string, unknown>;
      error_code?: string;
      business_op_id: string;
      traceparent: string;
      created_at: string;
      completed_at?: string;
    }>(
      'POST',
      '/v1/actions/dispatch',
      {
        account_uuid: req.accountUuid,
        target_rail: req.targetRail,
        target_operation: req.targetOperation,
        payload: req.payload,
        initiated_by: req.initiatedBy ?? 'agent',
        amount_minor: req.amountMinor,
        business_op_id: businessOpId,
      },
      {
        'X-Delegated-Authority': req.delegatedAuthorityJwt,
        Traceparent: traceparent,
        'X-Business-Op-Id': businessOpId,
      }
    );

    return {
      id: raw.id,
      status: raw.status,
      agentId: raw.agent_id,
      delegatedAuthorityJti: raw.delegated_authority_jti,
      targetRail: raw.target_rail,
      targetOperation: raw.target_operation,
      result: raw.result,
      errorCode: raw.error_code,
      businessOpId: raw.business_op_id,
      traceparent: raw.traceparent,
      createdAt: raw.created_at,
      completedAt: raw.completed_at,
    };
  }

  // ─── Briefings + events ingest ───────────────────────

  async createBriefing(
    customerJwt: string,
    req: HelpanCreateBriefingRequest
  ): Promise<HelpanBriefingResponse> {
    // Briefings use BearerCustomer auth, not HMAC. Custom path bypasses sign().
    this.assertConfigured();
    const res = await fetch(`${this.baseUrl}/v1/briefings`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${customerJwt}`,
        'X-App-Id': this.appId,
        'Content-Type': 'application/json; charset=utf-8',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        briefing_type: req.briefingType,
        intent: req.intent,
        expires_at: req.expiresAt,
        app_correlation_id: req.appCorrelationId,
      }),
    });
    const text = await res.text();
    const envelope = text.length > 0 ? (JSON.parse(text) as HelpanEnvelope<HelpanBriefingResponse & { account_uuid: HelpanBriefingResponse['accountUuid']; briefing_type: HelpanBriefingType; created_at: string; expires_at: string }>) : null;
    if (!res.ok || !envelope?.data) {
      throw new AppError(502, `Helpan POST /v1/briefings failed: ${envelope?.error?.code ?? res.status}`);
    }
    const d = envelope.data;
    return {
      id: d.id,
      accountUuid: d.account_uuid,
      briefingType: d.briefing_type,
      intent: d.intent,
      status: d.status,
      createdAt: d.created_at,
      expiresAt: d.expires_at,
    };
  }

  async ingestEvent(req: HelpanIngestEventRequest): Promise<HelpanIngestEventResponse> {
    const raw = await this.request<{
      event_id: string;
      accepted_at: string;
      matched_briefings: string[];
    }>('POST', '/v1/events/ingest', {
      event_type: req.eventType,
      app_id: req.appId,
      account_uuid: req.accountUuid,
      payload: req.payload,
      published_at: req.publishedAt,
      app_correlation_id: req.appCorrelationId,
    });
    return {
      eventId: raw.event_id,
      acceptedAt: raw.accepted_at,
      matchedBriefings: raw.matched_briefings,
    };
  }
}

export const helpanRailClient = new HelpanRailClient();
export { HELPAN_KLOKD_AGENT_ID };

// ─── Helpan customer JWT (for /v1/briefings + Console) ────
//
// Briefings + the Console are customer-JWT-only (§20.11). The token is an
// Identiti-minted RS256 JWT scoped to Helpan's audience — session-shaped
// (scope/tier/session_kind/jti), which Helpan's customer-JWT verifier requires
// (401 AUTH_JWT_INVALID without them). Minted server-side via Identiti 0.1.4's
// audience-aware POST /v1/customers/{uuid}/tokens and cached per account_uuid to
// ~80% of TTL. Mirrors getHakkenJwt. Needs the operator-granted
// `identiti:token:issue` scope (already held — the Hakken grant covers all
// whitelisted audiences) + `https://api.helpan.co.ke` on Identiti's whitelist.
interface CachedHelpanJwt {
  token: string;
  refreshAt: number;
}
const helpanJwtCache = new Map<string, CachedHelpanJwt>();

export async function getHelpanCustomerJwt(accountUuid: IdentitiAccountUuid): Promise<string> {
  const cached = helpanJwtCache.get(accountUuid);
  if (cached && Date.now() < cached.refreshAt) return cached.token;

  const res = await identityRailClient.issueCustomerJwt(accountUuid, {
    audience: config.helpan.jwtAudience,
    ttlSeconds: config.helpan.jwtTtlSeconds,
  });
  const lifetimeMs = Math.max(0, new Date(res.expiresAt).getTime() - Date.now());
  helpanJwtCache.set(accountUuid, {
    token: res.token,
    refreshAt: Date.now() + Math.floor(lifetimeMs * 0.8),
  });
  return res.token;
}
