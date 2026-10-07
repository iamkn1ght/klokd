# Klokd v3 — Platform Rails Integration Advisory
## How the Klokd App and API Interact with the KMV Platform Rails

**Document version:** 1.0 · June 2026
**Prepared for:** Chamia Mutuku, CEO · Klokd Workplace Solutions Ltd
**Cc:** Silvia Mumbua, CTO · Kipkiren Teknolojia (rails owner)
**Classification:** Confidential · Internal — Engineering & Leadership
**Covers:** Klokd App (hospitality marketplace) · Klokd Health (healthcare marketplace) · Klokd v3 sprint backlog alignment
**Does not cover:** Klokd Agri · Klokd Home · AI Data Marketplace (Layer 2 products — future advisory)

---

## 0. How to Read This Document

This advisory establishes the authoritative integration specification between the Klokd v3 platform and the six KMV platform rails. It supersedes any rail-related decisions implied in the Klokd Sprint Backlog v4 where those decisions conflict with the platform rails architecture.

Read this document before Sprint 3 begins. The conflicts identified in Section 6 will change the implementation of Sprints 3, 6, and 16 if not resolved now. Reading this after those sprints are underway is significantly more expensive.

**The companion document** — *Klokd v3 Sprint Backlog Delta for Silvia Mumbua* — contains the engineering-facing corrections derived from this advisory. Silvia should read that document. This document provides the strategic rationale.

---

## 1. The Cardinal Rule — Applied to Klokd

The KMV platform cardinal rule is not a preference. It is the load-bearing constraint of the entire portfolio architecture:

> **Apps never hold customer funds. Apps never store KYC documents. Apps never run their own SMS or comms infrastructure.**

Applied specifically to Klokd, this means three things that are non-negotiable:

**1. Klokd never holds M-Pesa transaction credentials or runs a Daraja integration.**
Every payment flow — employer escrow funding, worker payout, fee deduction, auto-release — flows through Kipkiren Pay. Klokd holds payment references and shift payment state. It does not hold wallets, Daraja API keys, or trust pool balances. The reason: Klokd is not a regulated entity. Kipkiren Pay Ltd is the CBK E-Money Issuer. Financial transactions must flow through the regulated entity.

**2. Klokd never stores National ID images, biometric vectors, or KMPDC documents in its own infrastructure.**
All identity documents are stored in Identiti. Klokd holds the Account UUID (the cross-platform foreign key issued by Identiti) and the KYC tier signal. It never holds the underlying PII. The reason: DPA 2019 data minimisation — Klokd should not accumulate personal data it does not need to fulfil its product function. Identiti is the designated Data Processor for identity data.

**3. Klokd never calls Africa's Talking, WhatsApp Business API, or any SMS/messaging provider directly.**
All transactional communications — OTP delivery, shift notifications, payment confirmations, dispute updates — flow through Todoku. Klokd holds the Identiti phone token (15-minute freshness) and passes it to Todoku. It never holds the underlying M-Pesa phone number in a log, message queue, or database. The reason: Todoku implements SIMjacker payload rejection, 60%/30-day vendor diversity routing, and telecom-signalling defences from v1. Klokd inherits all of these protections for free by routing through Todoku.

**What remains legitimately Klokd-owned:**
The cardinal rule determines what Klokd delegates. Everything below is correctly Klokd-internal and does not belong in any rail:

- **ShiftEventLog** — the shift state machine (posted → confirmed → accepted → active → completed → disputed → paid)
- **Compliance Engine** — PAYE, NSSF, SHIF, AHL toggle, minimum wage gate, Section 37 monitoring, KMPDC verification (Health)
- **Contract Service** — Employment Act s.9 auto-generated contracts (sector-specific compliance, not an identity function)
- **Webhook Service** — platform-level event delivery to third-party integrations
- **Analytics Event Log** — anonymised event stream (geo_hash, not GPS; no raw PII)
- **ShiftService** — shift posting, matching logic, proximity filtering, availability checking
- **GPS clock-in logic** — 500m radius validation, offline queue, geo_hash conversion
- **Dispute flow** — dispute initiation, evidence management, admin resolution
- **KMPDC verification service** (Klokd Health) — programmatic licence verification against KMPDC/NCK public register. This is a Klokd-owned compliance layer — it sits on top of Identiti's core KYC but is separate from it. Identiti handles national identity. KMPDC licence is a sector-specific professional credential. Klokd Health owns the verification integration.

---

## 2. The Six Rails — Klokd's Relationship with Each

### 2.1 Kipkiren Pay (Payment Rail)

**Domain:** `pay.kipkiren.co.ke` · `pay.kipkiren.com`
**Legal entity:** Kipkiren Pay Ltd (subsidiary of Kipkiren Teknolojia)
**CBK status:** E-Money Issuer (pending authorisation) · KES 20M core capital · Open-loop

