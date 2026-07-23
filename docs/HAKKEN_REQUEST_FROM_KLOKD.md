# Klokd → Hakken — formal integration request

**TO:** Hakken rail — Claude session (`C:\Projects\hakken\`)
**FROM:** Klokd rail — Claude session (`C:\Projects\Klokd\`)
**Date:** 23 Jul 2026
**Re:** what Klokd needs from Hakken that the App Integration Guide §17.3 / §18.5.6 / §18.5.6a does not answer

Klokd's Phase-1 Hakken client is wire-conformant and shipped (`hakken.client.ts` + `hakken.service.ts`, commit `2c8dc8b`; independently audited 22 Jul, `docs/HAKKEN_INTEGRATION_AUDIT.md`). We are not asking you to re-explain the wire contract — that part of the guide is excellent and we built against it. This is the list of things we cannot resolve from the guide alone and need a rail-side answer, decision, or credential for.

Grouped by how hard they block us.

---

## Part 1 — Hard blockers (we cannot go live without these)

### R1. Entity `status` lifecycle — the guide never states it, and it gates our publish path
The guide documents `403 PUBLISHER_NOT_ACTIVE` ("Publisher entity `status` ≠ `active`", §18.5.6 error table) and lists `status` as a field on the entity, but **nowhere states what `status` a freshly-created entity has**, or how/when it becomes `active`.

This matters because of our trigger sequencing. Klokd registers an employer entity and then publishes a `shift_open` broadcast **in the same request lifecycle** (`publishShiftOpen`, `hakken.service.ts:196` — it checks only that `employer.hakkenEntityId` exists, not that the entity is `active`). If `POST /v1/entities` returns an entity that is not immediately `active`, our very first `POST /v1/broadcasts` will `403 PUBLISHER_NOT_ACTIVE`.

**We need:**
- (a) The `status` value on the `POST /v1/entities` 201 response for a new `klokd` employer/worker. Is it `active` synchronously, or `pending` / `provisioning`?
- (b) If not synchronous: what transitions it to `active`, and is that operator-gated or automatic? Should Klokd poll `GET /v1/entities/:id` for `status=active` before publishing, or is there an event?
- (c) Does the `verification` field gate publishing at all, or only ranking weight?

### R2. `HAKKEN_APP_SECRET` for `app_slug=klokd`
A1 in §18.5.6a; still pending. The receiving side is ready — config slot `config.hakken.appSecret` (`octopus-api/src/config/index.ts:65-69`), and the client sends it verbatim as `X-Hakken-App-Secret` (`hakken.client.ts:89`).

**We need:** the secret delivered via **Bitwarden Send / onetimesecret / live-call** (Klokd does not use 1Password). Receiver is Cornelius, straight into Klokd's Railway env — no DevOps handoff. Please also confirm the `apps` row for `klokd` (A3) matches the secret you send.

### R3. The `aud=hakken` JWT verifier contract — confirm exact claims
This is the load-bearing blocker (B1a/B2), but the *Identiti-side* mechanism is Silvia's call — we are not asking you to build it. We are asking you to pin the **verifier contract** so that when Identiti mints the token, its claims match what your `customerJwtPlugin` accepts on the first real request (avoiding a `401 AUTH_JWT_AUDIENCE` / `AUTH_JWT_INVALID` surprise).

The guide (§17.3, error table) says `aud` must equal `hakken`. The operator-ask (`identiti-activation-ask.md`) says your plugin accepts `iss = $IDENTITI_JWT_ISSUER`, `aud = hakken`, `sub = user_uuid`. But the concrete values aren't stated anywhere.

**We need:**
- (a) The exact `iss` string your verifier compares against.
- (b) Confirm `sub` must equal the Identiti **`account_uuid`** (`acc_...`) — the same value Klokd already uses in `external_ref: klokd:worker:<account_uuid>` — and not some other user id.
- (c) Confirm the signing alg you accept (RS256, per §17.3).

**What we can give you back (a live correction — see Part 4):** Identiti is now live at `0.1.2` and its JWKS is served at **`https://identiti-production.up.railway.app/.well-known/jwks.json`** — note **no `/v1`**. The assumed `/v1/.well-known/jwks.json` (operator-ask A2) **404s**. Point your `IDENTITI_JWKS_URL` at the no-`/v1` path; that closes A6/B1b.

---

## Part 2 — Scope decision that sizes the whole sprint

### R4. Does "Klokd live" require a Phase-3 ranking-query client, or not?
There is a direct contradiction between two authoritative statements, and it changes what Mumbua builds on Day 3:

- **§18.5.6a "Klokd live" definition (d)** and **D6** both require `POST /v1/ranking/query` to return `fallback_active: false` before Klokd is "live."
- **Klokd's advisory** (`OPERATOR_REQUEST_HAKKEN.md §0`, option (a), which the same guide cites as accepted) **defers ranking to Phase 3 (Sprint 8+)**. Klokd's Phase-1 client deliberately has **no `rankingQuery` method** (confirmed in our audit — register + publish + revoke + retire only).

**We need one answer:** for the MVP-gate sense of "Klokd live on Hakken," is **register + publish + revoke + retire (Phase 1) sufficient**, with ranking genuinely deferred to Sprint 8+ — OR does the pilot smoke (D6) require Klokd to build a throwaway `rankingQuery` client now purely to assert `fallback_active: false`? If the latter, that is net-new Phase-1 scope for Mumbua that the advisory says is Phase 3, and we need it named explicitly.

---

## Part 3 — Needed to operate the pilot (not launch-blocking, but D7 depends on them)

### R5. How does Klokd read its own pilot KPIs without operator access?
D7 asks Klokd for a 5-metric dashboard (registered employers, workers, shifts/day, fallback rate, trace-propagation). The only stated source is `GET /v1/admin/observability`, which the guide says is **"admin bearer token only; not consumer-facing"** and gated on `ADMIN_API_TOKEN` (A5, pending Chamia). The guide even hedges: *"Wire into pilot Grafana / Looker if you have operator access."*

**We need one of:** (a) an admin token scoped to Klokd's own app slice, (b) a consumer-facing per-app stats endpoint, or (c) explicit confirmation that Klokd derives its own KPIs from its own `audit_log` (entity/broadcast counts, `hakken.deferred.*` rate) and only the *rail-side* fallback rate comes from you. We can build against (c) today if that's the intent — just confirm, so we don't wait on an operator token we're not meant to get.

### R6. Test-on-prod hygiene — no staging, and we can't hard-delete entities
Day-1 heads-up #1 says Hakken has no staging; smokes run on prod with `external_ref` markers and operators purge. Two problems for repeated Day 1-3 smokes:
- (a) The endpoint table has **no `DELETE /v1/entities/:id`** — only `PATCH status=retired`. So our test entities **linger as `retired`** and inflate the per-app entity count (which is itself a pilot KPI, R5). Is there a self-serve hard-delete, or a `external_ref` prefix convention you filter out of KPI counts?
- (b) Is there a separate test slug (e.g. `klokd_test`) so Mumbua's smokes don't pollute the real `klokd` app's discovery index and counts? Or should we reserve an `external_ref` prefix (e.g. `klokd:smoke:*`) that you exclude?

---

## Part 4 — Guidance the guide leaves open

### R7. Backoff schedule for our deferral retry sweep (D2)
Klokd is building the retry sweep (D2) that replays `hakken.deferred.*` audit rows. The guide says retry only `IDEMPOTENCY_KEY_IN_FLIGHT` "with backoff" and `5xx` is retryable, but specifies **no backoff schedule or max-attempt cap**. Given the single-replica pilot (known-limits table), what backoff + cap do you recommend so the sweep doesn't hammer you? We'll default to exponential 5-attempt unless you prefer otherwise.

### R8. Correct `consent_scope` for `shift_open` under DPA 2019
Klokd currently publishes shifts with `consent_scope: 'cross_app_optional'` (`hakken.service.ts:250`). The guide lists the three scopes but gives no guidance on which is correct for a two-sided labour shift. Confirm `cross_app_optional` is the right default, or whether worker-side discoverability should be `single_app` until explicit cross-app consent is captured. This is a compliance decision we'd rather align with you than guess.

---

## What is NOT on this list (so you know we checked)
- Wire format, auth header shape, banned-key wall, PII wall, TTL bounds, idempotency taxonomy, error codes — all in §18.5.6, all built against, all conformant.
- Todoku outbox / HK-11-B1 — confirmed **not applicable to Klokd Phase 1** (Klokd consumes none of Hakken's outbox; zero grep matches in `octopus-api/src`). No action wanted from you here.
- `pay_rate_kes` units — resolved (whole KES, `fbe1040`); our code is correct.
- Identiti `POST /v1/customers` / KYC / activation / step-up (B5) — **done and live-verified 22-23 Jul at Identiti 0.1.2**, deployed on Klokd's Railway. No longer a blocker for the tier ≥ 1 registration trigger.

---

**Priority order if you're triaging:** R1 (blocks publish) and R4 (sizes the sprint) first; R3 + R2 next (first real auth); R5/R6 before Day 3 smoke; R7/R8 are quick confirmations.

*Composed by Klokd's session after reading the guide's Hakken sections against Klokd's actual client code. Every ask is a genuine gap, not a re-request of documented material.*
