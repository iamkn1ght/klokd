# Operator Request — Payment Rail (Kipkiren Pay → LipaStack) app registration for Klokd

**To:** Silvia Mumbua (CTO · Kipkiren Teknolojia · KP rail operator)
**From:** Klokd engineering · Chamia Mutuku (CEO · Klokd Workplace Solutions Ltd) · authored 9 June 2026
**Authority:** Klokd Rails Integration Advisory v1.0 (June 2026) §2.1 + §3.2 + §3.3 + Sprint Backlog Delta v1.1 Part C4 + S3-NEW-03 + S4-NEW-01 + Part E (Kipkiren Pay → LipaStack transition) + Part F (env var checklist) + Part G (questions 3, 5, 6)
**Status:** 🟠 BLOCKED on operator action — **OI-02** of 9 open items · sequenced AFTER OPERATOR_REQUEST_IDENTITI.md (`account_uuid` upstream dependency)
**Estimated operator effort:** 1–2 hours
**External lead time:** none for sandbox; **OI-06** Kipkiren Pay production access timeline (CBK gate) for Sprint 16

---

## 0. Why second + the critical naming decision

KP wallet creation (S4-NEW-01) needs `account_uuid` upstream from Identiti — so KP is sequenced after Identiti.

**CRITICAL — payment rail naming (per AD-K06 + advisory Part E):**

This is NOT "OPERATOR_REQUEST_KIPKIRENPAY.md" deliberately. The payment rail is **`PaymentRailClient`** (not `KipkirenPayClient`). The env vars are **`PAYMENT_RAIL_*`** (not `KIPKIREN_PAY_*`). Reason: LipaStack will transcend Kipkiren Pay at Phase 3 — Klokd code must survive that transition with only an env-var change.

| Phase | Designated payment rail | Klokd's `PAYMENT_RAIL_BASE_URL` points to |
|---|---|---|
| Phase 1 — now | Kipkiren Pay sandbox (CBK E-Money Issuer pending authorisation) | `https://sandbox.pay.kipkiren.co.ke/v1` |
| Phase 2 — LipaStack live, Kipkiren Pay migrating | Transition (Klokd unchanged) | `https://api.kipkiren.co.ke/v1` |
| Phase 3 — Kipkiren Pay transcended | LipaStack (designated KMV payment rail) | `https://api.lipastack.co.ke` |

What "transcended" means (advisory Part E): LipaStack is NOT built under Kipkiren Pay. It is a separate external payments platform competing with Paystack and Pesapal. When LipaStack matures, Kipkiren Pay as a standalone internal rail becomes redundant — LipaStack is the more capable, externally-validated payment infrastructure. At that point, KMV portfolio apps including Klokd call LipaStack directly. Kipkiren Pay does not persist as a wrapper.

---

## 1. The ask — sandbox app registration

Provision a Klokd consuming-app registration on the Kipkiren Pay sandbox (Supabase `qzbnhsnyquqioyzoyhwu`, eu-west-1; Daraja sandbox active). Same shape as the Chapaa-SME / family-discovery / `lunchdrop_sandbox` / `itafika_sandbox` registrations.

**App identity:**

| Field | Value |
|---|---|
| `app_slug` | `klokd_sandbox` |
| `app_name` | Klokd |
| `legal_entity` | Klokd Workplace Solutions Ltd (formerly under KMV parent — restructure per June 2026 advisory; confirm KP records updated) |
| `category` | casual-labour-marketplace (Klokd holds payment references and shift payment state; KP holds wallets, trust pool, Daraja keys) |
| `expected_volume_band` | medium → high (50 employers + 200 workers Nairobi hospitality beta; ~200 shifts/day at beta steady-state) |
| `audience_posture` | B2C (workers receive payouts) + B2B (employers fund escrow) |
| `webhook_callback_base` | TBD — Klokd Railway service URL once deployed |
| `sandbox_mode` | true |

**Sibling app `klokdh_sandbox` for Klokd Health** — same pattern; healthcare worker payouts are economically identical to hospitality worker payouts.

---

## 2. The 4 env vars + informational items

### 2.1 Env vars (Klokd Railway service env) — `PAYMENT_RAIL_*` naming

| Env var | Value type | Notes |
|---|---|---|
| `PAYMENT_RAIL_BASE_URL` | URL string | Phase 1: `https://sandbox.pay.kipkiren.co.ke/v1`. Phase 3: `https://api.lipastack.co.ke`. Confirm exact host. NEVER hardcoded in Klokd code (AD-K06). |
| `PAYMENT_RAIL_APP_ID` | UUID | App registration UUID. |
| `PAYMENT_RAIL_APP_SECRET` | HEX HMAC-SHA-256 (64 chars) | For `POST /v1/auth/token`. Canonical signing string: `{app_id}\n{timestamp}\n{nonce}\n{sorted_scopes}`. |
| `PAYMENT_RAIL_WEBHOOK_SECRET` | HEX HMAC-SHA-256 (64 chars) | For verifying `X-Kipkiren-Signature` on inbound webhooks (`ESCROW_FUNDED`, `PAYOUT_COMPLETED`, `PAYOUT_FAILED`, `WALLET_CREDITED`). |

