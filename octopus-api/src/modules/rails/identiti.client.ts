import crypto from 'crypto';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { railStatusToAppStatus } from './rail-error';
import type {
  IdentitiCreateCustomerRequest,
  IdentitiCreateCustomerResponse,
  IdentitiTierResponse,
  IdentitiIprsKycRequest,
  IdentitiIprsKycResponse,
  IdentitiKycArtefactState,
  IdentitiActivateResponse,
  IdentitiCustomerState,
  IdentitiTier,
  IdentitiPhoneTokenRequest,
  IdentitiPhoneTokenResponse,
  IdentitiAudienceTokenRequest,
  IdentitiAudienceTokenResponse,
  IdentitiStepUpChallengeRequest,
  IdentitiStepUpChallengeResponse,
  IdentitiStepUpVerifyRequest,
  IdentitiStepUpVerifyResponse,
  IdentitiAccountUuid,
} from './identiti.dto';

// Klokd v3 — Identity Service rail client (S3-NEW-01)
// Verified against live sandbox 2026-06-09.
//
// Auth: per-request HMAC-SHA256, BASE64-encoded signature (operator pack §4
// is wrong — production rail expects base64, not hex).
//   Authorization: Identiti-HMAC-SHA256 app_id=<id>, signature=<base64>
//   X-Identiti-Timestamp: <RFC 3339>
//   X-Idempotency-Key: <UUIDv4>  (POST/PATCH/DELETE only)
// Canonical signing string:
//   METHOD\nPATH_AND_QUERY\nCONTENT_TYPE\nTIMESTAMP\nSHA256_HEX(body)
// Body hash is hex (unchanged); only the OUTER HMAC encoding differs.

const HEX_64 = /^[a-f0-9]{64}$/i;

interface IdentitiEnvelope<T> {
  ok: boolean;
  data: T;
  meta?: { request_id?: string; timestamp?: string; schema_version?: string };
  error?: { code: string; message: string; detail?: unknown };
}

class IdentityRailClient {
  private get baseUrl(): string {
    return config.identiti.baseUrl;
  }

  private get appId(): string {
    return config.identiti.appId;
  }

  private get appSecret(): string {
    return config.identiti.appSecret;
  }

  private assertConfigured(): void {
    if (!this.baseUrl || !this.appId || !this.appSecret) {
      throw new AppError(
        503,
        'RAIL_CONFIG_INCOMPLETE: identiti (set IDENTITI_BASE_URL, IDENTITI_APP_ID, IDENTITI_APP_SECRET)'
      );
    }
    if (!HEX_64.test(this.appSecret)) {
      throw new AppError(503, 'IDENTITI_APP_SECRET must be 64-char hex (HMAC-SHA256)');
    }
  }

