# Escalations to Silvia — Identiti live integration findings

**Status:** 3 of 4 Identiti endpoints confirmed working from `klokd_sandbox` against `identiti-production.up.railway.app` on 2026-06-09. The following items block the remaining flows.

## 1. Register Klokd's `operation_kind` enum values

**What broke:** `POST /v1/stepup/challenges` rejects every klokd-specific `operation_kind`. Currently the enum only accepts `kipkiren_pay.redemption`, `kipkiren_pay.reversal`, `kipkiren_pay.goal_release`, `kipkiren_pay.large_transaction` (and a few more — full list truncated in the error response).

**What Klokd needs registered:**

| operation_kind | risk_tier | purpose |
|---|---|---|
| `klokd.login` | low | First-login OTP via step-up (replaces v1's standalone OTP service) |
| `klokd.payout` | high | High-value payout above KES 20K — gates worker B2C disbursement |
| `klokd.profile_change` | medium | Worker/employer changing core profile fields (M-Pesa, name, business) |
| `klokd.kyc_submit` | medium | Worker submitting National ID for IPRS check |

Until these land, Klokd's login flow and high-value payout flow both 400 at the rail.

## 2. Confirm `/v1/customers/{uuid}/kyc/iprs` request schema

LD types claim `{national_id, name_first, name_last, date_of_birth}`. The live rail wire is not yet verified for Klokd. Please confirm or send a sample request that returns 201.

This also clarifies the Klokd mobile UX: per Identiti's IPRS-data-lookup model (not image upload), Klokd's "VerifyID" screen needs to collect National ID number + DOB as typed fields rather than uploading id_front/id_back/selfie photos. That's a mobile screen rework — knowing the exact request body lets Klokd specify the form fields correctly.

## 3. Doc inaccuracies — operator pack §4 + Lunch Drop client

The operator pack at `OPERATOR_REQUEST_IDENTITI.md` §4 says:

> Canonical signing string (same shape as Todoku, **hex-encoded HMAC** vs Todoku's base64)

But the live rail at `c:/Projects/identiti/vendor/platform-shared/dist/hmac.js` does:

```js
return createHmac('sha256', secret).update(canonicalString, 'utf8').digest('base64');
```

**Both Identiti and Todoku output base64.** Klokd's smoke test only passed after switching to base64. The LD reference client at `c:/Projects/lunch drop/apps/api/src/rails/identiti/client.ts` also uses hex (via `hmacSha256Hex`) — its tests mock `fetch` so the bug never surfaced. LD would 401 against the live rail same as Klokd's initial smoke did.

Recommended fix: doc + LD client + LD operator pack all corrected to "base64 signature".

## 4. Operator pack endpoint paths inconsistency

Operator pack §6 + §7 say `POST /v1/stepup/challenges` and `POST /v1/phone-tokens` — correct.

But the LD client uses `/customers`, `/stepup/challenges`, `/phone-tokens` (no `/v1/` prefix) and its tests pass because they mock the fetch layer.

Live rail serves under `/v1/*`. LD would 404 against the live rail.

## 5. Webhook signing (deferred — informational)

Operator pack §2 notes `IDENTITI_WEBHOOK_SECRET` is DEFERRED until ID-14 Phase 2 because events flow via Kafka today. Klokd's webhook handler at `POST /api/v1/webhooks/rails/identiti` is built but inert. When ID-14 Phase 2 ships, please send the webhook secret and Klokd activates the handler.

## What's working

Don't lose sight of this: from a cold start this session, Klokd went from no live integration to a working production-shaped client calling a real rail. Three real account_uuids exist in your sandbox now:

- `acc_b4edc8da-68b6-4966-8c90-50a56bf65372` (first smoke probe)
- `acc_<...>` from end-to-end client test (latest, dynamic)

All against `klokd_sandbox` with the HMAC key you handed over. The cardinal rule integration pattern is verified — Klokd holds account_uuid + tier signal only, never the raw phone in logs.

## Open requests for the other rails

Once the Identiti escalations above are processed, the same handover pattern unblocks the rest:

| Rail | Operator request | Status |
|---|---|---|
| Todoku | `OPERATOR_REQUEST_TODOKU.md` | Awaiting `TODOKU_API_BASE` + `TODOKU_APP_ID` + `TODOKU_APP_SECRET` (base64-44) + `TODOKU_WEBHOOK_SECRET` |
| Payment Rail (Kipkiren Pay) | `OPERATOR_REQUEST_KP.md` | Awaiting `PAYMENT_RAIL_API_BASE` + `PAYMENT_RAIL_APP_ID` + `PAYMENT_RAIL_APP_SECRET` (hex-64) + `PAYMENT_RAIL_WEBHOOK_SECRET` |
| Hakken | `OPERATOR_REQUEST_HAKKEN.md` | Sprint 5 — not blocking now |

---

*Authored from Klokd's first live Identiti integration session, 2026-06-09. Klokd repo: `iamkn1ght/klokd` main @ `ee2f48f`.*