### 2.2 Informational items (code constants, not env vars)

1. **KP corporate `account_uuid` for Klokd** — the `from_corporate_account_uuid` for B2C worker payouts comes out of this. Goes in code as a constant in `octopus-api/src/modules/payment/payment-rail.constants.ts`. Replace placeholder zeros before Sprint 16.

2. **4% platform fee rate** — Klokd configures the fee rate; KP enforces the deduction at settlement (per advisory §2.1 escrow table). Stored in Klokd's `payment_fee_config` table (D-17: never hardcoded).

3. **Granted scopes** — minimum set Klokd needs at MVP:
   - `kp.wallets.write` — `POST /v1/wallets` (S4-NEW-01: create wallet on worker/employer onboarding)
   - `kp.wallets.read` — `GET /v1/wallets/:uuid/balance` + `GET /v1/wallets/:uuid/limits` (Pay Tab display + pre-payout tier check)
   - `kp.escrow.write` — `POST /v1/escrow/fund` (employer escrow funding on shift confirmation) + `POST /v1/escrow/:ref/release` (clock-out release) + `POST /v1/escrow/:ref/reverse` (dispute refund)
   - `kp.escrow.read` — `GET /v1/escrow/:ref/status` (poll if webhook missed)
   - `kp.payouts.write` — `POST /v1/payouts` (B2C worker payout on clock-out per §3.3 of advisory)
   - `kp.payouts.read` — `GET /v1/payouts/:id` (poll status)
   - `kp.charges.write` — `POST /v1/charges/initiate` (4% platform fee deduction at settlement)
   - `kp.statements.read` — `POST /v1/accounts/:uuid/statements/export` + `GET /v1/exports/:id` (monthly reconciliation + worker pay history)

4. **Step-up token policy** (per delta C4 + advisory §3.3 step 3a) — KP returns `403 auth_stepup_required` for high-value operations. Klokd preemptively attaches `X-Stepup-Token` (Identiti-issued via OPERATOR_REQUEST_IDENTITI.md §7). Proposed thresholds — please confirm or correct:

   | Operation | Step-up required? | Threshold |
   |---|---|---|
   | `POST /v1/escrow/fund` (employer funding) | No | system-actor; STK push initiated by employer's own confirmation |
   | `POST /v1/escrow/release` (clock-out release ≤ 4hr auto-release) | No | system-actor; Klokd validates clock-out |
   | `POST /v1/payouts` (worker B2C ≤ KES 5,000) | No | — |
   | `POST /v1/payouts` (worker B2C > KES 5,000 single) | **Yes** | Always |
   | `POST /v1/payouts` cumulative (24h) > KES 25,000 | **Yes** | Always |
   | `POST /v1/charges/initiate` (4% fee deduction at settlement) | No | system-actor; deducted by KP at payout settlement |
   | `POST /v1/escrow/reverse` (dispute refund) | **Yes** | Always — admin action; admin step-up required |
   | `POST /v1/accounts/:uuid/statements/export` | No | read-only |
   | `GET /v1/wallets/:uuid/limits` | No | read-only |

5. **mTLS posture for sandbox** — same question as Identiti. HMAC-over-plain-TLS preferred for sandbox; if mTLS also required, issue client cert + key per consumer app.

6. **Webhook callback URL slot** — Klokd will expose `POST /webhooks/payment-rail/escrow-events`, `/payout-events`, `/charge-events`, `/wallet-events` routes. Webhook receiver routes will be wired in Sprint 3 (S3-NEW-03 client) + tested in Sprint 16 (C4). Operator just needs the base URL `https://klokd-octopus-api.<railway>.app/webhooks/payment-rail/` registered against the app.

---

## 3. Wallet topology question for Silvia (delta Part G #6)

**Open question that affects `PaymentRailClient` interface design — needs answer before Sprint 3 starts.**

When LipaStack is designated as the payment rail at Phase 3:
- (a) Does LipaStack ABSORB Kipkiren Pay's wallet/trust pool function — making `GET /wallets/:uuid/balance` a LipaStack call?
- (b) Does a Kipkiren Pay wallet service SURVIVE alongside LipaStack — making `GET /wallets/:uuid/balance` a surviving Kipkiren Pay call separately from `PAYMENT_RAIL_BASE_URL`?

