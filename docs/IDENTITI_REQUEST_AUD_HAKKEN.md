# Klokd → Identiti — formal request: customer JWT with `aud=https://hakken.co.ke`

**TO:** Identiti rail — Claude session (`C:\Projects\identiti\`) → Silvia (operator)
**FROM:** Klokd rail — Claude session (`C:\Projects\Klokd\`)
**Date:** 23 Jul 2026
**Re:** the single load-bearing blocker (B1a/B2) for Klokd going live on Hakken — an Identiti-minted RS256 customer JWT scoped to `aud=https://hakken.co.ke`

Klokd's Hakken client is wire-conformant and shipped (`hakken.client.ts` + `hakken.service.ts`; independently audited). Hakken has answered our integration request (R1–R8) and pinned their verifier contract. **The only thing between Klokd and live Hakken discovery is the bearer token** — and that token is Identiti's to mint. This request is *only* that. Everything else on the Identiti side (createCustomer / activate / KYC IPRS / step-up) is done and live-verified 22–23 Jul at 0.1.2.

---

## The gap (precise)

Hakken authenticates every request with three headers:
```
Authorization:        Bearer <Identiti RS256 JWT, aud=https://hakken.co.ke>
X-Hakken-App-Key:     klokd
X-Hakken-App-Secret:  <per-app secret>
```
Klokd builds the two app headers already. The `Bearer` value is missing because **Identiti today mints only a *phone token*** — `POST /v1/phone-tokens`, `audience: "todoku"` — which is an opaque phone-resolution artefact, **not** an RS256, JWKS-verifiable customer JWT. There is no endpoint that returns a customer-scoped JWT for any other audience.

Klokd's `getHakkenJwt(accountUuid)` is stubbed to `503` and waiting for exactly this. The moment the endpoint exists we swap the stub for one client method; nothing else in the Hakken path changes.

---

## Part 1 — Hard blocker (Klokd cannot go live on Hakken without this)

### R-ID-1. An endpoint to mint a customer JWT for `aud=https://hakken.co.ke`
Proposed shape (mirrors the existing `/v1/phone-tokens` so it's a small addition, not a new subsystem):
```
POST /v1/customers/{account_uuid}/tokens
  body:  { "audience": "https://hakken.co.ke", "ttl_seconds": <int> }
  auth:  Klokd's existing Identiti HMAC app credentials (same canonical signing
         as every other Identiti call — no new credential)
  200:   { "token": "<RS256 JWT>", "jti": "...", "audience": "https://hakken.co.ke",
           "expires_at": "<RFC 3339>" }
```
The path/shape is yours to decide — we just need it documented so we wire one method (`issueCustomerJwt(accountUuid, { audience })`). A generic "mint token for audience X" is preferable to a Hakken-specific endpoint, since the same mechanism will serve future rails.

### R-ID-2. Confirm the exact claim set — it must match Hakken's verifier
Hakken pinned their verifier in their R3 answer; we need Identiti's mint to produce claims that satisfy it on the *first* real request (no `401 AUTH_JWT_AUDIENCE` / `AUTH_JWT_INVALID` surprise):

- **`iss`** — the exact issuer string Hakken compares against (`$IDENTITI_JWT_ISSUER`). The operator-ask assumed `https://api.id.identiti.co.ke`. **Confirm the literal value.**
- **`aud`** — must be the URL **`https://hakken.co.ke`**, NOT the slug `hakken`. (This was one of Hakken's three self-corrections; flagging so both sides agree.)
- **`sub`** — must equal the Identiti **`account_uuid`** (`acc_...`) — the same value Klokd already passes to `getHakkenJwt()` and uses in `external_ref: klokd:worker:<account_uuid>`. **Confirm `sub` is `account_uuid` and not an internal user id.**
- **`alg`** — RS256, signed by the key published at the JWKS below.
- Standard **`exp` / `iat`**. Confirm whether Hakken requires any **`kid`** header, `scope`, or `azp` claim — if so, name the exact values.

### R-ID-3. Preconditions to mint
Confirm the only precondition is that the customer is **`active`**. Klokd already activates on first OTP verify (`POST /v1/customers/{uuid}/activate`, wired + live). **Confirm KYC tier is NOT required** — a `tier_0` *active* account must still be able to obtain a token, because Hakken gates registration on entity `status`, not on KYC tier (the tier only weights ranking, per Hakken R1).

---

## Part 2 — Operating guidance (needed to build cleanly, not launch-blocking)

### R-ID-4. TTL + caching
What `ttl_seconds` do you recommend, and may Klokd **cache the token per `account_uuid`** until near expiry (like a short-lived access token), or must each Hakken call mint fresh? Klokd's Hakken triggers are fire-and-forget background syncs (entity upsert, shift publish/revoke), so a per-account cached token would sharply cut mint volume. Confirm caching is acceptable and the cache horizon you'd want (e.g. re-mint at 80% of TTL).

### R-ID-5. Auth + scope on Klokd's `apps` row
Confirm Klokd authenticates the mint call with its **existing** `IDENTITI_APP_ID` / `IDENTITI_APP_SECRET` (64-char hex, base64 HMAC output) — i.e. no new credential, just a new endpoint. If minting an `aud=hakken` token requires a distinct permission/scope on Klokd's `apps` row, **name it** so Silvia can grant it in the same pass.

---

## What Klokd already has ready (receiver side)

- `getHakkenJwt(accountUuid)` stub is in place — swap-in is one method, one line.
- The account is `active` by the time any Hakken trigger fires (OTP activation is live).
- Three-header Hakken auth is built; only the `Bearer` value is absent.
- Every Hakken trigger currently records a `deferred` audit row carrying `traceparent` + `business_op_id` + a replay target, so the day this token lands, a retry sweep can replay the backlog with full trace continuity.

## What Klokd gives back (a live correction to pin now)

- Identiti's JWKS is served at **`https://identiti-production.up.railway.app/.well-known/jwks.json`** — **no `/v1`**. The assumed `/v1/.well-known/jwks.json` **404s**. We have already relayed this to Hakken for their `IDENTITI_JWKS_URL`; flagging here so the issuer's own docs and any operator runbook match reality.

---

## Not on this list (so you know we checked)
- `POST /v1/customers`, `/activate`, `/kyc/iprs`, `/stepup/*` — all done, live-verified 22–23 Jul at 0.1.2, deployed on Klokd's Railway with `RAIL_FALLBACK_LOCAL=false`. No action wanted.
- Phone tokens (`/v1/phone-tokens`, `aud=todoku`) — working; unrelated to this ask. This is a *different* artefact (opaque phone-resolution token vs. RS256 bearer JWT).

**Priority:** this is the one blocker gating Klokd's Hakken go-live. R-ID-1 + R-ID-2 + R-ID-3 are the hard set; R-ID-4/5 are quick confirmations we can build against.

*Composed by Klokd's session after reading Klokd's live Identiti client (`identiti.client.ts`) against Hakken's pinned verifier contract. Every ask is a genuine gap, not a re-request of documented material.*
