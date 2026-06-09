import crypto from 'crypto';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import type {
  IdentitiCreateCustomerRequest,
  IdentitiCreateCustomerResponse,
  IdentitiTierResponse,
  IdentitiPhoneTokenRequest,
  IdentitiPhoneTokenResponse,
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
      throw new AppError(res.status === 401 ? 401 : 502, `Identiti ${method} ${path} failed: ${code} — ${message}`);
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
