# Operator Request — Todoku tenant provisioning + 8 templates for Klokd

**To:** Silvia Mumbua (CTO · Kipkiren Teknolojia · Todoku rail operator) · Communications Authority filings desk (sender-ID step)
**From:** Klokd engineering · Chamia Mutuku (CEO · Klokd Workplace Solutions Ltd) · authored 9 June 2026
**Authority:** Klokd Rails Integration Advisory v1.0 §2.3 (Todoku per-rail incl. external billed tenancy + 8 templates) + Sprint Backlog Delta v1.1 Part C1 (S3-02 OTP via Todoku) + C3 (S6-04 WhatsApp via Todoku) + S3-NEW-02 + S9-NEW-01 (template registration) + Part F (env var checklist) + Part G #2 (sandbox access) + #4 (Klokd Health KMPDC templates) + #8 (WhatsApp template approval timeline)
**Status:** 🟠 BLOCKED on operator action — **OI-03 + OI-04 + OI-08 + OI-09** of 9 open items · **the biggest of the four operator requests** · 3 sub-actions with varying lead times
**Estimated operator effort:** see breakdown below
**External lead time:** Meta WhatsApp template approval 24–72 hours + sender-ID registration 2–4 weeks regulatory (run in parallel)

---

## 0. Why third + the external-billed-tenant clarification

Todoku consumes Identiti phone tokens on every send — Identiti and KP must be provisioned first (via OPERATOR_REQUEST_IDENTITI.md + OPERATOR_REQUEST_KP.md). Within Todoku itself there are four discrete operator items:

| Sub-action | Operator effort | Lead time | Blocks |
|---|---|---|---|
| **TD-19a-klokd** Provision `klokd` tenant + secrets | ~1 day | none | All other Todoku work — start here · **OI-03** |
| **TD-19b-klokd** Review + approve 8 Klokd templates (6 core + 2 Health) | ~3–7 days (review cycles) + 24–72h Meta approval per WhatsApp template | none beyond review | Production send (sandbox send works without approval) · **OI-08 + OI-09** |
| **TD-19c-klokd** Register sender ID `Klokd` with Safaricom/Airtel + Communications Authority | ~2 hours operator filing | **2–4 weeks regulatory** | Production sends with brand name (sandbox uses default sender) |
| **Klokd as EXTERNAL BILLED tenant** classification + rate agreement | Chamia + Silvia commercial discussion | TBD | All Todoku integration economics · **OI-04** |

Sub-actions TD-19b-klokd and TD-19c-klokd run in parallel after TD-19a-klokd closes.

**Critical — tenancy classification (per advisory §2.3):**

> "Klokd is billed at Todoku's published external tenant rates. Klokd does not receive the internal bypass-billing treatment given to Kipkiren Pay, Sabaki AgriChain, and Sauti 2027. Klokd's messaging costs are a real operational line item — volume matters for unit economics."

This is an explicit Chamia decision in writing — Klokd is NOT a bypass-billing tenant despite being a KMV portfolio app. Confirm rate before Klokd dev-environment integration so unit economics modelling matches reality.

---

## 1. The ask — sub-action TD-19a-klokd (provisioning)

Provision a Klokd tenant on the Todoku rail (Supabase `vvbzoqycshcvxwczqcfh`, eu-west-1; LIVE on Railway at `https://todoku-prod-production.up.railway.app`). Mirror the existing tenant pattern (`itafika` / `kws` / `hakken_internal` / `lipastack` / `lunchdrop` already in place — TD-13 closed 21 May).

**Tenant identity:**