  private sign(params: {
    method: string;
    pathAndQuery: string;
    contentType: string;
    timestamp: string;
    body: string;
  }): string {
    const bodyHash = crypto.createHash('sha256').update(params.body, 'utf8').digest('hex');
    const canonical = [
      params.method,
      params.pathAndQuery,
      params.contentType,
      params.timestamp,
      bodyHash,
    ].join('\n');
    return crypto.createHmac('sha256', this.appSecret).update(canonical, 'utf8').digest('base64');
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    this.assertConfigured();

    const hasBody = body !== undefined && method !== 'GET';
    const serialized = hasBody ? JSON.stringify(body) : '';
    const contentType = hasBody ? 'application/json; charset=utf-8' : '';
    const timestamp = new Date().toISOString();
    const signature = this.sign({
      method,
      pathAndQuery: path,
      contentType,
      timestamp,
      body: serialized,
    });

    const headers: Record<string, string> = {
      Authorization: `Identiti-HMAC-SHA256 app_id=${this.appId}, signature=${signature}`,
      'X-Identiti-Timestamp': timestamp,
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
    let envelope: IdentitiEnvelope<T> | null = null;
    try {
      envelope = text.length > 0 ? (JSON.parse(text) as IdentitiEnvelope<T>) : null;
    } catch {
      // fall through; treat as opaque error
    }

    if (!res.ok) {
      const code = envelope?.error?.code ?? 'unknown';
      const message = envelope?.error?.message ?? `Identiti HTTP ${res.status}`;
      // railCode is carried through so callers can branch on the Identiti error
      // code (e.g. kyc_iprs_no_match vs kyc_artefact_already_submitted) rather
      // than substring-matching the composed message.
      throw new AppError(
        railStatusToAppStatus(res.status),
        `Identiti ${method} ${path} failed: ${code} — ${message}`,
        true,
        code
      );
    }

    if (!envelope || envelope.ok === false) {
      throw new AppError(502, `Identiti ${method} ${path} returned invalid envelope`);
    }

    return envelope.data;
  }

  // ─── Customers ───────────────────────────────────────

  async createCustomer(req: IdentitiCreateCustomerRequest): Promise<IdentitiCreateCustomerResponse> {
    const raw = await this.request<{
      account_uuid: IdentitiAccountUuid;
      state: IdentitiCreateCustomerResponse['state'];
      tier: IdentitiCreateCustomerResponse['tier'];
      created_at: string;
    }>('POST', '/v1/customers', {
      phone: req.phone,
      name_first: req.nameFirst,
      name_last: req.nameLast,
      app_correlation: req.appCorrelation,
      consent: req.consent,
    });
    return {
      accountUuid: raw.account_uuid,
      state: raw.state,
      tier: raw.tier,
      createdAt: raw.created_at,
    };
  }

  async getTier(accountUuid: IdentitiAccountUuid): Promise<IdentitiTierResponse> {
    const raw = await this.request<{
      tier: IdentitiTierResponse['tier'];
      assigned_at: string;
      reason: string;
    }>('GET', `/v1/customers/${encodeURIComponent(accountUuid)}/tier`);
    return { tier: raw.tier, assignedAt: raw.assigned_at, reason: raw.reason };
  }

  // ─── Phone tokens (per-call freshness; never cache > 15 min) ─

  // ─── Activation ──────────────────────────────────────
  //
  // POST /v1/customers/{uuid}/activate — pending_onboarding -> active.
  // Idempotent: an already-active account returns 200 with already_active,
  // never an error. Step-up requires an active account, so this must run
  // before any high-value payout authorisation. Independent of KYC.
  async activateCustomer(accountUuid: IdentitiAccountUuid): Promise<IdentitiActivateResponse> {
    const raw = await this.request<{
      account_uuid: IdentitiAccountUuid;
      state: IdentitiCustomerState;
      previous_state?: IdentitiCustomerState;
      already_active?: boolean;
    }>('POST', `/v1/customers/${encodeURIComponent(accountUuid)}/activate`, {});

    return {
      accountUuid: raw.account_uuid,
      state: raw.state,
      previousState: raw.previous_state,
      alreadyActive: raw.already_active,
    };
  }

  // ─── KYC (IPRS) ──────────────────────────────────────
  //
  // POST /v1/customers/{uuid}/kyc/iprs — IPRS data lookup, not image upload.
  // Side effects rail-side: tier_0 -> tier_1 on full_match, emits KYC_APPROVED
  // + TIER_CHANGED. Does NOT activate the account (activation is a separate
  // endpoint) — the two are independent, do not couple them.
  async submitIprsKyc(
    accountUuid: IdentitiAccountUuid,
    req: IdentitiIprsKycRequest
  ): Promise<IdentitiIprsKycResponse> {
    const raw = await this.request<{
      artefact_id: string;
      state: IdentitiKycArtefactState;
      iprs_summary?: {
        match: 'full_match' | 'partial_match' | 'no_match';
        confidence_band: 'high' | 'medium' | 'low';
        verified_at?: string;
        expires_at?: string;
      };
      tier_promoted_to?: IdentitiTier;
    }>('POST', `/v1/customers/${encodeURIComponent(accountUuid)}/kyc/iprs`, {
      national_id: req.nationalId,
      name_first: req.nameFirst,
      name_last: req.nameLast,
      date_of_birth: req.dateOfBirth,
    });

    return {
      artefactId: raw.artefact_id,
      state: raw.state,
      iprsSummary: raw.iprs_summary && {
        match: raw.iprs_summary.match,
        confidenceBand: raw.iprs_summary.confidence_band,
        verifiedAt: raw.iprs_summary.verified_at,
        expiresAt: raw.iprs_summary.expires_at,
      },
      tierPromotedTo: raw.tier_promoted_to,
    };
  }

  async issuePhoneToken(req: IdentitiPhoneTokenRequest): Promise<IdentitiPhoneTokenResponse> {
    const raw = await this.request<{
      phone_token: string;
      jti: string;
      audience: 'todoku';
      expires_at: string;
    }>('POST', '/v1/phone-tokens', {
      account_uuid: req.accountUuid,
      audience: req.audience,
      ttl_seconds: req.ttlSeconds,
    });
    return {
      phoneToken: raw.phone_token,
      jti: raw.jti,
      audience: raw.audience,
      expiresAt: raw.expires_at,
    };
  }

  // ─── Cross-rail audience token (0.1.3) ───────────────
  //
  // POST /v1/customers/{uuid}/tokens — mint an RS256 customer JWT for a single
  // downstream rail (e.g. aud=https://hakken.co.ke). Preconditions rail-side:
  // account is `active` (else 409 state_invalid_for_action) and the caller holds
  // `identiti:token:issue` (else 403 AUTH_SCOPE_INSUFFICIENT — the operator gate).
  // Caller should cache per account_uuid until ~80% of TTL (see getHakkenJwt).
  async issueCustomerJwt(
    accountUuid: IdentitiAccountUuid,
    req: IdentitiAudienceTokenRequest
  ): Promise<IdentitiAudienceTokenResponse> {
    const raw = await this.request<{
      token: string;
      jti: string;
      audience: string;
      expires_at: string;
    }>('POST', `/v1/customers/${encodeURIComponent(accountUuid)}/tokens`, {
      audience: req.audience,
      ttl_seconds: req.ttlSeconds,
    });
    return {
      token: raw.token,
      jti: raw.jti,
      audience: raw.audience,
      expiresAt: raw.expires_at,
    };
  }

  // ─── Step-up ─────────────────────────────────────────

  async createStepUpChallenge(
    req: IdentitiStepUpChallengeRequest
  ): Promise<IdentitiStepUpChallengeResponse> {
    const raw = await this.request<{
      challenge_id: string;
      factor: IdentitiStepUpChallengeResponse['factor'];
      expires_at: string;
      delivery_status: string;
      otp_plaintext?: string;
      sandbox_only?: boolean;
    }>('POST', '/v1/stepup/challenges', {
      account_uuid: req.accountUuid,
      operation_audience: req.operationAudience,
      operation_kind: req.operationKind,
      operation_risk_tier: req.operationRiskTier,
      factor: req.factor,
    });
    return {
      challengeId: raw.challenge_id,
      factor: raw.factor,
      expiresAt: raw.expires_at,
      deliveryStatus: raw.delivery_status,
      otpPlaintext: raw.otp_plaintext,
      sandboxOnly: raw.sandbox_only,
    };
  }

  async verifyStepUpChallenge(
    req: IdentitiStepUpVerifyRequest
  ): Promise<IdentitiStepUpVerifyResponse> {
    const raw = await this.request<{
      stepup_token: string;
      expires_in: number;
    }>('POST', '/v1/stepup/verify', {
      challenge_id: req.challengeId,
      response: req.response,
    });
    return { stepupToken: raw.stepup_token, expiresIn: raw.expires_in };
  }
}

export const identityRailClient = new IdentityRailClient();
