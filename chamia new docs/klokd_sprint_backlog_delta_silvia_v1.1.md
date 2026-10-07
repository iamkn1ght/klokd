# Klokd v3 — Sprint Backlog Delta
## Engineering Brief for Silvia Mumbua, CTO · Kipkiren Teknolojia

**Document version:** 1.1 · June 2026
**From:** Chamia Mutuku, CEO
**To:** Silvia Mumbua, CTO
**Classification:** Confidential · Internal — Engineering
**Context:** Klokd v3 sprint backlog v4 was designed before the KMV App Integration Guide was finalised. This document identifies the stories that conflict with the platform rails architecture and provides the corrected versions. Read alongside the full advisory: *Klokd v3 — Platform Rails Integration Advisory v1.0*.

**v1.1 changes from v1.0:** Part C4, S3-NEW-03, Part E, Part F, and Part G updated. Kipkiren Pay is transcended by LipaStack when LipaStack matures — it is not permanently hidden behind Kipkiren Pay. Payment client renamed `PaymentRailClient`. Environment variables renamed `PAYMENT_RAIL_*`. Part E rewritten to explain the three-phase transition correctly. Wallet topology open question added for Silvia.

---

## The Short Version

Four existing stories need to change. Seven new stories need to be added. The cardinal rule is the reason for all of it:

> **Apps never hold customer funds. Never store KYC documents. Never run their own SMS infrastructure.**

Everything in this delta flows from that rule.

---

## Part A — Stories That Change

### C1 — S3-02 (Authentication)

**Current story:**
> As a user, I need to register and authenticate so that I can access the platform securely.
> AC: JWT + refresh tokens · Role-based: worker/employer/admin · Phone number + OTP via Africa's Talking · OTP expires 5min · Rate limit: 3 attempts/10min

**What changes:** Africa's Talking is a direct comms provider. Klokd cannot call it directly. OTP delivery routes through **Todoku**. Klokd never holds phone numbers in logs, queues, or database fields — it uses Identiti phone tokens (15-min freshness) passed to Todoku.

**Revised story:**
> As a user, I need to register and authenticate via the KMV platform rails so that my identity is verified correctly and my phone number is never held by Klokd.