| Field | Value |
|---|---|
| `tenant_slug` | `klokd` |
| `tenant_name` | Klokd |
| `tenant_class` | **external-billed-consumer-app** (per advisory §2.3 — NOT bypass-billing) |
| `expected_volume_band` | medium → high (Nairobi hospitality beta: ~200 shifts/day × ~5 messages per shift = ~1000 messages/day at beta steady-state; OTP send volume separate) |
| `default_sender_id` | `Klokd` (pending TD-19c-klokd regulatory approval — see §3) |
| `fallback_sender_id` | `KlokdOTP` if separation needed for OTP class_0 messages |
| `webhook_callback_base` | TBD — Klokd Railway service URL once deployed |
| `envelope_limits` | platform-default (TD-2 enforced) — no tenant-specific overrides at MVP |
| `sandbox_mode` | true |

### 1.1 TD-19a-klokd env vars (return after provisioning)

| Env var | Value type | Notes |
|---|---|---|
| `TODOKU_BASE_URL` | URL string | Likely `https://sandbox.todoku.co.ke/v1` or sandbox-equivalent. Confirm. |
| `TODOKU_APP_ID` | UUID | The `klokd` tenant app ID. Goes in `Authorization: Todoku-HMAC-SHA256 app_id=…` header. |
| `TODOKU_APP_SECRET` | **base64**-encoded HMAC-SHA-256 key (NOT hex) | Multi-line canonical signing string: `METHOD\nPATH\nCTYPE\nTIMESTAMP\nSHA256(body)`. Returns base64 HMAC, not hex. |
| `TODOKU_WEBHOOK_SECRET` | base64 HMAC-SHA-256 key | For `X-Todoku-Signature` verification over `TIMESTAMP.NONCE.BODY` (period-delimited). |

**⚠ Important encoding gotcha:** Identiti + KP use **hex-encoded** HMAC keys; Todoku uses **base64-encoded** per the Todoku CONTRACT.md canonical signing-string spec. Klokd's env loader validates encoding shape (length 44 chars for base64 32-byte key, length 64 for hex) and throws on mismatch.

### 1.2 TD-19a-klokd informational items

1. **mTLS posture for sandbox** — same question as Identiti + KP. Todoku TD-Beta is moving operator-auth to Identiti bridge; sandbox HMAC-over-plain-TLS expected, confirm.
2. **Sandbox phone receiver** — what number / channel do sandbox messages land at? Whitelist for test worker/employer MSISDNs OR captured-message log in the Todoku TD-16 portal? Need to know where to inspect outbound SMS during Klokd tests.

---

## 2. Sub-action TD-19b-klokd — 8 templates for approval

Klokd authors the copy. Operator runs the standard TD-4 approval flow:
- Anti-phishing copy mandatory on `class_0` (OTP) per TD-4
- Anti-social-engineering copy mandatory on payment-related `class_1` per TD-4
- Tenant scope: `klokd` only
- WhatsApp templates also submitted to Meta via Todoku (24–72h Meta approval per OI-08)

**What to return after each template approves:** the assigned `template_id` as a stable ULID. Klokd code references these as constants in `octopus-api/src/modules/notification/template-ids.ts`. Initial scaffold uses `KLOKD_TEMPLATE_PLACEHOLDER_<slug>` and is replaced once Todoku returns the real ULIDs.

### 2.1 The 8 templates (advisory §2.3 + §2.5 KMPDC)

**Core (6) — Klokd hospitality:**

| # | Template slug | Class | Variables | Purpose | Anti-phishing/SE? |
|---|---|---|---|---|---|
| 1 | `klokd_otp` | class_0 | `otp_code`, `expiry_mins` | Authentication OTP (registration + step-up) | ✅ anti-phishing mandatory |
| 2 | `klokd_shift_confirmed` | class_1 | `worker_name`, `role`, `venue`, `date`, `time`, `amount_kes` | Shift confirmed by employer (worker side) | Standard class_1 |
| 3 | `klokd_shift_reminder` | class_1 | `worker_name`, `role`, `venue`, `time` | 1 hour before shift start | Standard |
| 4 | `klokd_payment_received` | class_1 | `worker_name`, `amount_kes`, `mpesa_ref` | M-Pesa payout confirmed | ✅ anti-SE (payment-related) |
| 5 | `klokd_shift_filled` | class_2 | `worker_name`, `role` | Worker's application not selected (other applicant chosen) | Standard class_2 |
| 6 | `klokd_dispute_update` | class_1 | `dispute_ref`, `status` | Dispute status change | Standard |

