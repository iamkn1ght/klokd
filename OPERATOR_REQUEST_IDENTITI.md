# Operator Request — Identiti sandbox app registration for Klokd

**To:** Silvia Mumbua (CTO · Kipkiren Teknolojia · Identiti rail operator)
**From:** Klokd engineering · Chamia Mutuku (CEO · Klokd Workplace Solutions Ltd) · authored 9 June 2026
**Authority:** Klokd Rails Integration Advisory v1.0 (June 2026) §2.2 + Sprint Backlog Delta v1.1 Part C (S3-NEW-01) + Part F (env var checklist) + Part G (question 1) · Identiti `docs/INTEGRATOR_HANDOVER_LUNCHDROP.md`
**Status:** 🟠 BLOCKED on operator action — **OI-01** of 9 open items · first of four rail-provisioning asks (Identiti unblocks all the others since `account_uuid` is the cross-platform foreign key)
**Estimated operator effort:** ~30 min (mirrors Lunch Drop + Itafika tenant provisioning — same script, different row)
**External lead time:** none

---

## 0. Why first

Klokd's `account_uuid` foreign key (AD-K10) is issued by Identiti at first registration. Every Klokd worker/employer table references `account_uuid` from Identiti, not Klokd's own user ID. Without Identiti credentials, Sprint 3 (foundation rail-client setup) cannot start. KP's wallet creation also needs `account_uuid` upstream — same dependency chain.

This request mirrors the **Lunch Drop + Itafika pattern** revised after the rail-side handover (`whyyam1/identiti` commit `b8b3279`):
- Per-request HMAC (NOT token-exchange).
- **3 env vars** (`IDENTITI_BASE_URL`, `IDENTITI_APP_ID`, `IDENTITI_APP_SECRET`) — webhook secret deferred until ID-14 Phase 2 since Identiti events flow via Kafka today.
- HEX-encoded HMAC-SHA-256 (64 chars) for the app secret.

---

## 1. The ask — sandbox app registration

Provision a Klokd consuming-app registration on the Identiti sandbox (Supabase `tjqpyblyoslyoplmnlua`, eu-west-1, Railway dev mode). Same shape as the LipaStack / Chapaa-SME / Klokd-pre-rail / family-discovery / `lunchdrop_sandbox` / `itafika_sandbox` registrations.

**App identity:**

| Field | Value |
|---|---|
| `app_slug` | `klokd_sandbox` |
| `app_name` | Klokd |
| `legal_entity` | Klokd Workplace Solutions Ltd (formerly under KMV parent; restructure per June 2026 advisory authorship line) |
| `vertical` | casual-labour-marketplace |
| `audience_posture` | mixed (workers + employers) |
| `regulator_exposure` | DPA 2019 + WIBA + Employment Act s.9 + NSSF + SHIF + PAYE |
| `sandbox_mode` | true |

**Sibling app `klokdh_sandbox` for Klokd Health** — recommend provisioning at the same time (Klokd Health uses the same Identiti integration; KMPDC verification is a Klokd-Health-owned layer per AD-K08, NOT an Identiti function).

---

## 2. The 3 env vars (down from 4 — webhook secret deferred)

Set in Klokd Railway service `klokd-octopus-api` (or equivalent) once the rail-side seed completes:

| Env var | Value | Notes |
|---|---|---|
| `IDENTITI_BASE_URL` | Railway URL handed over with the secret | Interim — `sandbox.id.identiti.co.ke` not yet wired. Klokd's `PaymentRailClient`-style env-loader expects http(s) URL — validated at boot. |
| `IDENTITI_APP_ID` | `klokd_sandbox` | Mirrors the tenant slug seeded in `scripts/seed-tenants.ts`. |
| `IDENTITI_APP_SECRET` | HEX HMAC-SHA-256 (64 chars) | Issued by rail-side `pnpm db:seed` into `secrets/klokd_sandbox.hmac`. Hand over via 1Password (item `KMV / Identiti / klokd_sandbox HMAC`). Loader rejects non-hex-64 at boot. |
| ~~`IDENTITI_WEBHOOK_SECRET`~~ | **DEFERRED** | Identiti does NOT sign outbound webhooks today. Events flow via Kafka (`identiti.kyc.events`, `.account.events`, etc.). HTTP webhook signing ships in ID-14 Phase 2 (joint Hakken design session). Klokd webhook handler for `KYC_TIER_CHANGED` activates when this secret lands. |

---

## 3. Granted scopes (7, locked)

Per advisory §2.2 + delta C2 (S3-03 revised). Minimum set Klokd needs at MVP:

