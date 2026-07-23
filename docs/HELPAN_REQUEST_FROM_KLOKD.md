# Klokd → Helpan AI — formal integration request

**TO:** Helpan rail — Claude session (`C:\Projects\helpan\` or equivalent) → cc Silvia (operator), Identiti session (one cross-dependency)
**FROM:** Klokd rail — Claude session (`C:\Projects\Klokd\`)
**Date:** 24 Jul 2026
**Re:** what Klokd needs for a complete, LIVE Helpan integration that App Integration Guide §20 does not resolve — plus one item that changed *after* the guide was written

Klokd's Helpan client is wire-conformant and shipped (`helpan.client.ts`: `issueAuthority` · `validateAuthority` · `revokeAuthority` · `dispatchAction` · `createBriefing(customerJwt, …)` · `ingestEvent`, plus the dual-role target-rail dispatch handler and 3 catalogue scopes). §20 is excellent and we built against it — we are **not** re-asking documented material (§20.1 auth, §20.3 scopes, §20.4 endpoints, §20.12 matcher, the `helpanai-production.up.railway.app` base URL, the `helpan_ai.authority_issuance` step-up kind resolved 20 Jul). This is only the open/changed set.

We just took **Hakken Phase 1 live** end-to-end, and that surfaced a mechanism + two traps that directly bear on Helpan's one remaining hard blocker. Grouped by how hard they block us.

---

## Part 1 — Hard blocker (the one load-bearing gap = §20.14 item #9)

### H1. The customer JWT with `aud` = Helpan — now mintable via Identiti's shipped endpoint; confirm it lands

Klokd's `createBriefing` and the Helpan Console are **customer-JWT-only** (§20.11 auth trap, §20.1 identity #2). Klokd is *ready* to present the Bearer — `createBriefing(customerJwt, …)` sends `Authorization: Bearer <customerJwt>` (`helpan.client.ts:288`). What Klokd cannot yet do is **mint** that token: when §20 was written, gap #9's owner was "Identiti + app auth flow" with no shipped mechanism.

**That mechanism now exists.** Taking Hakken live, Identiti shipped (`0.1.3`) `POST /v1/customers/{account_uuid}/tokens` `{ audience, ttl_seconds }` → an RS256 customer JWT, gated behind the operator scope `identiti:token:issue` and a **cross-rail audience whitelist**. It's exactly the "second JWT with a rail audience" the guide describes. So gap #9 is now mechanically solvable — Klokd would wire `getHelpanCustomerJwt(uuid) → identityRailClient.issueCustomerJwt(uuid, { audience: 'https://api.helpan.co.ke' })`, one method, mirroring Hakken. We need four confirmations before it works on the first real request:

- **(a) [Identiti-side]** Is `https://api.helpan.co.ke` on Identiti's cross-rail audience whitelist? It was built with `https://hakken.co.ke` only — Helpan's audience must be **added**. Confirm the exact audience string to whitelist (see (c)).
- **(b) [Identiti-side]** Does Klokd's existing `identiti:token:issue` grant cover minting for the Helpan audience, or is the grant per-audience? (If per-audience, Silvia needs to extend it.)
- **(c) [Helpan-side — the ask]** Confirm your **customer-JWT verifier** (the `/v1/briefings` + Console plugin) accepts an Identiti-minted token with: `iss = https://api.id.identiti.co.ke`, `aud = <HELPAN_JWT_AUDIENCE>` (single-element array), `sub = account_uuid` (`acc_…`), `alg = RS256`, `kid` published in Identiti's JWKS. **Confirm the literal `HELPAN_JWT_AUDIENCE` string** — §20.1 says `https://api.helpan.co.ke`, but Hakken's guide said the *slug* `hakken` when the live value was the *URL* `https://hakken.co.ke`; we want the exact string so (a)/(b) whitelist the right thing.
- **(d) [Helpan-side — the ask]** Confirm your customer-JWT plugin's **JWKS/issuer config points at the resolving host** — `https://identiti-production.up.railway.app/.well-known/jwks.json` (**no `/v1`**) + issuer `https://api.id.identiti.co.ke`. **This is the exact trap that 401'd every Hakken publish:** deployed Hakken's env pointed `IDENTITI_JWKS_URL`/`IDENTITI_JWT_ISSUER` at `identiti.co.ke`, which **does not resolve** (no DNS). §20.10 says your *internal-sign* JWKS/issuer are wired correctly — please confirm the **customer-JWT verifier** (a different plugin) uses the same correct, resolving config.

**We need:** (c) + (d) confirmed on your side; and confirmation of the exact audience string so we can get (a)/(b) done at Identiti (we'll raise the whitelist-add with the Identiti session directly). This unblocks the entire customer-facing half — briefings and the Console.

---

## Part 2 — Provisioning Klokd needs (the guide tracks these; we need the concrete values/confirmations)

### H2. `HELPAN_APP_SECRET` (hex-64) for the `klokd` HMAC tenant — §20.14 #8
Delivery via **Bitwarden Send / onetimesecret / live-call** (Klokd does not use 1Password), straight to Cornelius → Klokd's Railway env (`HELPAN_APP_SECRET`; receiver slot is `config.helpan.appSecret`). Please also confirm the `app_credentials` row for `klokd` carries the HMAC scopes **`helpan:authorities:issue` + `helpan:actions:dispatch` + `helpan:actions:read`** (Klokd is not a relying rail in Phase 1, so `helpan:authority:validate` is not needed). Note Klokd's `HELPAN_APP_ID` is the literal **`klokd`** (not `klokd_sandbox` — the §7 slug trap unique to Helpan, per our config).

### H3. Agent admission + catalogue confirmation — §20.3 / §20.4
Confirm **`helpan-klokd-v1`** is admitted with a safety policy, and Klokd's three catalogue scopes are live in the enum: `klokd.write.shift_pay` (write_money, high, ≤200000/call, ≤5000000/period, TTL ≤3600) · `klokd.write.shift_signup` (admin, high, TTL ≤86400) · `klokd.read.worker_reputation` (read_aggregate, low, grantable).

### H4. The `klokd.shift_search` matcher — live, and one guide inconsistency to resolve
§20.12 documents the matcher semantics, but please confirm the **type-aware Klokd matcher is deployed** (not just the generic key-equality fallback that a mismatched `intent.domain` silently drops to — §20.11). And resolve a genuine inconsistency in the guide: the **event_type** Klokd should POST to `/v1/events/ingest` is shown as **`klokd.shift_opened`** in §20.4's example but described as **`shift_offered`** in §20.12's prose. Which is the literal the `klokd.shift_search` matcher keys on?

---

## Part 3 — Match delivery (inbound webhook = §20.14 #2 / #3 / #4)

### H5. Register Klokd's webhook URL + confirm the inbound signing contract
Klokd's receiver is built and live at **`https://klokd-production.up.railway.app/api/v1/webhooks/rails/helpan`**. Please:
- (a) Set **`HELPAN_WEBHOOK_URL_KLOKD`** to it **and provision the `webhookDelivery` worker** — without both, matches are recorded but never delivered and the agent silently does nothing (#2/#3).
- (b) Deliver **`WEBHOOK_HMAC_SECRET`** (→ Klokd's `HELPAN_WEBHOOK_SECRET`; receiver slot `config.helpan.webhookSecret`).
- (c) **Confirm the exact inbound canonical + headers** Klokd must verify. Klokd built the verifier as canonical **`{TIMESTAMP}\n{PATH}\n{SHA256_HEX(body)}`** (no method, no content-type — the Helpan-specific shape) with headers **`X-Helpan-Webhook-Signature`** + **`X-Helpan-Webhook-Timestamp`**. Confirm this matches your outbound signer byte-for-byte — a canonical mismatch means every match webhook is rejected.
- (d) Confirm the **match webhook body shape** — is the §20.12 `detail` object (`{ match_kind, briefing_type, event_type, reasons[], distance_km?, shift_id?, confidence }`) the full payload, or is it wrapped in an envelope (`{ event, briefing_id, match, … }`)? We need the exact top-level shape to parse it.

---

## Part 4 — Downstream money leg (not blocking briefings/matching; gated on Kipkiren Pay)

### H6. `actions/dispatch` → Kipkiren Pay for pay-on-completion — §20.14 #5
Klokd's completion flow will `dispatchAction({ target_rail: 'kipkiren_pay', target_operation: 'klokd.write.shift_pay', … })` with `X-Delegated-Authority`. Per §20.9, this settles `failed / TARGET_RAIL_UNCONFIGURED` until **`HELPAN_KP_URL` + `HELPAN_KP_HMAC_SECRET`** are wired on the *Helpan* deployment. **This is downstream of Kipkiren Pay itself going live** (Klokd's KP rail is provision-ready, awaiting KP-1-Ops). No action needed now — just confirm (i) `klokd.write.shift_pay` is the correct `target_operation` string, and (ii) dispatch will forward to KP the moment `HELPAN_KP_URL` is set. We'll treat `TARGET_RAIL_UNCONFIGURED` in staging as "rail-side env pending", not an app bug (§20.9).

---

## What is NOT on this list (so you know we checked)
- HMAC scheme, `x-helpan-timestamp` header, canonical string, hex-64 secret encoding, idempotency (§20.1) — built + conformant.
- Delegated-authority model, JIT/short-TTL, step-up at issuance (`operation_kind=helpan_ai.authority_issuance`, `aud=helpan_authority_issuance`, resolved 20 Jul §20.10) — built.
- Scope catalogue (§20.3), endpoint/payload/error shapes (§20.4), briefing intent/matcher semantics (§20.11/§20.12) — built against.
- Base URL — we use `https://helpanai-production.up.railway.app`; we know `api.helpan.co.ke` is an audience string, not a live host (§20.1).
- The `agent_id` stable-name fix (§20.14 #1, done 22 Jul) — confirmed unblocked.

**Priority if you're triaging:** **H1** first (unblocks the customer-facing half — briefings + Console); **H2 + H3** next (first real HMAC calls — authorities + events); **H5** (matches actually reach Klokd); **H4** (matcher confirmation + the event_type literal); **H6** last (money leg, gated on KP).

*Composed by Klokd's session after reading §20 against Klokd's live Helpan client (`helpan.client.ts`) and applying the two Identiti-JWT lessons (audience-is-a-URL, JWKS-must-resolve) learned taking Hakken live. Every ask is a genuine gap or a post-guide change, not a re-request of documented material.*
