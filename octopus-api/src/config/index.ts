import dotenv from 'dotenv';
dotenv.config();

// Klokd v3 — Configuration
// Per AD-K01/02/03 cardinal rules: Klokd never holds Daraja credentials,
// never calls Africa's Talking directly, never stores National ID images.
// All such concerns flow through KMV rails (Identiti / Todoku / Kipkiren Pay).

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  region: process.env.AWS_REGION || 'eu-west-1', // Platform standard

  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-me',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-change-me',
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // ─── KMV Platform Rails ─────────────────────────────────

  // Identiti — account UUID, KYC, phone tokens, step-up (AD-K02, AD-K10)
  // Per-request HMAC-SHA256 signing. Signature is BASE64-encoded (the operator
  // pack §4 says hex but the live rail expects base64; verified 2026-06-09).
  // IDENTITI_API_BASE is the platform-standard var name; IDENTITI_BASE_URL kept
  // as a fallback. Webhook secret deferred until ID-14 Phase 2 (Kafka today).
  identiti: {
    baseUrl: process.env.IDENTITI_API_BASE || process.env.IDENTITI_BASE_URL || '',
    appId: process.env.IDENTITI_APP_ID || '',
    appSecret: process.env.IDENTITI_APP_SECRET || '',
    webhookSecret: process.env.IDENTITI_WEBHOOK_SECRET || '',
  },

  // Todoku — SMS, OTP, WhatsApp (AD-K03)
  // Per-request HMAC-SHA256 signing, base64 signature output.
  // Tenant identity comes from APP_ID inside the Authorization header — there
  // is no X-Todoku-Tenant header (rail ignores it).
  // APP_SECRET is base64url-43 (no padding) per Todoku CONTRACT.md.
  todoku: {
    baseUrl: process.env.TODOKU_API_BASE || process.env.TODOKU_BASE_URL || '',
    appId: process.env.TODOKU_APP_ID || '',
    appSecret: process.env.TODOKU_APP_SECRET || '',
    webhookSecret: process.env.TODOKU_WEBHOOK_SECRET || '',
  },

  // Payment Rail — escrow, payouts, wallets (AD-K01, AD-K06, AD-K07)
  // Phase 1: Kipkiren Pay sandbox · Phase 3: LipaStack (env-only change)
  paymentRail: {
    baseUrl: process.env.PAYMENT_RAIL_BASE_URL || '',
    apiKey: process.env.PAYMENT_RAIL_API_KEY || '',
    webhookSecret: process.env.PAYMENT_RAIL_WEBHOOK_SECRET || '',
  },

  // Hakken — geo-indexed discovery (AD-K09)
  // Phase 1: register entities only · Phase 3: query for shift feed + worker ranking
  hakken: {
    baseUrl: process.env.HAKKEN_BASE_URL || '',
    apiKey: process.env.HAKKEN_API_KEY || '',
  },

  // ─── Klokd-Owned Infrastructure ─────────────────────────

  // Supabase — Klokd's own DB + storage (pay statements + contracts only — AD-K04)
  supabase: {
    url: process.env.SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET || 'klokd-documents',
  },

  // FCM via Expo — direct integration (AD-K05; Todoku does NOT handle push)
  expoPush: {
    accessToken: process.env.EXPO_PUSH_TOKEN || '',
  },

  platform: {
    feePercent: 4,
    gpsClockInRadiusMeters: parseInt(process.env.GPS_CLOCK_IN_RADIUS_METERS || '500', 10),
    escrowAutoReleaseHours: parseInt(process.env.ESCROW_AUTO_RELEASE_HOURS || '4', 10),
    section37WarnDays: 20,
    section37AcknowledgeDays: 25,
    section37BlockDays: 30,
    minRatingsForDisplay: 3,
    dataRetentionYears: 7,
    payoutStepUpThresholdKes: parseInt(process.env.PAYOUT_STEP_UP_THRESHOLD_KES || '20000', 10),
  },

  defaultTenantId: 'klokd-ke-default',
} as const;
