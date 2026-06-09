// Klokd v3 — Todoku template IDs (S9-NEW-01)
// Templates must be registered with Todoku before use. WhatsApp templates require
// Meta approval (24–72h via Todoku's WhatsApp Business Account).

export const TODOKU_TEMPLATES = {
  SHIFT_CONFIRMED: 'klokd_shift_confirmed',
  SHIFT_REMINDER: 'klokd_shift_reminder',
  PAYMENT_RECEIVED: 'klokd_payment_received',
  SHIFT_FILLED: 'klokd_shift_filled',
  DISPUTE_UPDATE: 'klokd_dispute_update',
  OTP: 'klokd_otp',
  KMPDC_EXPIRY_60: 'klokdh_kmpdc_expiry_60',
  KMPDC_EXPIRY_30: 'klokdh_kmpdc_expiry_30',
} as const;

export type TodokuTemplateId = (typeof TODOKU_TEMPLATES)[keyof typeof TODOKU_TEMPLATES];
