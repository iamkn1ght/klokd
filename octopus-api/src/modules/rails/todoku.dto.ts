// Klokd v3 — Todoku DTOs (AD-K03)
// Live wire contract verified 2026-06-10 against todoku-prod-production.up.railway.app.

export type TodokuChannel = 'sms' | 'whatsapp' | 'voice';

export interface TodokuSendRequest {
  recipientToken: string; // Identiti phone_token (15-min freshness)
  templateId: string; // ULID, NOT slug
  channel: TodokuChannel;
  variables: Record<string, string>;
  idempotencyKey?: string;
}

export interface TodokuSendResponse {
  messageId: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  channel: TodokuChannel;
}

export interface TodokuMessageStatus {
  messageId: string;
  status: 'queued' | 'sent' | 'delivered' | 'failed';
  channel: TodokuChannel;
  attempts: number;
  failureReason?: string;
}

export type TodokuWebhookEvent = 'MESSAGE_DELIVERED' | 'MESSAGE_FAILED' | 'MESSAGE_SENT';

export interface TodokuWebhookPayload {
  event: TodokuWebhookEvent;
  messageId: string;
  channel: TodokuChannel;
  deliveredAt?: string;
  failureReason?: string;
}
