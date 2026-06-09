// Klokd v3 — Todoku DTOs (AD-K03)
// All SMS, OTP, and WhatsApp messages flow through Todoku.
// Klokd holds phone tokens (15-min freshness from Identiti) and template IDs.
// Phone numbers are never stored in Klokd's database, logs, or message queues.

export type TodokuChannel = 'sms' | 'whatsapp' | 'voice';

export interface TodokuOtpSendRequest {
  phoneToken: string;
  templateId: string;
  variables: Record<string, string>;
}

export interface TodokuOtpSendResponse {
  messageId: string;
  status: 'queued' | 'sent';
}

export interface TodokuMessageSendRequest {
  phoneToken: string;
  templateId: string;
  channel: TodokuChannel;
  variables: Record<string, string>;
  fallbackChannel?: TodokuChannel;
}

export interface TodokuMessageSendResponse {
  messageId: string;
  status: 'queued' | 'sent';
  channel: TodokuChannel;
}

export type TodokuWebhookEvent = 'MESSAGE_DELIVERED' | 'MESSAGE_FAILED';

export interface TodokuWebhookPayload {
  event: TodokuWebhookEvent;
  messageId: string;
  channel: TodokuChannel;
  deliveredAt?: string;
  failureReason?: string;
}
