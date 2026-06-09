import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { identityRailClient } from './identiti.client';
import type {
  TodokuChannel,
  TodokuMessageSendResponse,
  TodokuOtpSendResponse,
} from './todoku.dto';

// Klokd v3 — Comms Service rail client (S3-NEW-02)
// All SMS, OTP, and WhatsApp messages delegated to Todoku (AD-K03).
// Phone numbers NEVER stored in Klokd. Phone tokens fetched per-call from Identiti
// and discarded after the call (15-min freshness — never cache).

class CommsRailClient {
  private get baseUrl(): string {
    return config.todoku.baseUrl;
  }

  private get apiKey(): string {
    return config.todoku.apiKey;
  }

  private get tenantId(): string {
    return config.todoku.tenantId;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    if (!this.baseUrl || !this.apiKey) {
      throw new AppError(
        503,
        'Todoku not configured. Set TODOKU_BASE_URL and TODOKU_API_KEY.'
      );
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'X-Todoku-Tenant': this.tenantId,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new AppError(502, `Todoku ${method} ${path} failed (${res.status}): ${detail}`);
    }

    return res.json() as Promise<T>;
  }

  // ─── Phone-token-per-call helpers ────────────────────
  // Per AD-K03 + advisory §2.3: request a fresh phone token from Identiti
  // immediately before every Todoku call. Do not cache.

  private async freshPhoneToken(accountUuid: string): Promise<string> {
    const { phoneToken } = await identityRailClient.issuePhoneToken({
      accountUuid: accountUuid as `acc_${string}`,
      audience: 'todoku',
    });
    return phoneToken;
  }

  // ─── OTP ─────────────────────────────────────────────

  async sendOtp(
    accountUuid: string,
    templateId: string,
    variables: Record<string, string>
  ): Promise<TodokuOtpSendResponse> {
    const phoneToken = await this.freshPhoneToken(accountUuid);
    return this.request<TodokuOtpSendResponse>('POST', '/otp/send', {
      phone_token: phoneToken,
      template_id: templateId,
      variables,
    });
  }

  // ─── Notifications ───────────────────────────────────

  async sendNotification(
    accountUuid: string,
    templateId: string,
    channel: TodokuChannel,
    variables: Record<string, string>,
    fallbackChannel?: TodokuChannel
  ): Promise<TodokuMessageSendResponse> {
    const phoneToken = await this.freshPhoneToken(accountUuid);
    return this.request<TodokuMessageSendResponse>('POST', '/messages/send', {
      phone_token: phoneToken,
      template_id: templateId,
      channel,
      variables,
      fallback_channel: fallbackChannel,
    });
  }

  async sendWhatsApp(
    accountUuid: string,
    templateId: string,
    variables: Record<string, string>
  ): Promise<TodokuMessageSendResponse> {
    return this.sendNotification(accountUuid, templateId, 'whatsapp', variables, 'sms');
  }
}

export const commsRailClient = new CommsRailClient();