```
identiti:customers:read          ← read account_uuid + tier signal; also covers POST /tokens/phone (producer side)
identiti:customers:write         ← create worker/employer account_uuid at onboarding
identiti:kyc:write               ← POST /kyc/documents (National ID front+back+selfie)
identiti:kyc:read                ← poll KYC verification status; read kyc-summary (masked-ID display)
identiti:stepup:request          ← high-value payouts (>KES 5,000 single, >KES 25,000/24h)
identiti:stepup:verify
identiti:tier:read               ← KYC tier signal for shift-application + employer-confirmation gates
```

**Skipped from the 10-scope universe:**
- `identiti:consent:read` / `identiti:consent:write` — Klokd captures Privacy & Consent at onboarding (reboot pack §10 onboarding screen 2: DPA 2019 biometric consent · GPS consent · BOTH required) but stores the toggle in Klokd's DB. Identiti consent surface (ID-14) is for cross-app consent sharing, not Klokd-app first-party consent.
- `identiti:kyb:write` / `identiti:kyb:read` — Klokd's employer verification (WIBA · insurance · KRA PIN) is a Klokd-owned compliance layer, NOT Identiti KYB. Klokd Employer onboarding screen 2 (Business Verify) is Klokd's surface.
- `identiti:operator` — Klokd's admin console operator auth is a separate concern (post-MVP).
- `identiti:internal:sign:delegated_authority` — Helpan-only hard-pin.
- `phone_token:resolve` — Todoku-only (rail-internal). Klokd is the *producer* of phone tokens (under `customers:read`), Todoku is the consumer.

---

## 4. Authentication — per-request HMAC (NO token-exchange flow)

Confirmed by the Lunch Drop + Itafika rail-side handovers (4 June 2026): Identiti uses inline per-request HMAC signing on every request, NOT a service-token exchange pattern.

```
Authorization: Identiti-HMAC-SHA256 app_id=klokd_sandbox, signature=<hex>
X-Identiti-Timestamp: <RFC 3339>
X-Idempotency-Key: <UUIDv4>          # POST / PATCH / DELETE only
Content-Type: application/json; charset=utf-8   # bodied requests only
```

