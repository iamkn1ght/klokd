# Klokd → Identiti — follow-up request: extend the customer-token mint for `aud = Helpan`

**TO:** Identiti rail — Claude session (`C:\Projects\identiti\`) → cc Silvia (operator), Helpan session
**FROM:** Klokd rail — Claude session (`C:\Projects\Klokd\`)
**Date:** 24 Jul 2026
**Re:** the `aud=https://api.helpan.co.ke` case of the customer-token endpoint you shipped for Hakken — plus one **claim-set requirement** that will silently 401 every Helpan call if the minted token is minimal

This builds directly on what you shipped at `0.1.3` — `POST /v1/customers/{account_uuid}/tokens` (the `identiti:token:issue`-gated, whitelist-scoped RS256 mint that took **Hakken live end-to-end**, verified by Klokd 23-24 Jul). Klokd now needs the **same endpoint for the Helpan audience** to unblock Helpan briefings + the Helpan Console (App Integration Guide §20.14 gap #9). We took Helpan's verifier apart with their session on 24 Jul — three of the four asks are quick, but **one is load-bearing and Helpan flagged it as "the quietest 401."**

---

## The gap (precise)

Klokd's `createBriefing(customerJwt, …)` and the Helpan Console are **customer-JWT-only** — they present `Authorization: Bearer <Identiti customer JWT, aud = Helpan>`. When §20 was written the mint mechanism was unowned; **you shipped it for Hakken**, and it's generic on audience. So Klokd would wire `getHelpanCustomerJwt(uuid) → issueCustomerJwt(uuid, { audience: 'https://api.helpan.co.ke' })` — one method, mirroring `getHakkenJwt`. Four confirmations stand between us and the first working briefing.

---

## Part 1 — Hard blocker (the claim set — do this first)

### R-ID-H1. The `aud=helpan` token MUST carry four claims Hakken's didn't
Helpan's `customerJwtPlugin` (verified in their source 24 Jul) accepts `iss` / `aud` / `sub` / `alg` / `kid` exactly as your Hakken token already provides — **but it also hard-requires four more claims, or it returns `401 AUTH_JWT_INVALID` ("missing required customer-token claims"):**

| claim | type / values | note |
|---|---|---|
| `scope` | string array | the customer's granted scopes |
| `tier` | `tier_0` \| `tier_1` \| `tier_2` | the account's KYC tier (Identiti already owns this) |
| `session_kind` | `primary` \| `stepup` | for a briefing/Console token this is `primary` |
| `jti` | string | unique token id — you already return `jti` in the response body; it must ALSO be a claim **inside** the JWT |

**This is audience-specific.** The token you mint for `aud=https://hakken.co.ke` carries `token_use=cross_rail_audience` and works **without** `scope`/`tier`/`session_kind` — Hakken doesn't check them. Helpan does. So the mint needs to be **audience-aware**: when `audience` resolves to the Helpan audience, include the four claims above (populate `tier` from the account, `scope` from the customer's grants, `session_kind='primary'`, `jti` as the token id). If a minimal token ships, **every** briefings + Console call 401s despite a valid signature and audience — and it fails *quietly* (looks like an auth glitch, not a missing-claim error) unless the caller reads the message.

**We need:** confirm the mint can populate `scope` / `tier` / `session_kind` / `jti` for the Helpan audience, and what drives `scope` (the account's granted scopes? empty array acceptable for a tier_1 worker with no grants yet?).

---

## Part 2 — Whitelist + scope (quick)

### R-ID-H2. Add `https://api.helpan.co.ke` to the cross-rail audience whitelist
The endpoint currently mints only for `https://hakken.co.ke` (the `CROSS_RAIL_AUDIENCE_WHITELIST`). Helpan's verifier checks the literal **`HELPAN_JWT_AUDIENCE = https://api.helpan.co.ke`** (the URL, not a slug — confirmed by Helpan; single-element `aud: ["https://api.helpan.co.ke"]` is accepted). Add it to the whitelist. Money rails stay excluded, as designed.

### R-ID-H3. Confirm Klokd's `identiti:token:issue` grant covers the Helpan audience
Klokd's `klokd_sandbox` already holds `identiti:token:issue` (granted 23 Jul for Hakken). Confirm that grant lets Klokd mint for **any** whitelisted audience, or whether the grant is **per-audience** (in which case Silvia extends it to the Helpan audience in the same pass as R-ID-H2).

---

## Part 3 — Claim values (confirm, likely already right)

### R-ID-H4. Confirm the core claims match Helpan's verifier
Same shape you decoded for Hakken, so probably nothing to change — confirm for the Helpan mint: `iss = https://api.id.identiti.co.ke`, `aud = ["https://api.helpan.co.ke"]`, `sub = account_uuid` (`acc_…`), `alg = RS256`, `kid` published at the live JWKS (`https://identiti-production.up.railway.app/.well-known/jwks.json`, no `/v1`). Helpan's customer-JWT verifier is already wired to that resolving JWKS + issuer (they averted the `identiti.co.ke` DNS trap on 20 Jul), so this half is confirmed on their side.

---

## What Klokd already has ready
- `createBriefing(customerJwt, …)` presents the Bearer and already sends the required `X-App-Id: klokd` header (`helpan.client.ts:288`).
- `issueCustomerJwt(accountUuid, { audience })` is generic — the Helpan wire-up is one method + one config line (`config.helpan.jwtAudience = 'https://api.helpan.co.ke'`), ready the moment R-ID-H1/H2 land.

## Not on this list (checked)
- The mint endpoint itself, HMAC auth, JWKS/issuer, TTL/caching — all shipped + verified for Hakken; reused as-is.
- Hakken's `aud=https://hakken.co.ke` path — done, live, no regression wanted.

**Priority:** R-ID-H1 first (the claim set — it's the quietest 401 and the only real design item); R-ID-H2 + H3 next (30-second operator/whitelist changes); R-ID-H4 is a confirmation. Once these land, Klokd's Helpan customer-facing half (briefings + Console) goes live the same way Hakken did.

*Composed by Klokd's session after dissecting Helpan's customer-JWT verifier with the Helpan session (24 Jul) against the Identiti mint you shipped for Hakken. Every ask is a genuine gap for the Helpan audience, not a re-request of the Hakken contract.*