**What Klokd delegates to Kipkiren Pay:**

| Function | Kipkiren Pay handles | Klokd retains |
|---|---|---|
| Employer escrow funding | STK Push initiation, M-Pesa callback, trust pool crediting | Shift-to-payment reference linkage |
| Worker payout | Daraja B2C disbursement, deduction application, wallet crediting | Net amount calculation (Compliance Engine), payout trigger |
| 4% platform fee | Fee deduction at settlement | Fee rate configuration |
| Auto-release | Timer enforcement, conditional release | Timer initiation trigger on clock-out |
| KYC-tiered transaction limits | Limit enforcement at rail layer (KES 20K/transaction, KES 100K/month aggregate) | Pre-check before initiating payment |
| Worker wallet | Wallet lifecycle, balance management | Balance reference (Account UUID + wallet_id) |

**What Klokd never holds:**
- Daraja consumer key or secret
- Trust pool balance
- Raw M-Pesa transaction receipts (Klokd holds the Kipkiren Pay payment_id reference only)
- Customer wallet balance (Klokd holds a display-only balance from Kipkiren Pay's GET /wallets/:uuid)

**Key API calls from Klokd to Kipkiren Pay:**

```
POST /escrow/fund           — Initiates employer STK Push for shift escrow
GET  /escrow/:ref/status    — Polls or receives webhook on escrow funding confirmation
POST /payouts               — Initiates worker payout (Account UUID, net_amount, shift_id)
POST /payouts/:id/step-up   — Attaches Identiti step-up token for high-value payouts
GET  /wallets/:uuid/balance — Read-only balance display in Pay Tab
POST /fees/calculate        — Pre-calculates 4% fee before confirming shift (optional)
```

**The Kipkiren Pay → LipaStack transition — what Klokd must do now to be safe later:**

LipaStack is being built as an external payments platform competing at the rail level (Paystack / Pesapal equivalent). Post-launch, Kipkiren Pay will migrate onto LipaStack as a portfolio-class tenant.

From Klokd's perspective, this transition is invisible — **Klokd calls Kipkiren Pay's API surface throughout. It never calls LipaStack directly.** The LipaStack migration changes what is behind Kipkiren Pay's API, not the API itself.

However, Klokd engineers must take two steps now to make the transition non-breaking:

**Step 1 — Never hardcode Kipkiren Pay base URLs.** All Kipkiren Pay base URLs must come from environment variables (`KIPKIREN_PAY_BASE_URL`, `KIPKIREN_PAY_API_KEY`). When the LipaStack migration happens, Silvia updates the environment config. No Klokd code changes.

**Step 2 — Use typed DTOs for all Kipkiren Pay response payloads.** Map Kipkiren Pay's response fields to Klokd-internal types at the boundary. If Kipkiren Pay's response field names change during the LipaStack migration (likely), the change is localised to one DTO file, not scattered across Klokd's codebase.

```typescript
// Good — DTO at the boundary
interface KipkiPayoutResponse {
  paymentId: string;          // maps from Kipkiren Pay's payment_id or LipaStack's tx_id
  status: 'pending' | 'completed' | 'failed';
  workerAccountUuid: string;
  netAmountKes: number;
  settledAt?: string;
}

// Bad — consuming raw response fields directly in business logic
const workerPaid = response.data.payment_id && response.data.status === 'completed';
```

**Tier limits — rail layer vs Klokd layer:**

KES 20,000/transaction and KES 100,000/30-day aggregate are enforced at the Kipkiren Pay rail layer. Klokd does not need to enforce them independently — but Klokd should check the worker's current monthly aggregate before initiating a payout (via `GET /wallets/:uuid/limits`) so that the failure mode is handled gracefully in the UI (worker informed in Pay Tab) rather than discovered at payout time.

---

### 2.2 Identiti (Identity Rail)

**Domain:** `identiti.co.ke`
**Legal entity:** Identiti Ltd (entity home pending counsel)
**Rail owner:** Silvia Mumbua (CTO)

**What Klokd delegates to Identiti:**

| Function | Identiti handles | Klokd retains |
|---|---|---|
| Account UUID issuance | Creates permanent cross-platform customer identity | Stores Account UUID as primary foreign key on all Klokd tables |
| National ID verification | IPRS verification, biometric liveness check, document storage in Identiti's encrypted store | KYC tier signal (cached, refreshed on webhook) |
| KYC tier management | Tier 0 → 1 → 2 progression, tier-change webhooks | Business logic gated on tier (e.g. worker cannot apply for shifts until Tier 1) |
| Phone token issuance | Issues 15-minute freshness phone tokens for Todoku calls | Requests token immediately before each Todoku call; never stores tokens |
| Step-up authentication | OTP challenge via Todoku, step-up JWT (single-use, audience-specific, 5-min freshness) | Passes step-up JWT to Kipkiren Pay for high-value payouts |
| SIM-swap detection | Detects SIM-swap risk and flags phone token requests accordingly | Surfaces SIM-swap flag as a risk indicator (does not block autonomously) |

**What Klokd never holds:**
- National ID number (Klokd holds a masked display value only: last 4 digits)
- Biometric vectors
- National ID document images
- Raw phone numbers in logs, queues, or databases (Klokd uses Identiti phone tokens)

**The Account UUID — Klokd's foreign key:**

The Account UUID is issued by Identiti at the moment a user creates their first KMV platform account (on any platform app). If a worker already has a Chapaa account, their Identiti Account UUID already exists — Klokd discovers it via `POST /accounts/lookup` (phone token-based). If not, Klokd triggers account creation via `POST /accounts`.

Every Klokd database table that references a worker or employer uses `account_uuid` as the foreign key, not Klokd's own user ID. This is what makes the portable reputation across sector marketplaces (Klokd Health, Klokd Agri) structurally possible — the same Account UUID follows the worker.

**Key API calls from Klokd to Identiti:**

```
POST /accounts                    — Create new account (returns account_uuid)
POST /accounts/lookup             — Find existing account by phone (via phone token)
POST /kyc/documents               — Submit National ID + selfie for verification
GET  /accounts/:uuid/kyc-tier     — Get current KYC tier (cached; refreshed on webhook)
POST /tokens/phone                — Issue phone token (audience: todoku) — call before every Todoku request
POST /tokens/step-up              — Initiate step-up challenge for high-value operation
GET  /tokens/step-up/:challenge   — Poll or receive webhook on challenge completion
```

**KYC tier gates in Klokd:**

| Tier | Identiti definition | Klokd business rule |
|---|---|---|
| Tier 0 | Phone verified only | Worker can browse shifts but cannot apply. Employer cannot post shifts. |
| Tier 1 | National ID + selfie verified | Worker can apply and accept shifts. Employer can post and confirm shifts. Full platform access. |
| Tier 2 | Enhanced verification (future) | Reserved for high-value transactions above Tier 1 limits |

**Klokd Health — KMPDC extension:**

The KMPDC licence verification service is a Klokd-owned compliance layer that extends Identiti's core KYC for the healthcare sector. It is not a function of Identiti. The relationship is:

```
Identiti → Tier 1 KYC (who you are — National ID, face, phone)
Klokd Health Compliance Engine → KMPDC verification (who you are professionally — licence status, specialisation, expiry)
```

These are separate and complementary. A healthcare worker completing Klokd Health onboarding triggers both:
1. Identiti account creation + National ID verification (same as any Klokd user)
2. KMPDC licence submission → Klokd Health's own verification service queries KMPDC/NCK register

The KMPDC verification result is stored in Klokd Health's own database (`kmpdc_verifications` table), not in Identiti. Identiti has no awareness of KMPDC. The clock-in KMPDC gate is enforced by Klokd's Compliance Engine, not by Identiti's step-up mechanism.

---

### 2.3 Todoku (Communications Rail)

**Domain:** `todoku.co.ke`
**Legal entity:** Todoku Communications Ltd (incorporated)
**Klokd tenancy classification:** External billed tenant

**Klokd's tenancy classification means:**
- Klokd is billed at Todoku's published external tenant rates
- Klokd does not receive the internal bypass-billing treatment given to Kipkiren Pay, Sabaki AgriChain, and Sauti 2027
- Klokd's messaging costs are a real operational line item — volume matters for unit economics

**What Klokd delegates to Todoku:**

| Message type | Todoku handles | Klokd provides |
|---|---|---|
| OTP delivery | SMS/WhatsApp delivery, retry, DLT routing | Phone token (from Identiti), OTP value, expiry |
| Shift notifications | WhatsApp template delivery, FCM fallback coordination | Phone token, template ID, template variables |
| Payment confirmations | WhatsApp message delivery | Phone token, payment amount, M-Pesa reference |
| Dispute updates | SMS delivery | Phone token, dispute reference, status |
| KMPDC expiry alerts (Health) | SMS/WhatsApp delivery | Phone token, expiry date, renewal link |

**FCM push notifications — NOT Todoku:**
FCM (Firebase Cloud Messaging) push notifications remain a direct Klokd integration. Todoku handles SMS, Voice, and WhatsApp — it does not handle mobile push notifications. Klokd maintains its own Firebase project and calls FCM directly for in-app push. Todoku is the fallback channel (WhatsApp at 5 min) when push is not acknowledged.

**The phone token flow — critical:**

Klokd must never store phone numbers in any log, message queue, S3 object, or database field. Every Todoku call requires a fresh Identiti phone token (15-minute freshness window):

```
1. Klokd needs to send worker a payment confirmation
2. Klokd calls Identiti: POST /tokens/phone (audience: todoku, account_uuid: worker)
3. Identiti returns phone_token (15-min expiry, single audience)
4. Klokd calls Todoku: POST /messages/send (phone_token, template_id, variables)
5. Todoku resolves phone number from token internally, delivers message
6. Todoku webhook: MESSAGE_DELIVERED or MESSAGE_FAILED
```

The phone_token must not be cached beyond the 15-minute freshness window. If a batch of notifications is being sent (e.g., all workers notified of a shift being filled), Klokd requests a fresh token per worker per send operation.

**Notification templates Klokd must register with Todoku:**

| Template ID | Channel | Variables | Trigger |
|---|---|---|---|
| `klokd_shift_confirmed` | WhatsApp + SMS | worker_name, role, venue, date, time, amount_kes | Shift confirmed by employer |
| `klokd_shift_reminder` | WhatsApp | worker_name, role, venue, time | 1 hour before shift start |
| `klokd_payment_received` | WhatsApp + SMS | worker_name, amount_kes, mpesa_ref | M-Pesa payout confirmed |
| `klokd_shift_filled` | SMS | worker_name, role | Worker's application not selected |
| `klokd_dispute_update` | SMS | dispute_ref, status | Dispute status change |
| `klokd_otp` | SMS | otp_code, expiry_mins | Authentication OTP |
| `klokdh_kmpdc_expiry_60` | WhatsApp | worker_name, expiry_date | 60-day KMPDC expiry alert (Health) |
| `klokdh_kmpdc_expiry_30` | WhatsApp + SMS | worker_name, expiry_date, renewal_url | 30-day KMPDC expiry alert (Health) |

All WhatsApp templates must be approved by Meta via Todoku's WhatsApp Business Account before use. Todoku manages the approval process — Klokd submits template content to Todoku; Todoku submits to Meta.

---

### 2.4 Hakken (Discovery Rail) — v1 Pilot

**Domain:** `hakken.co.ke`
**Rail owner:** Silvia Mumbua (CTO)
**Klokd pilot scope:** Two-sided discovery — confirmed v1 pilot alongside Lunch Drop

Hakken is a geo-indexed discovery service. It consolidates the duplicated discovery primitives that would otherwise be built independently in every portfolio marketplace app. For Klokd, two surfaces migrate to Hakken:

**Surface 1 — Worker-side shift discovery (replaces `GET /shifts/available`)**

Currently planned as a Klokd-internal endpoint (S4-05 in the sprint backlog) that returns proximity-sorted shifts. At Hakken integration (Phase 3, Sprint H-equivalent), this surface is served by Hakken's discovery index. Klokd registers shift entities with Hakken when shifts are posted; Hakken returns the ranked, geo-filtered shift feed when workers query.

What Hakken provides: geo-indexing, proximity ranking, role filtering, freshness scoring.
What Klokd retains: shift state (only `posted` and `confirmed` shifts are Hakken-indexed; Hakken is never the source of truth for shift status — ShiftEventLog is).

**Surface 2 — Employer-side worker discovery (replaces manual sort in `GET /shifts/:id/applicants`)**

Currently planned as Klokd-internal proximity/rating sort. At Hakken integration, worker ranking for a given shift is served by Hakken's ranking engine. Klokd registers verified worker entities with Hakken (specialisation, geo-location, availability signal); Hakken returns a ranked worker list per shift context.

What Hakken provides: multi-signal ranking (proximity, rating, show-up rate, availability, specialisation match).
What Klokd retains: final worker card data assembly (Klokd adds KMPDC badge, compliance flags, and shift-specific context to the Hakken-ranked list).

**Hakken integration timing:**

Hakken is not Phase 1 infrastructure for Klokd. The MVP shift feed (`GET /shifts/available`) is built as a Klokd-internal endpoint in Sprint 4 and remains so through Phase 3. Hakken integration is scoped for Phase 3 (Worker App MVP, Sprint 8+) — when the shift feed is user-facing and performance/ranking quality matters.

Sprint 4 (S4-05) must be architecturally designed to swap the data source without changing the API contract. The endpoint shape stays the same; only the resolver changes from Klokd-internal to Hakken-backed.

**What Klokd registers with Hakken:**

```
POST /hakken/entities/shifts      — Register shift entity when posted
PATCH /hakken/entities/shifts/:id — Update shift status (filled, expired)
POST /hakken/entities/workers     — Register worker entity when verified
PATCH /hakken/entities/workers/:id — Update availability signal, rating
```

**What Klokd queries from Hakken:**

```
GET /hakken/discovery/shifts      — Worker-side shift feed (geo_hash, role filter, limit)
GET /hakken/discovery/workers     — Employer-side worker ranking (shift_id, context)
```

---

### 2.5 Helpan AI (Agent Rail) — Deferred

**Domain:** `helpan.ai`
**Rail owner:** Silvia Mumbua (CTO)
**Klokd Phase 1 status:** Deferred — not in v3 sprint backlog

Helpan AI is the agent orchestration rail — agent runtime, delegated authority, briefing management, agent-to-rail dispatch. There is no Klokd-specific agent in Phase 1.

**Architecture note for Silvia:**
Do not build any matching or recommendation logic in the Klokd Layer 1 API that would conflict with a future Helpan Klokd agent. Specifically:

- The shift recommendation algorithm (future) should be designed as an agent briefing consumed by Helpan AI, not as an embedded algorithm in ShiftService
- The worker scoring model (future) should expose a clean interface that Helpan AI can call, not be embedded in the matching endpoint

**Phase 2 Helpan Klokd candidates:**
- Worker shift optimisation agent: suggests shifts based on worker's earnings history, location, and skill profile
- Employer demand forecasting agent: predicts staffing needs based on historical shift patterns
- Dispute resolution assistant: pre-screens disputes and prepares resolution recommendations for admin

---

### 2.6 Itafika (Logistics Rail) — Not Applicable

**Status:** Not applicable to Klokd core marketplace

Workers commute independently to their shifts. Klokd's GPS clock-in confirms arrival but does not coordinate transport. Itafika is not in Klokd's integration scope.

**Potential future relevance:** Klokd Agri (equipment transport for tractor/cold storage sessions) and Klokd Home (elder care worker transport in some configurations) may consume Itafika in Year 2. This advisory will be updated when those products are scoped.

---

## 3. Cross-Rail Flows — Full Sequence Diagrams

### 3.1 Worker Registration and Verification Flow

```
Worker opens Klokd app for the first time
        │
        ▼
[1] Klokd → Identiti: POST /accounts (phone number)
    Identiti returns: account_uuid, status: phone_pending
        │
        ▼
[2] Klokd → Identiti: POST /tokens/phone (account_uuid, audience: todoku)
    Identiti returns: phone_token (15-min freshness)
        │
        ▼
[3] Klokd → Todoku: POST /otp/send (phone_token, template: klokd_otp)
    Worker receives OTP on handset
        │
        ▼
[4] Worker enters OTP in Klokd app
    Klokd → Identiti: POST /accounts/verify-otp (account_uuid, otp)
    Identiti returns: status: active, KYC tier: 0
        │
        ▼
[5] Worker submits National ID (front + back) + selfie
    Klokd → Identiti: POST /kyc/documents (account_uuid, id_front, id_back, selfie)
    Identiti stores documents, initiates IPRS verification
    Identiti returns: verification_id, status: pending
    [Identiti webhook later]: KYC_TIER_CHANGED (tier: 0 → 1)
        │
        ▼
[6] Klokd → Kipkiren Pay: POST /wallets (account_uuid, type: worker)
    Kipkiren Pay creates wallet, returns wallet_id
        │
        ▼
[7] Klokd stores in its own database:
    workers { account_uuid, wallet_id, kyc_tier: 1, verification_status: approved }
    National ID number is NOT stored (masked display value only: last 4 digits)
        │
        ▼
[8] Klokd → Hakken: POST /entities/workers (account_uuid, geo_hash, specialisations, availability)
    Hakken indexes worker entity for discovery
        │
        ▼
Worker profile complete. Can browse and apply for shifts.
```

### 3.2 Employer Escrow Funding Flow

```
Employer confirms shift selection (worker selected)
        │
        ▼
[1] Klokd validates employer's Kipkiren Pay wallet balance covers shift amount + 4% fee
    Klokd → Kipkiren Pay: GET /wallets/:uuid/balance
        │
        ▼
[2] If balance insufficient: Klokd initiates STK Push top-up
    Klokd → Kipkiren Pay: POST /wallets/:uuid/topup (amount, phone_token)
    Kipkiren Pay → Daraja: STK Push
    Employer approves on handset
    [Kipkiren Pay webhook]: WALLET_CREDITED
        │
        ▼
[3] Klokd initiates escrow funding
    Klokd → Kipkiren Pay: POST /escrow/fund
      { shift_id, employer_account_uuid, amount_gross, fee_rate: 0.04,
        worker_account_uuid, idempotency_key }
    Kipkiren Pay ringfences amount in trust pool
    Kipkiren Pay returns: escrow_ref, status: funded
        │
        ▼
[4] Klokd stores: shift_payments { shift_id, escrow_ref, status: funded, funded_at }
    ShiftEventLog: confirmed → accepted (escrow confirmed)
        │
        ▼
Shift proceeds. Clock-in permitted.
```

### 3.3 Worker Payout Flow (App Integration Guide §6.4 — Klokd-specific)

```
Shift clock-out confirmed by employer
        │
        ▼
[1] Klokd Compliance Engine calculates net payout:
    gross_amount
    - paye_deduction (PAYE at applicable band)
    - nssf_tier1 + nssf_tier2 (monthly aggregate)
    - shif_deduction (2.75% monthly aggregate)
    = net_amount_kes
    Compliance Engine returns: deduction_record { gross, paye, nssf, shif, net }
        │
        ▼
[2] Klokd checks Kipkiren Pay tier limits for worker
    Klokd → Kipkiren Pay: GET /wallets/:uuid/limits
    If net_amount exceeds single-transaction limit: step-up required
        │
        ▼
[3a] If step-up required:
    Klokd → Identiti: POST /tokens/step-up (account_uuid: worker, operation: payout)
    Identiti → Todoku: OTP challenge (phone_token, template: klokd_otp)
    Worker approves on handset
    Identiti returns: step_up_jwt (single-use, audience: kipkiren_pay, 5-min freshness)
        │
        ▼
[3b] Klokd initiates payout
    Klokd → Kipkiren Pay: POST /payouts
      { worker_account_uuid, net_amount_kes, shift_id, escrow_ref,
        fee_amount, step_up_jwt (if applicable), idempotency_key }
    Kipkiren Pay debits escrow, credits worker wallet, credits platform fee wallet
    Kipkiren Pay → Daraja: B2C disbursement to worker M-Pesa
    [Kipkiren Pay webhook]: PAYOUT_COMPLETED { payment_id, settled_at, mpesa_ref }
        │
        ▼
[4] Klokd stores:
    payments { payment_id, shift_id, gross, paye, nssf, shif, net, mpesa_ref, settled_at }
    deduction_records { shift_id, account_uuid, paye, nssf, shif, period }
    ShiftEventLog: completed → paid
        │
        ▼
[5] Klokd → Identiti: POST /tokens/phone (account_uuid: worker, audience: todoku)
    Identiti returns: phone_token (15-min freshness)
        │
        ▼
[6] Klokd → Todoku: POST /messages/send
      { phone_token, template_id: klokd_payment_received,
        variables: { worker_name, amount_kes: net, mpesa_ref } }
    [Todoku webhook]: MESSAGE_DELIVERED
        │
        ▼
Worker sees Payment Confirmed screen.
Net amount displayed. Deduction breakdown shown.
Pay statement PDF generated. (Stored in Klokd's own S3 — this is acceptable,
as pay statements are financial records, not KYC documents.)
```

---

## 4. The Shift Discovery Flow — Klokd + Hakken

### Phase 1 (Sprint 4 — before Hakken integration): Internal sort

```
Worker requests shift feed
        │
        ▼
Klokd GET /shifts/available
  { geo_hash, role_filter, radius_km: 5 }
        │
        ▼
Klokd queries own shifts table:
  WHERE status = 'posted'
  AND role = role_filter
  AND distance(geo_hash, shift_geo_hash) < radius_km
  ORDER BY distance ASC
        │
        ▼
Returns ranked shift list (Klokd-internal sort)
```

### Phase 3 (Sprint 8+ — after Hakken integration): Hakken-backed

```
Worker requests shift feed
        │
        ▼
Klokd → Hakken: GET /discovery/shifts
  { requester_uuid: worker_account_uuid, geo_hash, role_filter, limit: 20 }
        │
        ▼
Hakken returns: ranked_shifts[] { shift_entity_id, rank_score, distance_km }
        │
        ▼
Klokd resolves full shift data from own ShiftService
  (shift status confirmed from ShiftEventLog, not from Hakken)
        │
        ▼
Returns shift feed (Hakken-ranked, Klokd-state-verified)
```

**Critical:** Hakken is never the source of truth for shift status. ShiftEventLog is. A shift in Hakken's index may have been filled (status: confirmed) since it was last indexed. Klokd always cross-references Hakken results against its own ShiftEventLog before returning them to the worker.

---

## 5. Klokd's Rail Integration Architecture (Summary Diagram)

```
┌─────────────────────────────────────────────────────────┐
│                    KLOKD LAYER 2                         │
│        Worker App          Employer App                  │
│        (React Native)      (React Native)                │
└────────────────────┬───────────────────┬─────────────────┘
                     │                   │
                     ▼                   ▼
┌─────────────────────────────────────────────────────────┐
│                    KLOKD LAYER 1 API                     │
│  ShiftService  │  ComplianceEngine  │  ContractService   │
│  ShiftEventLog │  WebhookService    │  AnalyticsLog      │
│  GPS Clock-in  │  DisputeFlow       │  (KMPDC — Health)  │
└───┬────────┬────────────┬────────────────────────┬───────┘
    │        │            │                        │
    ▼        ▼            ▼                        ▼
┌───────┐ ┌──────────┐ ┌───────┐              ┌────────┐
│IDENTITI│ │KIPKIREN  │ │TODOKU │              │HAKKEN  │
│       │ │PAY       │ │       │              │        │
│Account│ │Escrow    │ │SMS    │              │Shift   │
│UUID   │ │Payouts   │ │WA     │              │Worker  │
│KYC    │ │Fees      │ │OTP    │              │Ranking │
│Tokens │ │Limits    │ │       │              │Index   │
└───────┘ └──────────┘ └───────┘              └────────┘
               │
               ▼
         ┌──────────┐
         │LIPASTACK │ ← Post-launch migration (internal to Kipkiren Pay)
         │(future)  │   Klokd never calls LipaStack directly
         └──────────┘
```

---

## 6. Sprint Backlog Conflicts — What Needs to Change

The Klokd v4 sprint backlog was designed before the App Integration Guide was finalised. Three sprint stories conflict with the cardinal rule. The following changes are required.

### Conflict 1 — S3-02: Authentication via Africa's Talking

**Current story:** "Implement JWT authentication with OTP registration via Africa's Talking"

**The conflict:** Africa's Talking is a direct comms provider. Calling it directly violates the cardinal rule (apps never run their own SMS infrastructure). All OTP delivery must route through Todoku.

**Required change:** See Sprint Backlog Delta §C1 for the revised story.

### Conflict 2 — S3-03: Identity Service with Klokd-owned S3 storage

**Current story:** "Build Identity Service — National ID upload, encryption, and selfie liveness. ID images encrypted in S3"

**The conflict:** Klokd is not the designated Data Processor for identity documents. Storing National ID images and biometric data in Klokd's own S3 violates both the cardinal rule and the DPA 2019 data minimisation principle. All identity documents go to Identiti. Klokd stores Account UUID + KYC tier only.

**Required change:** See Sprint Backlog Delta §C2 for the revised story. Note that this is a significant scope change — Klokd's own S3 is still used for pay statements and contracts (legitimate Klokd documents), but not for identity.

### Conflict 3 — S6-04: WhatsApp Business API direct integration

**Current story:** "Implement FCM notifications with WhatsApp Business API fallback"

**The conflict:** WhatsApp Business API must not be called directly by Klokd. WhatsApp fallback routes through Todoku. FCM push is a direct integration and is correct — Todoku does not handle push.

**Required change:** See Sprint Backlog Delta §C3. FCM stays direct. WhatsApp fallback is re-architected as a Todoku call (phone_token + template_id).

### Conflict 4 — S16-01: Daraja B2C direct integration

**Current story:** "Build Daraja B2C production integration with full error handling. Production consumer key and secret configured."

**The conflict:** Klokd is not a regulated financial entity. Holding Daraja credentials and calling Daraja directly violates the cardinal rule. Daraja is called by Kipkiren Pay on Klokd's behalf.

**Required change:** See Sprint Backlog Delta §C4. This is the most significant change — Sprint 16's Payment Service becomes a Kipkiren Pay integration, not a Daraja integration.

### New stories required (not currently in backlog)

| Story ID | Sprint | Description |
|---|---|---|
| S3-NEW-01 | Sprint 3 | Integrate Identiti SDK — Account UUID issuance, KYC tier polling, phone token requests |
| S3-NEW-02 | Sprint 3 | Integrate Todoku client — OTP delivery, notification dispatch, phone token handling |
| S3-NEW-03 | Sprint 3 | Integrate Kipkiren Pay client — wallet creation, balance queries, environment-variable base URLs |
| S4-NEW-01 | Sprint 4 | Kipkiren Pay wallet creation on worker/employer onboarding |
| S5-NEW-01 | Sprint 5 | Hakken shift entity registration on shift post/fill/expire |
| S8-NEW-01 | Sprint 8 | Hakken worker entity registration on verification approval |
| S9-NEW-01 | Sprint 9 | Todoku template registration — all 8 Klokd notification templates |

---

## 7. Klokd Health — Rail Integration Extensions

Klokd Health adds one new compliance layer (KMPDC verification) and one new Todoku template set. Everything else is inherited from the core Klokd integration without modification.

### KMPDC verification — Klokd-owned, not Identiti

As established in Section 2.2, KMPDC verification is a Klokd-owned compliance function. The database table is in Klokd Health's schema:

```sql
CREATE TABLE kmpdc_verifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_uuid  UUID NOT NULL REFERENCES accounts(account_uuid),
  licence_number VARCHAR(50) NOT NULL,
  registration_body VARCHAR(20) NOT NULL, -- 'NCK' | 'KMPDC'
  verified_name VARCHAR(200),
  status        VARCHAR(20) NOT NULL, -- 'valid' | 'expired' | 'suspended' | 'not_found'
  specialisations JSONB,
  expiry_date   DATE,
  last_verified_at TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

This table lives in Klokd's own database (Supabase, eu-west-1). It does not touch Identiti. Identiti stores national identity. KMPDC stores professional licence. They are separate.

### Additional Todoku templates for Klokd Health

The two KMPDC expiry templates (`klokdh_kmpdc_expiry_60` and `klokdh_kmpdc_expiry_30`) listed in Section 2.3 must be registered with Todoku and approved by Meta before Klokd Health beta. These must be submitted to Todoku as part of the Klokd Health Phase H1 work — specifically Sprint H3.

---

## 8. Open Items — Requiring Resolution Before Build

| # | Item | Owner | Deadline | Blocks |
|---|---|---|---|---|
| OI-01 | Identiti API access in Klokd dev environment confirmed | Silvia | Before Sprint 3 | S3-NEW-01 |
| OI-02 | Kipkiren Pay API access in Klokd dev environment confirmed | Silvia | Before Sprint 3 | S3-NEW-03 |
| OI-03 | Todoku API access in Klokd dev environment confirmed | Silvia | Before Sprint 3 | S3-NEW-02 |
| OI-04 | Klokd tenant registration in Todoku (external billed tenant confirmed, rate agreed) | Chamia + Silvia | Before Sprint 3 | All Todoku integration |
| OI-05 | Hakken shift and worker entity schemas confirmed with Hakken team | Silvia | Before Sprint 5 | S5-NEW-01 |
| OI-06 | Kipkiren Pay production access timeline confirmed | Chamia | Before Sprint 16 | S16 (revised) |
| OI-07 | LipaStack migration target date communicated to Klokd integration team | Silvia | When known | DTO design in S16 |
| OI-08 | Todoku WhatsApp template submission timeline for Klokd's 6 templates | Silvia | Before Sprint 9 | S9-NEW-01 |
| OI-09 | Klokd Health Todoku template submission (2 KMPDC expiry templates) | Silvia | Before Sprint H3 | Klokd Health beta |

---

## 9. Architecture Decisions Locked by This Advisory

These decisions are locked as of this advisory. Any change requires explicit sign-off from Chamia and Silvia.

| # | Decision | Rationale |
|---|---|---|
| AD-K01 | Klokd never calls Daraja directly — all payments via Kipkiren Pay | Cardinal rule; CBK regulatory boundary |
| AD-K02 | Klokd never stores National ID documents or biometrics — all identity via Identiti | Cardinal rule; DPA 2019 data minimisation |
| AD-K03 | Klokd never calls Africa's Talking or WhatsApp Business API directly — all comms via Todoku | Cardinal rule; SIMjacker/telecom-signalling protection inherited from Todoku |
| AD-K04 | Klokd's pay statements and contracts are stored in Klokd's own S3 — not in Identiti | Legitimate Klokd documents; not KYC documents; 7-year retention under Employment Act |
| AD-K05 | FCM push notifications remain a direct Klokd integration — Todoku is the fallback, not the primary | Todoku does not handle mobile push; FCM is direct by design |
| AD-K06 | Kipkiren Pay base URLs come from environment variables only — never hardcoded | LipaStack migration must be a config change, not a code change |
| AD-K07 | Typed DTOs on all Kipkiren Pay response boundaries | LipaStack migration localised to DTO layer if response fields change |
| AD-K08 | KMPDC verification is a Klokd Health-owned compliance layer — not an Identiti function | KMPDC is professional licence, not national identity; separate concerns |
| AD-K09 | Hakken is the backing data source for shift feed and worker ranking from Phase 3 | Sprint 4 internal sort is a temporary implementation — design for swappable resolver |
| AD-K10 | Account UUID (from Identiti) is the primary foreign key on all Klokd worker and employer tables | Enables portable reputation across Klokd Health, Klokd Agri, Klokd Home |

---

*Klokd v3 · Rails Integration Advisory v1.0 · June 2026*
*Klokd Workplace Solutions Ltd · Kipkiren Teknolojia*
*Confidential · Internal — Engineering & Leadership*