Canonical signing string (same shape as Todoku, hex-encoded HMAC vs Todoku's base64):

```
METHOD\nPATH_AND_QUERY\nCONTENT_TYPE\nTIMESTAMP\nSHA256_HEX(body)
```

Replay window: 300 s. Idempotency-key TTL: 24 h.

Implement in `octopus-api/src/modules/identity/identityClient.ts::IdentityService.signedRequest()` — mirror the Lunch Drop client at `C:\Projects\lunch drop\apps\api\src\rails\identiti\client.ts` and the Itafika client at `C:\Projects\itafika\src\rails\identiti\client.ts`. All three share the multi-line signing-string helper (hex output; Todoku uses the same helper with base64 output).

---

## 5. mTLS posture — sandbox is HMAC-over-plain-TLS

No client certificates needed for sandbox. Stage 1+ adds edge-terminated mTLS at Railway/Cloudflare — Klokd app layer unchanged.

---

## 6. Sandbox OTP retrieval — Option A shipped on rail side

`POST /v1/stepup/challenges` echoes the OTP in the response body when `NODE_ENV != production` AND `factor=phone_otp`:

```json
{
  "ok": true,
  "data": {
    "challenge_id": "stp_01J...",
    "factor": "phone_otp",
    "expires_at": "...",
    "delivery_status": "dispatched",
    "otp_plaintext": "517392",
    "sandbox_only": true
  }
}
```

Production strips both `otp_plaintext` and `sandbox_only`. Klokd's `IdentitiStepUpChallengeResponse` type accepts them as optional — relevant for step-up dispatch (high-value payout authorisation) tested in sandbox without Todoku-side SMS delivery.

---

## 7. Phone-token producer flow (for Todoku send path)

When Klokd sends an SMS/WhatsApp via Todoku, Todoku needs `recipient_token` — a Klokd-issued phone token referencing the worker/employer's Identiti account:

1. Klokd calls `POST /v1/phone-tokens` with `{account_uuid, audience: "todoku"}` — runs under existing `identiti:customers:read` scope (no 8th scope needed).
2. Identiti returns `{phone_token, jti, audience, expires_at}` — opaque HS256 JWT, `pht_<ULID>` jti, **15-min TTL**.
3. Klokd passes `phone_token` to Todoku as `recipient_token`.
4. Todoku calls `POST /v1/phone-tokens/resolve` (Todoku-only `phone_token:resolve` scope) to get the encrypted MSISDN at send time.

**Critical:** phone_token NEVER cached beyond 15-minute window. If batch notifications (e.g. all applicants notified shift is filled), Klokd requests a fresh token per worker per send operation.

**Producer side (Klokd via Identiti) is unblocked** once §1 lands. Consumer side (Todoku) lights up when `klokd` tenant provisioned (see `OPERATOR_REQUEST_TODOKU.md`).

---

## 8. KYC tier gates (per advisory §2.2)

| Tier | Identiti definition | Klokd business rule |
|---|---|---|
| **Tier 0** | Phone verified only | Worker can browse shifts but cannot apply. Employer cannot post shifts. |
| **Tier 1** | National ID + selfie verified (IPRS check) | Worker can apply and accept shifts. Employer can post and confirm shifts. Full platform access. |
| **Tier 2** | Enhanced verification (future) | Reserved for high-value transactions above Tier 1 limits |

Klokd consumes via `GET /accounts/:uuid/kyc-tier` (cached locally, refreshed on `KYC_TIER_CHANGED` webhook). Klokd stores **`kyc_tier` integer** only — never the underlying IPRS check results, biometric vectors, ID images, etc.

---

## 9. JWKS

`${IDENTITI_BASE_URL}/.well-known/jwks.json` — public, no auth. Klokd verifies RS256 step-up tokens locally via the JWKS, 1-hour cache. JWKS publishes 2 keys: step-up + delegated-authority (Helpan, not used by Klokd at v3 MVP per advisory §2.5).

---

## 10. Test phone whitelist

Need at least 2 sandbox MSISDNs (one worker-side, one employer-side) that can receive sandbox OTPs through the `STEP_UP_REQUIRED → Todoku consume → SMS sent` path. Needed for IT-S3 (auth E2E) + IT-S4 (onboarding flow) sandbox tests.

Suggest:
- `+254700000003` (next available after Lunch Drop `+254700000001` + Itafika `+254700000002`) — worker test number
- `+254700000004` — employer test number

Confirm in 1Password handover.

---

## 11. Klokd-side commitments (informational)

| Item | Owner | Status |
|---|---|---|
| Identiti SDK / client wrapper (`IdentityService` class with `createAccount`, `lookupAccount`, `submitKycDocuments`, `getKycTier`, `issuePhoneToken`, `initiateStepUp`) | Klokd S3-NEW-01 | Code-ready after OI-01 lands; built per advisory delta C |
| `account_uuid` as primary FK on every worker/employer table (AD-K10) | Klokd Sprint 3 | Migration `20260401193045_init` predates AD-K10 — needs migration `0002_account_uuid_fk` to add FK column + backfill |
| Remove all Klokd-side KYC upload + encryption code from `octopus-api/src/modules/identity/` per AD-K02 + delta C2 | Klokd Sprint 3 | Existing `octopus-api/src/modules/identity/` to be inspected + dismantled |
| Phone-token freshness management (NEVER cached beyond 15 min) | Klokd `CommsService` | Built per S3-NEW-02 against Todoku |
| `actor` + `initiated_by` claim propagation (§A.2) on every Identiti call | Klokd Sprint 3 | Built into client at scaffold |
| KYC_TIER_CHANGED webhook handler | Klokd `octopus-api/src/modules/identity/` | Activates when ID-14 Phase 2 webhook secret lands |

---

## 12. How Klokd activates these once delivered

The three env vars go into Railway → `klokd-octopus-api` Variables. Once all three are present + correctly hex-64 encoded, Klokd's env loader activates the Identiti rail at boot. Partial config (e.g. 2 of 3) throws `RAIL_CONFIG_INCOMPLETE: identiti` deliberately — to catch deployment mistakes.

The JWKS URL goes in code as a constant in `octopus-api/src/modules/identity/identityClient.ts` (not env-var — public-knowledge URL).

---

## 13. Cross-reference

- Klokd advisory: [`chamia new docs/klokd_rails_integration_advisory.md`](./chamia%20new%20docs/klokd_rails_integration_advisory.md) §2.2 (Identiti) + §3.1 (worker registration flow)
- Klokd delta: [`chamia new docs/klokd_sprint_backlog_delta_silvia_v1.1.md`](./chamia%20new%20docs/klokd_sprint_backlog_delta_silvia_v1.1.md) C1 + C2 + S3-NEW-01 + Part F
- Klokd INSTRUCTION_PACK: [INSTRUCTION_PACK.md](./INSTRUCTION_PACK.md) §4 (cross-rail joints) + §9 (pre-flight)
- Identiti rail-side: `C:\Projects\identiti\` · `docs/INTEGRATOR_HANDOVER_LUNCHDROP.md` (same wire-format pattern) · `scripts/seed-tenants.ts`
- Sibling precedents: `C:\Projects\lunch drop\OPERATOR_REQUEST_IDENTITI.md` + `C:\Projects\itafika\OPERATOR_REQUEST_IDENTITI.md` — same shape, different `app_slug`

---

*Operator Request 1/4 · Identiti sandbox app registration for Klokd · 9 June 2026 · Confidential · OI-01 · Sprint 3 blocker*