**Revised AC:**
- [ ] Account creation: `POST /identiti/accounts` called on first registration — returns `account_uuid`
- [ ] `account_uuid` stored in Klokd `workers` / `employers` table as primary foreign key (not Klokd's own UUID for customer identity)
- [ ] OTP flow: Klokd calls `POST /identiti/tokens/phone` (audience: todoku) → receives `phone_token` (15-min freshness) → calls `POST /todoku/otp/send` (phone_token, template: `klokd_otp`) → Todoku delivers OTP to handset
- [ ] Phone number is NEVER stored in Klokd's database, logs, or S3
- [ ] `phone_token` is NEVER cached beyond 15-minute freshness window
- [ ] JWT + refresh tokens issued by Klokd after Identiti account active confirmed
- [ ] Role-based: worker / employer / admin
- [ ] Rate limiting: 3 OTP attempts per 10 minutes (Klokd-layer enforcement)
- [ ] Existing accounts: `POST /identiti/accounts/lookup` (phone_token) discovers existing account_uuid on login
- [ ] Story points: 8 (was 5 — rail integration overhead is real)

---

### C2 — S3-03 (Identity Service)

**Current story:**
> As a worker, I need to submit my National ID for verification so that employers trust me.
> AC: ID images AES-256 encrypted in S3 · Verification status: pending/approved/rejected · ID number hashed in DB (not plaintext)

**What changes:** Klokd is not the designated Data Processor for identity documents. National ID images, selfie, and biometric vectors are stored in **Identiti** — not Klokd's S3. Klokd stores `account_uuid` and `kyc_tier` signal only. The DPA 2019 data minimisation principle applies: Klokd should not accumulate PII it does not need.

Note: Klokd's S3 bucket is still used for **pay statements and contracts** — these are legitimate Klokd-owned documents (financial records, employment contracts) and do not belong in Identiti. This change is identity documents only.

**Revised story:**
> As a worker, I need to submit my National ID and selfie for verification so that employers trust me and I earn the verified badge.

**Revised AC:**
- [ ] Worker submits ID front, ID back, selfie in Klokd app
- [ ] Klokd calls `POST /identiti/kyc/documents` (account_uuid, id_front, id_back, selfie) — documents transmitted to Identiti, NOT stored in Klokd S3
- [ ] Identiti returns `verification_id`, `status: pending`
- [ ] Klokd stores in own DB: `{ account_uuid, kyc_tier: 0, verification_status: 'pending' }` — no images, no raw ID number
- [ ] Display-only masked ID value (last 4 digits): derived from Identiti's `GET /accounts/:uuid/kyc-summary` response field — not stored independently
- [ ] Identiti webhook `KYC_TIER_CHANGED` received: Klokd updates `kyc_tier` in own DB
- [ ] Verification status displayed from Klokd's own `verification_status` field (updated via webhook)
- [ ] Workers with `kyc_tier < 1` cannot apply for shifts (enforced in ShiftService)
- [ ] Remove: all S3 upload code for identity documents from Klokd codebase
- [ ] Remove: KYC document encryption logic from Klokd (Identiti handles this)
- [ ] Story points: 5 (unchanged — scope reduced by removing Klokd-side storage, offset by Identiti integration overhead)

---

### C3 — S6-04 (Notifications)

**Current story:**
> As the platform, I need FCM push notifications with WhatsApp Business API fallback so that users are always reached.
> AC: FCM primary · WA fallback at 5min · All events logged · Bilingual templates · Tested on device

**What changes:** WhatsApp Business API must not be called directly by Klokd. WhatsApp fallback routes through **Todoku** (phone_token + template_id). FCM push remains a direct Klokd integration — Todoku does not handle mobile push.

**Revised story:**
> As the platform, I need FCM push notifications with Todoku-delivered WhatsApp fallback so that users are always reached without Klokd holding phone numbers.

**Revised AC:**
- [ ] FCM integration: Klokd maintains own Firebase project, calls FCM directly for push — **no change to FCM implementation**
- [ ] WhatsApp fallback (replaces direct WhatsApp Business API call):
  - At 5 min after FCM push not acknowledged: Klokd calls `POST /identiti/tokens/phone` (audience: todoku) for recipient account_uuid → receives `phone_token`
  - Klokd calls `POST /todoku/messages/send` (phone_token, template_id, variables)
  - Todoku delivers WhatsApp message
  - Phone number is NEVER held by Klokd's fallback service
- [ ] Remove: WhatsApp Business API credentials from Klokd environment
- [ ] Remove: WhatsApp direct API client from Klokd codebase
- [ ] All 6 core Klokd notification templates registered with Todoku (see new story S9-NEW-01)
- [ ] Todoku webhook `MESSAGE_DELIVERED` / `MESSAGE_FAILED` received and logged in Klokd's `notification_log`
- [ ] All notification events logged: `{ event_type, account_uuid, channel, template_id, todoku_message_id, status, timestamp }` — no phone number in log
- [ ] Bilingual templates (Swahili/English): template content submitted to Todoku; Todoku submits to Meta for WhatsApp approval
- [ ] Tested on physical Android device: both FCM delivery and Todoku WhatsApp fallback
- [ ] Story points: 5 (unchanged — FCM implementation unchanged, WhatsApp re-routing is similar complexity)

---

### C4 — S16-01 (Payment Service / Daraja)

**Current story:**
> As the Payment Service, I need Daraja B2C production integration with full error handling.
> AC: Production consumer key and secret configured · All states handled: Success, Failed, Timeout · etc.

**What changes:** This is the most significant change. Klokd is not a regulated financial entity. Holding Daraja credentials and calling Daraja directly violates the cardinal rule. Kipkiren Pay holds the Daraja relationship. Klokd's Payment Service becomes a **Kipkiren Pay integration**, not a Daraja integration.

**Revised story:**
> As the Payment Service, I need to initiate and track worker payouts via Kipkiren Pay so that workers receive their net wages without Klokd holding Daraja credentials.

**Revised AC:**
- [ ] `PAYMENT_RAIL_BASE_URL` and `PAYMENT_RAIL_API_KEY` loaded from environment variables — never hardcoded
- [ ] All payment rail response payloads mapped to Klokd-internal typed DTOs at the API boundary (see DTO requirement below)
- [ ] Payout initiation: `POST /kipkiren-pay/payouts` (worker_account_uuid, net_amount_kes, shift_id, escrow_ref, fee_amount, idempotency_key)
- [ ] Kipkiren Pay returns: `{ payment_id, status: 'pending' | 'completed' | 'failed' }`
- [ ] Klokd stores: `payments { payment_id, shift_id, gross, paye, nssf, shif, net, status }`
- [ ] Kipkiren Pay webhook `PAYOUT_COMPLETED` received: Klokd updates payment status, stores `mpesa_ref`, triggers pay statement generation
- [ ] Kipkiren Pay webhook `PAYOUT_FAILED`: Klokd triggers admin alert, worker notification via Todoku
- [ ] Step-up flow for payouts above threshold: Identiti step-up JWT obtained and included in Kipkiren Pay payout request
- [ ] Kipkiren Pay tier limit pre-check: `GET /kipkiren-pay/wallets/:uuid/limits` before initiating payout — surface limit exceeded as graceful UI error, not a backend failure
- [ ] Remove: all Daraja API credentials from Klokd environment and codebase
- [ ] Remove: all Daraja B2C client code from Klokd codebase
- [ ] Remove: Daraja callback endpoint from Klokd API (Kipkiren Pay handles Daraja callbacks; Klokd receives Kipkiren Pay webhooks instead)
- [ ] Story points: 8 (was 8 — complexity is comparable; implementation shifts from Daraja to Kipkiren Pay)

**Required DTO pattern (rail-agnostic design):**

```typescript
// packages/klokd-api/src/payments/payment-rail.dto.ts
// Map all payment rail response fields here.
// Phase 1: Kipkiren Pay. Phase 3: LipaStack (when Kipkiren Pay transcended).
// Only this file changes when the rail changes — not business logic.

export interface PaymentRailPayoutRequest {
  workerAccountUuid: string;
  netAmountKes: number;
  shiftId: string;
  escrowRef: string;
  feeAmountKes: number;
  stepUpJwt?: string;
  idempotencyKey: string;
}

export interface PaymentRailPayoutResponse {
  paymentId: string;       // Kipkiren Pay: payment_id · LipaStack (Phase 3): tx_id — mapped here, not in business logic
  status: 'pending' | 'completed' | 'failed';
  workerAccountUuid: string;
  netAmountKes: number;
  settledAt?: string;
}

export interface PaymentRailPayoutWebhook {
  event: 'PAYOUT_COMPLETED' | 'PAYOUT_FAILED';
  paymentId: string;
  mpesaRef?: string;       // present on PAYOUT_COMPLETED
  failureReason?: string;  // present on PAYOUT_FAILED
  settledAt?: string;
}
```

---

## Part B — S16-02 and S16-03 (Escrow — Partial Change)

**S16-02 (Escrow STK Push)** and **S16-03 (Deduction-adjusted disbursement)** need minor revisions consistent with the Kipkiren Pay integration. The escrow concept is correct — the implementation shifts from direct Daraja STK Push to Kipkiren Pay escrow API.

**S16-02 revised AC additions:**
- [ ] STK Push initiated via `POST /kipkiren-pay/escrow/fund` (not via Daraja directly)
- [ ] Kipkiren Pay webhook `ESCROW_FUNDED` received: Klokd updates shift status, permits clock-in
- [ ] Kipkiren Pay webhook `ESCROW_FUND_FAILED`: Klokd reverts shift to `posted`, notifies employer via Todoku
- [ ] Remove: direct Daraja STK Push initiation code

**S16-03 revised AC additions:**
- [ ] Net amount calculation remains in Klokd's Compliance Engine (unchanged — this is legitimately Klokd's)
- [ ] Calculated net amount passed to Kipkiren Pay payout request (not deducted by Klokd directly)
- [ ] Kipkiren Pay applies deductions at payout execution — Klokd provides the amounts, Kipkiren Pay applies them
- [ ] Deduction record stored in Klokd's own `deduction_records` table (for Pay Tab display and KRA reporting) — this is a Klokd-owned record, not a Kipkiren Pay function

