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

  // Payment Rail — accounts, holds, payouts (AD-K01, AD-K06, AD-K07)
  // Phase 1: Kipkiren Pay sandbox · Phase 3: LipaStack (env-only change)
  // Per-request HMAC-SHA256 signing, base64 signature output.
  // APP_SECRET is base64url-43 (KP follows Todoku encoding, not Identiti's hex-64).
  paymentRail: {
    baseUrl: process.env.PAYMENT_RAIL_API_BASE || process.env.PAYMENT_RAIL_BASE_URL || '',
    appId: process.env.PAYMENT_RAIL_APP_ID || '',
    appSecret: process.env.PAYMENT_RAIL_APP_SECRET || '',
    webhookSecret: process.env.PAYMENT_RAIL_WEBHOOK_SECRET || '',
  },

  // Hakken — geo-indexed discovery (AD-K09)
  // Phase 1: register entities + broadcasts · Phase 3 (Sprint 8+): swap shift feed.
  // PILOT AUTH (per HAKKEN_INTEGRATION_REFERENCE.md §2): three-header pair
  //   Authorization: Bearer <identiti-customer-JWT>
  //   X-Hakken-App-Key:    <app_slug; klokd>
  //   X-Hakken-App-Secret: <per-app secret from Silvia>
  // Full HMAC scheme (Hakken-HMAC-SHA256 t=…,v1=…) is post-pilot HK-9.
  hakken: {
    baseUrl: process.env.HAKKEN_API_BASE || process.env.HAKKEN_BASE_URL || '',
    appKey: process.env.HAKKEN_APP_KEY || 'klokd',
    appSecret: process.env.HAKKEN_APP_SECRET || '',
    // Bearer for Hakken = an Identiti-minted RS256 customer JWT scoped to this
    // audience (the URL, not the slug — Hakken 23 Jul). Minted via
    // identityRailClient.issueCustomerJwt and cached per account_uuid until ~80%
    // of TTL. Live once Silvia grants Klokd the `identiti:token:issue` scope.
    jwtAudience: process.env.HAKKEN_JWT_AUDIENCE || 'https://hakken.co.ke',
    jwtTtlSeconds: parseInt(process.env.HAKKEN_JWT_TTL_SECONDS || '900', 10),
  },

  // Hakken deferral-retry sweep (D2). Replays `hakken.*.deferred` audit rows —
  // the ones stranded while the aud=hakken JWT is unavailable. Probe-gated so it
  // does nothing (beyond one cheap JWT check) during the systemic outage, then
  // drains the backlog once the token lands. Backoff is exponential per op:
  // wait = backoffBaseMs * 2^(attempts-1), capped at maxAttempts (Hakken R7).
  hakkenSweep: {
    enabled: process.env.HAKKEN_SWEEP_ENABLED !== 'false',
    intervalMs: parseInt(process.env.HAKKEN_SWEEP_INTERVAL_MS || '300000', 10), // 5 min
    maxAttempts: parseInt(process.env.HAKKEN_SWEEP_MAX_ATTEMPTS || '5', 10),
    backoffBaseMs: parseInt(process.env.HAKKEN_SWEEP_BACKOFF_BASE_MS || '60000', 10), // 1 min
    lookbackDays: parseInt(process.env.HAKKEN_SWEEP_LOOKBACK_DAYS || '30', 10),
  },

  // Helpan AI — agent runtime rail (per KMV_RAILS_INTEGRATION_GUIDE.md §7)
  // Klokd has dual role: consuming app (issues authorities, dispatches actions)
  // AND target rail (receives forwarded dispatches at /agents/dispatch/*).
  // App ID is LITERAL 'klokd' (NOT klokd_sandbox — Helpan keys on app slug).
  // Webhook canonical is unique: {TIMESTAMP}\n{PATH}\n{SHA256_HEX(body)}
  helpan: {
    baseUrl: process.env.HELPAN_API_BASE || '',
    appId: process.env.HELPAN_APP_ID || 'klokd',
    appSecret: process.env.HELPAN_APP_SECRET || '',
    webhookSecret: process.env.HELPAN_WEBHOOK_SECRET || '',
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

  // Sandbox-only escape hatch. When the Identiti rail is unreachable,
  // requestOtp mints a local placeholder account_uuid (acc_local_*) so the
  // auth flow stays testable end-to-end. Defaults OFF; never enable in
  // production — placeholder accounts cannot pass KYC or receive payouts.
  railFallbackLocal: process.env.RAIL_FALLBACK_LOCAL === 'true',

  // Echo the OTP back in the request response (the `sandboxOtp` field), so a
  // tester/investor can sign in without receiving a real SMS. Decoupled from
  // railFallbackLocal so the deployed app can use REAL Identiti while still
  // echoing the OTP for demos — the two are orthogonal concerns. Turn OFF for
  // real users once Todoku SMS delivery is confirmed.
  otpSandboxEcho: process.env.OTP_SANDBOX_ECHO === 'true',
} as const;