**Klokd Health (2) — per advisory §2.3 + §7:**

| # | Template slug | Class | Variables | Purpose | Anti-phishing/SE? |
|---|---|---|---|---|---|
| 7 | `klokdh_kmpdc_expiry_60` | class_2 | `worker_name`, `expiry_date` | 60-day KMPDC licence expiry alert (WhatsApp) | Standard |
| 8 | `klokdh_kmpdc_expiry_30` | class_2 | `worker_name`, `expiry_date`, `renewal_url` | 30-day KMPDC licence expiry alert (WhatsApp + SMS) | Standard (renewal URL is not phishing-eligible) |

All 8 templates ship in **English + Swahili** per Klokd reboot pack §10 + INSTRUCTION_PACK §8 rule 15. Klokd API selects language based on `users.language_pref` column (default `en`, toggle to `sw`).

### 2.2 Template Channel Routing

| # | Slug | SMS | WhatsApp |
|---|---|---|---|
| 1 | `klokd_otp` | ✅ Primary | (OTP via SMS only at MVP) |
| 2 | `klokd_shift_confirmed` | ✅ Fallback | ✅ Primary |
| 3 | `klokd_shift_reminder` | ✅ Fallback | ✅ Primary |
| 4 | `klokd_payment_received` | ✅ Fallback | ✅ Primary |
| 5 | `klokd_shift_filled` | ✅ Primary | (low-priority class_2) |
| 6 | `klokd_dispute_update` | ✅ Primary | (admin-driven; SMS sufficient) |
| 7 | `klokdh_kmpdc_expiry_60` | (low-urgency) | ✅ Primary |
| 8 | `klokdh_kmpdc_expiry_30` | ✅ Fallback | ✅ Primary |

WhatsApp templates need Meta approval (OI-08: 24–72h). Klokd should submit copy to Todoku ~Sprint 9 (S9-NEW-01); Todoku submits to Meta on Klokd's behalf via Todoku's WhatsApp Business Account.

---

## 3. Sub-action TD-19c-klokd — sender ID `Klokd` registration

Filing: Safaricom + Airtel sender-ID registration form (commercial) + Communications Authority of Kenya consent + DPA 2019 declaration. 2–4 week regulatory lead time.

**Requested sender IDs (in order of preference):**

1. **`Klokd`** (5 chars) — primary
2. **`KlokdOTP`** (8 chars) — specialised OTP sender if OTP separation needed
3. **`KlokdHealth`** (11 chars; check carrier limits) — fallback for Klokd Health if separate sender ID needed

**Note:** Sender ID registration is the LARGEST external clock in the entire Klokd v3 rail-migration. Per advisory: "Sprint 3 must not start before this is initiated, even if other Sprint 3 operator items are pending." File TD-19c-klokd **IMMEDIATELY** — do not wait for TD-19a-klokd or TD-19b-klokd to close.

Until TD-19c-klokd approves, sandbox sends will use the platform-default sender (whatever Todoku assigns at provision). Production sends with the `Klokd` brand name go live only after sender-ID approval.

---

## 4. Klokd-side commitments (informational)