---

## Part C — New Stories to Add

### S3-NEW-01 — Identiti SDK Integration (Sprint 3)

> As the developer, I need the Identiti SDK/API client configured so that all Klokd services can call Identiti for account management, KYC, and token issuance.

**AC:**
- [ ] `IDENTITI_BASE_URL`, `IDENTITI_API_KEY` loaded from environment variables
- [ ] Typed client wrapper: `IdentityService` class with methods: `createAccount`, `lookupAccount`, `submitKycDocuments`, `getKycTier`, `issuePhoneToken`, `initiateStepUp`
- [ ] All Identiti responses mapped to typed DTOs
- [ ] Webhook handler registered: `KYC_TIER_CHANGED` → updates `kyc_tier` in Klokd DB
- [ ] Unit tests: mock Identiti responses for all states (pending, approved, rejected, tier_changed)
- [ ] Story points: 3

---

### S3-NEW-02 — Todoku Client Integration (Sprint 3)

> As the developer, I need the Todoku API client configured so that all Klokd notification and OTP flows route through Todoku.

**AC:**
- [ ] `TODOKU_BASE_URL`, `TODOKU_API_KEY`, `TODOKU_TENANT_ID` loaded from environment variables
- [ ] Typed client wrapper: `CommsService` class with methods: `sendOtp`, `sendNotification`, `sendWhatsApp`
- [ ] Phone token freshness management: `CommsService` handles phone_token requests from Identiti before each Todoku call — never caches beyond 15-minute window
- [ ] Webhook handler registered: `MESSAGE_DELIVERED`, `MESSAGE_FAILED` → updates `notification_log`
- [ ] `notification_log` table: `{ id, account_uuid, channel, template_id, todoku_message_id, status, sent_at, delivered_at }` — **no phone number column**
- [ ] Unit tests: mock Identiti phone token + Todoku delivery for all notification types
- [ ] Story points: 3

