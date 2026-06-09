import crypto from 'crypto';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import type {
  IdentitiCreateAccountRequest,
  IdentitiCreateAccountResponse,
  IdentitiLookupRequest,
  IdentitiLookupResponse,
  IdentitiVerifyOtpRequest,
  IdentitiVerifyOtpResponse,
  IdentitiKycSubmitRequest,
  IdentitiKycSubmitResponse,
  IdentitiKycSummary,
  IdentitiPhoneTokenRequest,
  IdentitiPhoneTokenResponse,
  IdentitiStepUpRequest,
  IdentitiStepUpInitResponse,
  IdentitiStepUpResultResponse,
} from './identiti.dto';

// Klokd v3 — Identity Service rail client (S3-NEW-01)
// All identity concerns delegated to Identiti (AD-K02, AD-K10).
// Klokd retains only: account_uuid (primary FK) + kyc_tier (cached signal).
//
// Auth: per-request HMAC-SHA256 signing per operator request §4.
//   Authorization: Identiti-HMAC-SHA256 app_id=<id>, signature=<hex>
//   X-Identiti-Timestamp: <RFC 3339>
//   X-Idempotency-Key: <UUIDv4>  (POST/PATCH/DELETE only)
// Canonical signing string: METHOD\nPATH_AND_QUERY\nCONTENT_TYPE\nTIMESTAMP\nSHA256_HEX(body)

const HEX_64 = /^[a-f0-9]{64}$/i;

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

  private signRequest(params: {
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
    return crypto.createHmac('sha256', this.appSecret).update(canonical, 'utf8').digest('hex');
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    this.assertConfigured();

    const hasBody = body !== undefined && method !== 'GET';
    const serialized = hasBody ? JSON.stringify(body) : '';
    const contentType = hasBody ? 'application/json; charset=utf-8' : '';
    const timestamp = new Date().toISOString();
    const signature = this.signRequest({
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

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new AppError(502, `Identiti ${method} ${path} failed (${res.status}): ${detail}`);
    }

    return res.json() as Promise<T>;
  }

  // ─── Accounts ────────────────────────────────────────

  async createAccount(req: IdentitiCreateAccountRequest): Promise<IdentitiCreateAccountResponse> {
    return this.request<IdentitiCreateAccountResponse>('POST', '/v1/accounts', {
      phone: req.phone,
    });
  }

  async lookupAccount(req: IdentitiLookupRequest): Promise<IdentitiLookupResponse> {
    return this.request<IdentitiLookupResponse>('POST', '/v1/accounts/lookup', {
      phone_token: req.phoneToken,
    });
  }

  async verifyOtp(req: IdentitiVerifyOtpRequest): Promise<IdentitiVerifyOtpResponse> {
    return this.request<IdentitiVerifyOtpResponse>('POST', '/v1/accounts/verify-otp', {
      account_uuid: req.accountUuid,
      otp: req.otp,
    });
  }

  // ─── KYC ─────────────────────────────────────────────

  async submitKycDocuments(req: IdentitiKycSubmitRequest): Promise<IdentitiKycSubmitResponse> {
    return this.request<IdentitiKycSubmitResponse>('POST', '/v1/kyc/documents', {
      account_uuid: req.accountUuid,
      id_front: req.idFront,
      id_back: req.idBack,
      selfie: req.selfie,
    });
  }

  async getKycSummary(accountUuid: string): Promise<IdentitiKycSummary> {
    return this.request<IdentitiKycSummary>('GET', `/v1/accounts/${accountUuid}/kyc-summary`);
  }

  // ─── Phone tokens (per-call freshness; never cache > 15 min) ─

  async issuePhoneToken(req: IdentitiPhoneTokenRequest): Promise<IdentitiPhoneTokenResponse> {
    return this.request<IdentitiPhoneTokenResponse>('POST', '/v1/phone-tokens', {
      account_uuid: req.accountUuid,
      audience: req.audience,
    });
  }

  // ─── Step-up ─────────────────────────────────────────

  async initiateStepUp(req: IdentitiStepUpRequest): Promise<IdentitiStepUpInitResponse> {
    return this.request<IdentitiStepUpInitResponse>('POST', '/v1/stepup/challenges', {
      account_uuid: req.accountUuid,
      operation: req.operation,
      context_ref: req.contextRef,
      factor: 'phone_otp',
    });
  }

  async getStepUpResult(challengeId: string): Promise<IdentitiStepUpResultResponse> {
    return this.request<IdentitiStepUpResultResponse>('GET', `/v1/stepup/challenges/${challengeId}`);
  }
}

export const identityRailClient = new IdentityRailClient();
