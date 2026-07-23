import crypto from 'crypto';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { railStatusToAppStatus } from './rail-error';
import { identityRailClient } from './identiti.client';
import { TODOKU_TEMPLATES } from './templates';
import type { TodokuSendResponse, TodokuChannel } from './todoku.dto';

// Klokd v3 — Comms rail client (S3-NEW-02)
// Verified against live sandbox 2026-06-10.
//
// Auth: per-request HMAC-SHA256, BASE64 signature output (same shape as Identiti).
//   Authorization: Todoku-HMAC-SHA256 app_id=<id>, signature=<base64>
//   X-Todoku-Timestamp: <RFC 3339>
//   X-Idempotency-Key: <UUIDv4>  (writes only)
// Canonical signing string:
//   METHOD\nPATH_AND_QUERY\nCONTENT_TYPE\nTIMESTAMP\nSHA256_HEX(body)
//
// Wire format notes (verified 2026-06-10):
// - APP_SECRET is base64url-43 (no padding) — distinct from Identiti's hex-64
// - Signature output is base64 standard (not base64url)
// - NO X-Todoku-Tenant header — tenant identity comes from app_id in Authorization
// - Single POST /v1/messages/send endpoint serves OTP + transactional + marketing
//   (NO separate /v1/otp/send endpoint)
// - template_id is a 26-char Crockford ULID, NOT a slug

interface TodokuEnvelope<T> {
  ok: boolean;
  data: T;
  meta?: { request_id?: string };
  error?: { code: string; message: string; detail?: unknown };
}

class CommsRailClient {
  private get baseUrl(): string {
    return config.todoku.baseUrl;
  }

  private get appId(): string {
    return config.todoku.appId;
  }

  private get appSecret(): string {
    return config.todoku.appSecret;
  }

  private assertConfigured(): void {
    if (!this.baseUrl || !this.appId || !this.appSecret) {
      throw new AppError(
        503,
        'RAIL_CONFIG_INCOMPLETE: todoku (set TODOKU_API_BASE, TODOKU_APP_ID, TODOKU_APP_SECRET)'
      );
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
      Authorization: `Todoku-HMAC-SHA256 app_id=${this.appId}, signature=${signature}`,
      'X-Todoku-Timestamp': timestamp,
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
    let envelope: TodokuEnvelope<T> | null = null;
    try {
      envelope = text.length > 0 ? (JSON.parse(text) as TodokuEnvelope<T>) : null;
    } catch {
      // fall through
    }

    if (!res.ok) {
      const code = envelope?.error?.code ?? 'unknown';
      const message = envelope?.error?.message ?? `Todoku HTTP ${res.status}`;
      throw new AppError(railStatusToAppStatus(res.status), `Todoku ${method} ${path} failed: ${code} — ${message}`);
    }

    if (!envelope || envelope.ok === false) {
      throw new AppError(502, `Todoku ${method} ${path} returned invalid envelope`);
    }

    return envelope.data;
  }

  // ─── Phone-token-per-call ─────────────────────────────
  // Per AD-K03: request a fresh Identiti phone_token immediately before every
  // Todoku call. Never cache beyond the 15-min freshness window.
  private async freshPhoneToken(accountUuid: string): Promise<string> {
    const { phoneToken } = await identityRailClient.issuePhoneToken({
      accountUuid: accountUuid as `acc_${string}`,
      audience: 'todoku',
    });
    return phoneToken;
  }

  // ─── Sends ────────────────────────────────────────────

  private async sendMessage(
    accountUuid: string,
    templateId: string,
    channel: TodokuChannel,
    variables: Record<string, string>
  ): Promise<TodokuSendResponse> {
    // Fresh phone token per send — Identiti phone tokens are single-use per
    // audience/JTI and 15-min freshness window. Never cache across sends.
    const phoneToken = await this.freshPhoneToken(accountUuid);
    const raw = await this.request<{
      message_id: string;
      status: TodokuSendResponse['status'];
      channel: TodokuChannel;
    }>('POST', '/v1/messages/send', {
      recipient_token: phoneToken,
      template_id: templateId,
      channel,
      template_variables: variables,
    });
    return { messageId: raw.message_id, status: raw.status, channel: raw.channel };
  }

  /**
   * Send an OTP. Class_0 OTP template (klokd_otp_sms) is delivered via SMS.
   * Identiti's createStepUpChallenge already triggers OTP dispatch internally —
   * Klokd's auth flow can call this directly for non-stepup OTP needs, or rely
   * on Identiti's internal dispatch for login.
   */
  async sendOtp(
    accountUuid: string,
    otpCode: string,
    expiryMins: number = 5
  ): Promise<TodokuSendResponse> {
    return this.sendMessage(accountUuid, TODOKU_TEMPLATES.OTP_SMS, 'sms', {
      otp_code: otpCode,
      expiry_mins: String(expiryMins),
    });
  }

  /**
   * Send a transactional/marketing message. Caller picks the template ULID
   * + channel; this method just signs and delivers.
   */
  async sendNotification(
    accountUuid: string,
    templateId: string,
    channel: TodokuChannel,
    variables: Record<string, string>
  ): Promise<TodokuSendResponse> {
    return this.sendMessage(accountUuid, templateId, channel, variables);
  }

  /**
   * Convenience: send a notification preferring WhatsApp with SMS fallback.
   * Note: Todoku does NOT do automatic fallback — caller picks one template
   * per channel. This method just hits the WA template; SMS retry is the
   * caller's job via the second template ULID.
   */
  async sendWhatsApp(
    accountUuid: string,
    templateId: string,
    variables: Record<string, string>
  ): Promise<TodokuSendResponse> {
    return this.sendMessage(accountUuid, templateId, 'whatsapp', variables);
  }
}

export const commsRailClient = new CommsRailClient();