---

### S3-NEW-03 — Payment Rail Client Integration (Sprint 3)

> As the developer, I need a rail-agnostic payment client configured so that all payment flows route through the designated KMV payment rail — Kipkiren Pay now, LipaStack when Kipkiren Pay is transcended.

**AC:**
- [ ] `PAYMENT_RAIL_BASE_URL`, `PAYMENT_RAIL_API_KEY` loaded from environment variables — **never hardcoded, never named after a specific rail**
- [ ] Typed client wrapper: `PaymentRailClient` (not `KipkirenPayClient`) with methods: `createWallet`, `getBalance`, `getLimits`, `fundEscrow`, `initiatePayout`, `releaseEscrow`
- [ ] All payment rail response fields mapped to Klokd-internal DTOs in `payment-rail.dto.ts` at this boundary layer
- [ ] Webhook handler registered: `ESCROW_FUNDED`, `PAYOUT_COMPLETED`, `PAYOUT_FAILED`, `WALLET_CREDITED`
- [ ] Environment separation: dev uses Kipkiren Pay sandbox (`PAYMENT_RAIL_BASE_URL=https://sandbox.pay.kipkiren.co.ke`); Phase 3 production: `PAYMENT_RAIL_BASE_URL=https://api.lipastack.co.ke`
- [ ] Comment in `payment-rail.dto.ts`: `// Phase 1: Kipkiren Pay. Phase 3: LipaStack when Kipkiren Pay is transcended. Update PAYMENT_RAIL_BASE_URL in env config. This file absorbs any field name changes.`
- [ ] Story points: 3

---

### S4-NEW-01 — Kipkiren Pay Wallet Creation (Sprint 4)

> As a worker or employer, I need a Kipkiren Pay wallet created when I complete onboarding so that I can send and receive payments on the platform.

**AC:**
- [ ] On worker onboarding completion (KYC tier ≥ 1 confirmed): `POST /kipkiren-pay/wallets` (account_uuid, type: 'worker') → `wallet_id` stored in Klokd `workers` table
- [ ] On employer onboarding completion (WIBA confirmed, M-Pesa configured): `POST /kipkiren-pay/wallets` (account_uuid, type: 'employer') → `wallet_id` stored in Klokd `employers` table
- [ ] `wallet_id` is used in all subsequent Kipkiren Pay calls for that account
- [ ] Story points: 2

---

### S5-NEW-01 — Hakken Shift Entity Registration (Sprint 5)

> As the platform, I need to register and update shift entities with Hakken so that workers can discover available shifts via the Hakken discovery surface.

**AC:**
- [ ] On shift posted (`POST /shifts`): Klokd calls `POST /hakken/entities/shifts` (shift_id, role, geo_hash, start_time, rate, employer_rating)
- [ ] On shift confirmed (filled): Klokd calls `PATCH /hakken/entities/shifts/:id` (status: 'filled') — removes from worker discovery feed
- [ ] On shift expired (past start_time, not filled): same PATCH call (status: 'expired')
- [ ] Hakken entity registration is non-blocking — if Hakken call fails, shift is still posted. Log failure and retry via background job.
- [ ] Phase 1: `GET /shifts/available` remains Klokd-internal sort (S4-05 unchanged). Hakken is registered but not yet queried.
- [ ] Story points: 3