| Item | Owner | Status |
|---|---|---|
| Template copy (EN + SW × 8 templates) | Klokd content | ✅ Template names + variables locked in advisory §2.3; copy to be drafted before Sprint 9 |
| Anti-phishing copy on class_0 OTP | Klokd content | ✅ in template 1 (`klokd_otp`) |
| Anti-social-engineering copy on payment class_1 | Klokd content | ✅ in template 4 (`klokd_payment_received`) |
| Template variable schema (per template: `vars` + types) | Klokd content | ✅ in §2.1 above |
| `notification_log` table with NO phone-number column (per delta C3 + S3-NEW-02) | Klokd notification module | Per S3-NEW-02 AC schema: `{ id, account_uuid, channel, template_id, todoku_message_id, status, sent_at, delivered_at }` |
| `i18n` language-toggle plumbing in send path | Klokd Sprint 9 | Built into client at Sprint 9 (S9-NEW-01) |
| `CommsService` class (per delta S3-NEW-02) with phone-token freshness management | Klokd Sprint 3 | NEVER cache phone_token beyond 15-min window; fresh token per send |
| `template_id` ULID constants module (placeholder→real swap) | Klokd notification module | `octopus-api/src/modules/notification/template-ids.ts` |
| Idempotency-key per send (UUIDv4) | Klokd notification module | Built in at scaffold |
| Phone-token resolution via Identiti before every send | Klokd `CommsService` | Required by Todoku TD-2 — built in at S3-NEW-02 |
| Africa's Talking direct integration REMOVED per AD-K03 + delta C1 | Klokd Sprint 3 | Existing `octopus-api/src/modules/notification/at-client.ts` (or wherever AT lives) to be dismantled |
| WhatsApp Business API direct integration REMOVED per AD-K03 + delta C3 | Klokd Sprint 6 | Existing direct WA Business API client (if any) to be dismantled |

---

## 5. How Klokd activates these once delivered

Four env vars into Railway → `klokd-octopus-api`. Klokd's env loader validates all four present + correct encoding shape (base64 for Todoku, distinct from Identiti+KP hex). Throws `RAIL_CONFIG_INCOMPLETE: todoku` or `RAIL_CONFIG_BAD_ENCODING: todoku.APP_SECRET` on mismatch.

Templates are looked up by slug via the constants module; ULIDs are swapped at code level once Todoku returns them. Until a template is approved AND its ULID is wired, sends targeting that template return `TEMPLATE_NOT_READY` deliberately (rather than silently failing).

Sender ID `Klokd` is implicit — set at tenant provisioning; per-send override only if Klokd wants the `KlokdOTP` variant for class_0 sends.

---

## 6. Cross-reference

- Klokd advisory: [`chamia new docs/klokd_rails_integration_advisory.md`](./chamia%20new%20docs/klokd_rails_integration_advisory.md) §2.3 (Todoku per-rail incl. external billed tenancy + 8 templates list) + §3.1 (worker registration OTP flow) + §3.3 step 5/6 (payout confirmation send flow)
- Klokd delta: [`chamia new docs/klokd_sprint_backlog_delta_silvia_v1.1.md`](./chamia%20new%20docs/klokd_sprint_backlog_delta_silvia_v1.1.md) C1 + C3 + S3-NEW-02 + S9-NEW-01 + Part F + Part G #2/4/8/9
- Klokd INSTRUCTION_PACK: [INSTRUCTION_PACK.md](./INSTRUCTION_PACK.md) §4 (cross-rail joints) + §6 AD-K03 + §9 (pre-flight OI-03/04/08/09)
- Todoku rail-side: `C:\Projects\todoku-prod\` · `docs/CONTRACT.md` (canonical signing string spec) · TD-13 tenant + template manifest as reference for current tenants (`itafika`, `kws`, `hakken_internal`, `lipastack`, `lunchdrop` already in place; `klokd` net-new at this request)
- Template copy patterns: see `C:\Projects\lunch drop\apps\api\src\content\templates\index.ts` for the canonical pattern of EN + SW + TD-4 guards per template

---

*Operator Request 3/4 · Todoku tenant + 8 templates + sender ID for Klokd · 9 June 2026 · Confidential · OI-03 + OI-04 + OI-08 + OI-09 · Sprint 3 + Sprint 9 + Klokd Health H3 blocker · External lead: TD-19c-klokd sender ID 2–4 weeks regulatory — FILE NOW · Depends-on: OPERATOR_REQUEST_IDENTITI.md*