If (b), Klokd needs a separate `KIPKIREN_WALLET_BASE_URL` env var for the wallet surface even when `PAYMENT_RAIL_BASE_URL` points at LipaStack. **The `PaymentRailClient` interface design changes depending on the answer.**

Please answer before Sprint 3 begins so the client is designed correctly.

---

## 4. Klokd-side commitments (informational)

| Item | Owner | Status |
|---|---|---|
| `PaymentRailClient` class (NOT `KipkirenPayClient`) per AD-K06 | Klokd S3-NEW-03 | Code-ready after OI-02 lands; built per advisory delta |
| Typed DTOs in `payment-rail.dto.ts` at the boundary per AD-K07 | Klokd S3-NEW-03 | Comment in file: `// Phase 1: Kipkiren Pay. Phase 3: LipaStack when KP transcended. Update PAYMENT_RAIL_BASE_URL in env. This file absorbs any field name changes.` |
| KES minor units enforcement on every payment-rail call | Klokd payment module | Built into client at scaffold |
| Idempotency key (UUIDv4) on every `POST` | Klokd payment module | Per Reboot Pack v1.3 §13 — built in at scaffold |
| `actor` + `initiated_by` claim propagation (§A.2) | Klokd payment module | Built in at scaffold |
| `traceparent` + `business_op_id` on every audit row (§A.11) | Klokd payment module | `shift_id` for shift-flow · `escrow_ref` for escrow lifecycle · `payment_id` for payouts |
| Daraja credentials REMOVED from Klokd env + codebase at Sprint 16 (C4) | Klokd Sprint 16 | Existing `octopus-api/src/modules/payment/` to be dismantled (Daraja B2C client code, callback endpoint, etc.) |
| Daraja callback endpoint REMOVED from Klokd API per C4 | Klokd Sprint 16 | KP handles Daraja callbacks; Klokd receives KP webhooks instead |
| Payment Service isolated from Shift Service per D-15 | Klokd architecture | Preserved — a failed payment never corrupts a shift |
| Compliance Engine deductions (PAYE + NSSF + SHIF) calculated in Klokd, applied at KP payout (per delta S16-03 minor) | Klokd Compliance Engine (D-16) | Net amount calculated in Klokd, passed to KP `POST /payouts`; KP applies deductions at settlement |

---

## 5. How Klokd activates these once delivered

Same pattern as Identiti — four env vars into Railway → `klokd-octopus-api`. Klokd's env loader validates all four present + non-empty + correctly hex-64 encoded; throws `RAIL_CONFIG_INCOMPLETE: payment_rail` on partial config. Payment rail client activates at boot only when valid.

Corporate `account_uuid` goes into code (constant module). Step-up policy table goes into `octopus-api/src/modules/payment/stepup-policy.ts` decision-table module.

---

## 6. Cross-reference

- Klokd advisory: [`chamia new docs/klokd_rails_integration_advisory.md`](./chamia%20new%20docs/klokd_rails_integration_advisory.md) §2.1 (Kipkiren Pay per-rail) + §3.2 (employer escrow flow) + §3.3 (worker payout flow) + §9 AD-K01/06/07
- Klokd delta: [`chamia new docs/klokd_sprint_backlog_delta_silvia_v1.1.md`](./chamia%20new%20docs/klokd_sprint_backlog_delta_silvia_v1.1.md) C4 + S3-NEW-03 + S4-NEW-01 + Part E (LipaStack transition) + Part F + Part G #6
- Klokd INSTRUCTION_PACK: [INSTRUCTION_PACK.md](./INSTRUCTION_PACK.md) §4 (cross-rail joints) + §6 AD-K06/07 + §9 (pre-flight)
- KP rail-side: `C:\Projects\kipkiren-pay\` · `docs/CONTRACT.md` (HMAC + signing string) · `docs/INTEGRATION_MAP.md`
- Sibling precedents: `C:\Projects\lunch drop\OPERATOR_REQUEST_KP.md` (similar shape; Lunch Drop needs escrow + issuance; Klokd needs all of those) + `C:\Projects\itafika\OPERATOR_REQUEST_KP.md` (similar; Itafika does NOT need escrow or issuance)
- Cross-rail: App Integration Guide v1.1 §Kipkiren Pay integration · Appendix C (LipaStack/KP migration note — affects how Klokd's PAYMENT_RAIL_BASE_URL flips silently at Phase 3)

---

*Operator Request 2/4 · Payment Rail (KP → LipaStack) sandbox app registration for Klokd · 9 June 2026 · Confidential · OI-02 · Sprint 3 blocker · Depends-on: OPERATOR_REQUEST_IDENTITI.md*