---

### S8-NEW-01 — Hakken Worker Entity Registration (Sprint 8)

> As the platform, I need to register verified workers with Hakken so that employers can discover them via the Hakken ranking surface.

**AC:**
- [ ] On worker KYC tier ≥ 1 confirmed: Klokd calls `POST /hakken/entities/workers` (account_uuid, geo_hash, specialisations, show_up_rate, rating, availability_signal)
- [ ] On worker profile update (specialisations, availability): Klokd calls `PATCH /hakken/entities/workers/:id`
- [ ] On worker rating update: Hakken entity updated with new aggregate rating
- [ ] Phase 3 onwards: `GET /shifts/:id/applicants` backed by `GET /hakken/discovery/workers` (Hakken-ranked). Klokd resolves full worker card data from own DB, cross-referenced with Hakken ranking.
- [ ] Story points: 3

---

### S9-NEW-01 — Todoku Template Registration (Sprint 9)

> As the platform, I need all Klokd notification templates registered with Todoku and WhatsApp templates approved by Meta so that notification delivery works in production.

**AC:**
- [ ] All 6 core templates submitted to Todoku (template_id, channel, variables):
  - `klokd_shift_confirmed` (WhatsApp + SMS)
  - `klokd_shift_reminder` (WhatsApp)
  - `klokd_payment_received` (WhatsApp + SMS)
  - `klokd_shift_filled` (SMS)
  - `klokd_dispute_update` (SMS)
  - `klokd_otp` (SMS)
- [ ] WhatsApp templates submitted to Meta via Todoku for approval (Meta approval typically 24–72 hours)
- [ ] All templates tested on Todoku sandbox: correct variable substitution confirmed
- [ ] Bilingual versions (Swahili/English) where applicable
- [ ] Template IDs stored as constants in `packages/klokd-api/src/comms/templates.ts` — never as inline strings
- [ ] Story points: 2

---

## Part D — Sprint Impact Summary

| Sprint | Change type | Stories affected | Net point change |
|---|---|---|---|
| Sprint 3 | Stories revised + 3 new | S3-02 (revised), S3-03 (revised), S3-NEW-01, S3-NEW-02, S3-NEW-03 | +9 pts |
| Sprint 4 | 1 new story | S4-NEW-01 | +2 pts |
| Sprint 5 | 1 new story | S5-NEW-01 | +3 pts |
| Sprint 6 | Story revised | S6-04 (revised) | 0 pts |
| Sprint 8 | 1 new story | S8-NEW-01 | +3 pts |
| Sprint 9 | 1 new story | S9-NEW-01 | +2 pts |
| Sprint 16 | Stories revised | S16-01 (revised), S16-02 (minor), S16-03 (minor) | 0 pts |
| **Total** | | | **+19 pts across 23 sprints** |

Sprint 3 carries the largest addition because it is the foundational rail client setup sprint. This is correct — the three new S3 stories are infrastructure that every subsequent sprint depends on. If these are not done in Sprint 3, the integration debt compounds into every subsequent sprint.

---

## Part E — The Kipkiren Pay → LipaStack Transition (For Silvia)

**The correct architecture — three phases:**

| Phase | Designated payment rail | Klokd's `PAYMENT_RAIL_BASE_URL` points to |
|---|---|---|
| Phase 1 — now | Kipkiren Pay (CBK E-Money Issuer, internal KMV rail) | `pay.kipkiren.co.ke` |
| Phase 2 — LipaStack live, Kipkiren Pay migrating | Transition (Klokd unchanged) | `pay.kipkiren.co.ke` |
| Phase 3 — Kipkiren Pay transcended | LipaStack (designated KMV payment rail) | `api.lipastack.co.ke` |

**What "transcended" means:** LipaStack is not built under Kipkiren Pay. It is a separate external payments platform competing with Paystack and Pesapal. When LipaStack matures, Kipkiren Pay as a standalone internal rail becomes redundant — LipaStack is the more capable, externally-validated payment infrastructure. At that point, KMV portfolio apps including Klokd call LipaStack directly. Kipkiren Pay does not persist as a wrapper.

**What this means for Klokd's codebase:** A single environment variable change (`PAYMENT_RAIL_BASE_URL`) and potentially one DTO file update (`payment-rail.dto.ts`) if LipaStack's response field names differ from Kipkiren Pay's. Zero business logic changes. This is only possible if the client is built as `PaymentRailClient` (not `KipkirenPayClient`) from day one.

**What Klokd must NEVER do:**
- Name the payment client `KipkirenPayClient` — this name does not survive Phase 3
- Use `KIPKIREN_PAY_BASE_URL` as the environment variable name — same reason
- Hardcode any payment rail base URL anywhere in the codebase
- Write business logic that references Kipkiren Pay by name — only `PaymentRailClient` methods

**Open question for Silvia — wallet topology at Phase 3:**
When LipaStack becomes the designated payment rail, does it absorb the wallet/trust pool function currently held by Kipkiren Pay? Or does a Kipkiren Pay wallet service survive separately alongside LipaStack?

This determines whether `GET /wallets/:uuid/balance` in Phase 3 is a LipaStack call or a surviving Kipkiren Pay call. The `PaymentRailClient` needs to know. Please confirm before Sprint 3 so the client interface is designed correctly.

---

## Part F — Environment Variables Checklist for Silvia

The following environment variables must exist in Klokd's dev, staging, and production environments after this delta is implemented. Variables marked ⚠️ must never be Daraja or Africa's Talking credentials — those do not belong in Klokd's environment.

```env
# Identiti Rail
IDENTITI_BASE_URL=https://api.identiti.co.ke        # dev: sandbox URL
IDENTITI_API_KEY=<from Silvia>

# Todoku Rail
TODOKU_BASE_URL=https://api.todoku.co.ke            # dev: sandbox URL
TODOKU_API_KEY=<from Silvia>
TODOKU_TENANT_ID=klokd                              # external billed tenant

# KMV Payment Rail (Kipkiren Pay now → LipaStack at Phase 3)
PAYMENT_RAIL_BASE_URL=https://pay.kipkiren.co.ke    # Phase 3: https://api.lipastack.co.ke
PAYMENT_RAIL_API_KEY=<from Silvia>

# Hakken Rail
HAKKEN_BASE_URL=https://api.hakken.co.ke            # dev: sandbox URL
HAKKEN_API_KEY=<from Silvia>

# Klokd-owned infrastructure (unchanged)
SUPABASE_URL=<Klokd Supabase instance, eu-west-1>
SUPABASE_SERVICE_KEY=<from Klokd instance>
AWS_S3_BUCKET=klokd-documents                       # pay statements + contracts only
AWS_REGION=af-south-1
FIREBASE_CREDENTIALS=<Klokd Firebase project>

# ⚠️ The following should NOT exist in Klokd's environment:
# DARAJA_CONSUMER_KEY       → lives in Kipkiren Pay, not Klokd
# DARAJA_CONSUMER_SECRET    → lives in Kipkiren Pay, not Klokd
# AFRICASTALKING_API_KEY    → lives in Todoku, not Klokd
# WHATSAPP_API_TOKEN        → lives in Todoku, not Klokd
```

---

## Part G — Questions for Silvia

These items require Silvia's input before Sprint 3 can begin with the revised architecture:

1. **Identiti API sandbox access for Klokd** — when can Klokd's dev environment be provisioned a sandbox tenant on Identiti? Sprint 3 is blocked without this.

2. **Todoku sandbox access and tenant registration** — Klokd needs to be registered as an external billed tenant in Todoku's sandbox. When is this available?

3. **Kipkiren Pay sandbox access** — does the Kipkiren Pay sandbox support escrow and B2C payout testing? Klokd needs to test the full payout flow in sandbox before Sprint 16.

4. **Hakken entity schema** — what fields does Hakken accept for shift and worker entity registration? Klokd needs the schema before Sprint 5 (S5-NEW-01).

5. **LipaStack designation date** — when does LipaStack become the designated KMV payment rail (Phase 3)? Even an approximate quarter helps Klokd plan. The `PaymentRailClient` abstraction is already in place from day one, so the code change is trivial — but the wallet topology question (Part E open question) needs answering before Sprint 3.

6. **Wallet topology at Phase 3** — when LipaStack is designated as the payment rail, does it absorb Kipkiren Pay's wallet/trust pool function, or does a Kipkiren Pay wallet service survive alongside LipaStack? This determines whether `GET /wallets/:uuid/balance` in Phase 3 is a LipaStack call or a surviving Kipkiren Pay call.

---

*Klokd v3 Sprint Backlog Delta v1.0 · June 2026*
*From Chamia Mutuku · To Silvia Mumbua*
*Confidential · Internal — Engineering*
