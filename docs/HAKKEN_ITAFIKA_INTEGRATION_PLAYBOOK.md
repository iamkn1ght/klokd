# Hakken + Itafika Integration Playbook — Klokd & Lunch Drop Consumers

**Authored:** Chamia Mutuku (CEO · KMV) — synthesized from Silvia's rail-side integration reference (Hakken commit `cddc8a9`, 11 Jun) + Itafika rail-side handover (commit `24ac829`, 22 Jun) + master RECAP 23 Jun.
**Audience:** A fresh Claude Code session opened at either `C:\Projects\Klokd\` or `C:\Projects\lunch drop\` whose job is to wire that app to **Hakken** (and, for Lunch Drop only, also **Itafika**).
**Status:** Canonical cross-cutting playbook. Per-rail wire contracts live in the dedicated reference docs (§1). Where this playbook conflicts with a rail's own reference doc, the rail's reference doc wins.

> **Read this once at session start.** Then live in §6 (Day 1 / Day 2 / Day 3 work plan) and refer back to §2 (shared pattern) + §3 (per-rail summary) as you go.

---

## 0. What this is — in one paragraph

KMV has six rails. Two of them — **Hakken** (cross-app discovery) and **Itafika** (logistics-as-a-service) — both expect consuming apps to call a small surface of HTTP endpoints with a specific HMAC discipline. Klokd consumes Hakken (per advisory §2.4 + delta S5-NEW-01 + S8-NEW-01) and the `klokd_two_sided_v1` plugin. Lunch Drop consumes Hakken (per the shipped `lunch_drop_v1` plugin) AND Itafika (per IT-S5, the anchor #1 dispatch joint). Klokd does NOT consume Itafika — there's no canonical Klokd-Itafika scope in any pack, and an integration session must not invent one. This playbook is the single source of truth for the patterns that apply to both rails: where the HMAC client lives, what env vars to set, how audit propagation works, what the Money-Rule carve-out means, and what's gated on operator delivery.

---

## 1. Authority docs (read at session start)

### Cross-cutting (this folder)
- `c:\Projects\Platform Rails-instruction pack v1-reboot pack v1.2\HAKKEN_ITAFIKA_INTEGRATION_PLAYBOOK.md` — this doc
- `c:\Projects\Platform Rails-instruction pack v1-reboot pack v1.2\RECAP.md` — programme tracker; see §1.3 Hakken row + Itafika row for current rail-side state (`master RECAP 23 Jun 2026`)
- `c:\Projects\Platform Rails-instruction pack v1-reboot pack v1.2\App_Integration_Guide_v1_0.md` — canonical cross-rail integration patterns + Appendix B (Itafika consuming-app profile)

### Per-rail reference (the source-of-truth wire contracts)
- **Hakken** (both apps): `<your-app>/docs/HAKKEN_INTEGRATION_REFERENCE.md` — Chamia-authored 22 Jun, self-contained wire contract. §2 auth (interim header pair), §3 tracing + idempotency, §4 §10.7 banned-key wall, §5 PII wall, §6 endpoints (entities + broadcasts + ranking), §7 outbox events, §8 error codes, §9 curl smoke, §10 rail-side smoke paths.
- **Itafika** (LD only): `C:\Projects\lunch drop\docs\ITAFIKA_INTEGRATION_REFERENCE.md` — Silvia-authored 22 Jun, secret-free mirror of `c:\Projects\itafika\docs\INTEGRATOR_HANDOVER_LUNCHDROP.md` (commit `24ac829`). Covers IT-S5 anchor `lunchdrop` (`anchor_id = 02e311c8-00ca-46a4-8769-5d37083723a5`), asymmetric HMAC encoding (base64 out, hex in), 9-state job machine, 5 webhook events.

### Per-app local docs
- **Klokd**: `C:\Projects\Klokd\INSTRUCTION_PACK.md` (v3 build pack, 9 Jun) · `OPERATOR_REQUEST_HAKKEN.md` (OI-05) · `chamia new docs/klokd_rails_integration_advisory.md` §2.4 · `chamia new docs/klokd_sprint_backlog_delta_silvia_v1.1.md` (S5-NEW-01, S8-NEW-01) · `KMV_RAILS_INTEGRATION_GUIDE.md` (cross-app HMAC + envelope + idempotency canonical pattern)
- **Lunch Drop**: `C:\Projects\lunch drop\docs\v2-canonical\` (v2 reboot pack — Founding Mamas locked) · `docs/AUTH_MIGRATION_NOTES.md` · `docs/LD5_CUTOVER_RUNBOOK.md` · `docs/HAKKEN_INTEGRATION_REFERENCE.md` · `docs/ITAFIKA_INTEGRATION_REFERENCE.md` · local `KMV_RAILS_INTEGRATION_GUIDE.md`

### Rail-side (read-only — do NOT modify from a consumer session)
- Hakken: `C:\Projects\hakken\INSTRUCTION_PACK.md` · `src/plugins-impl/lunchDropV1.ts` + `klokdTwoSidedV1.ts` · `docs/pilots/lunch-drop-integration.md` + `docs/pilots/klokd-integration.md` · `scripts/lunchDropSmoke.ts` + `scripts/pilotSmoke.ts`
- Itafika: `C:\Projects\itafika\INSTRUCTION_PACK.md` · `docs/INTEGRATOR_HANDOVER_LUNCHDROP.md` · `docs/IT-S5_LUNCHDROP_JOINT.md` · `openapi.yaml` · `src/plugins/anchorAuth.ts` (inbound verifier) · `src/lib/webhookSigner.ts` (outbound signer)

---

## 2. The shared rail-consumption pattern — what both rails have in common

### 2.1 Client location

Every rail client lives at the same path shape, mirroring how Identiti / Todoku / KP / Helpan were wired:

```
apps/api/src/rails/<rail>/
  client.ts          — HMAC-signed HTTP client (the wire layer)
  webhook.ts         — receiver, signature-verify, idempotency dedup  (rails that push)
  templates.ts       — (Hakken: payload shapes; Itafika: not applicable)
  types.ts           — request/response envelope types
  index.ts           — public surface
```

For Hakken: only `client.ts` + payload shapes (Hakken does **not** push webhooks to apps — entity/broadcast events flow to Todoku via the rail's outbox; see §3.1).
For Itafika: `client.ts` + `webhook.ts` (Itafika pushes 5 job-lifecycle events to the anchor app).

### 2.2 Env vars

Three per rail, no more. Each app has its own `app_slug` and its own per-app secret.

```
# Hakken
HAKKEN_BASE_URL    = https://hakken-production.up.railway.app
HAKKEN_APP_KEY     = klokd | lunch_drop        (= app_slug; the rail uses this as identity)
HAKKEN_APP_SECRET  = <per-app secret from Silvia>
# Note: Hakken ALSO requires an Identiti customer JWT on every protected call
#       (Authorization: Bearer <jwt>). The JWT MUST carry aud=hakken
#       (in addition to iss=$IDENTITI_JWT_ISSUER, sub=<user_uuid>). Audience
#       mismatch → 401 AUTH_JWT_AUDIENCE on the first call. If your app already
#       mints JWTs for its own audience (e.g. aud=klokd or aud=lunch_drop),
#       mint a SECOND JWT specifically for Hakken, or extend your audience
#       claim to include `hakken`.

# Itafika (Lunch Drop only — no Klokd-Itafika scope)
ITAFIKA_BASE_URL   = https://itafika-production.up.railway.app
ITAFIKA_APP_ID     = lunchdrop
ITAFIKA_APP_SECRET = <hex 64 chars from 1Password>
# There is NO ITAFIKA_WEBHOOK_SECRET — outbound + inbound both use ITAFIKA_APP_SECRET.
```

No `*_WEBHOOK_SECRET` on either rail. Itafika reuses `ITAFIKA_APP_SECRET` for inbound webhook verification. Hakken doesn't push webhooks.

**Naming gotcha:** Hakken uses `_APP_KEY` (= app_slug); Itafika uses `_APP_ID` (= anchor slug). Different env var names for the same identity concept — don't cross-wire them.

### 2.3 HMAC discipline — the two rails diverge here

This is the single most important section. The rails LOOK similar but they're wire-different. Get this wrong and you eat 401s.

| Aspect | Hakken (pilot mode) | Itafika |
|---|---|---|
| **Outbound auth** | THREE-header pair: `Authorization: Bearer <identiti-jwt-with-aud=hakken>` + `X-Hakken-App-Key: <slug>` + `X-Hakken-App-Secret: <secret>`. **JWT MUST carry `aud=hakken`** — audience mismatch returns `401 AUTH_JWT_AUDIENCE`. | Single Authorization line + 2 x-itafika-* headers: `Authorization: Itafika-HMAC-SHA256 app_id=lunchdrop, signature=<base64>` + `x-itafika-timestamp` + `x-idempotency-key` |
| **Signature encoding (outbound)** | No HMAC signature on the wire today — just the secret is sent in `X-Hakken-App-Secret`. **Full HMAC scheme `Authorization: Hakken-HMAC-SHA256 t=…,v1=…` lands post-pilot (HK-9 swap).** | `base64( HMAC-SHA256(canonical, secret) )` |
| **Canonical string** | n/a in pilot mode | `METHOD \n PATH_AND_QUERY \n CONTENT_TYPE \n TIMESTAMP \n SHA256_HEX(rawBody)` |
| **Content-Type on bodyless GET** | n/a — pilot mode doesn't sign | **Empty string** in the canonical, AND send no Content-Type header. Signing a constant on GET → 401. This bit the Identiti integration; bake it in from day 1. |
| **Inbound (rail → app)** | No inbound webhooks. Events go via Todoku outbox (subscribe with your existing Todoku rail client). | Hex HMAC: `X-Itafika-Signature: hex( HMAC-SHA256( "<timestamp>.<rawBody>", secret ) )` + `X-Itafika-Event` + `X-Itafika-Timestamp`. Verify raw bytes, constant-time, reject >300s drift, dedupe on `job_id + event`. |
| **Replay window** | n/a (pilot mode) | 300s |
| **Idempotency** | `Idempotency-Key` header (1-200 chars). Honored on POST `/v1/entities` + POST `/v1/broadcasts`. **409 taxonomy** — retry ONLY on `IDEMPOTENCY_KEY_IN_FLIGHT` (earlier same key still processing, back off and retry); `IDEMPOTENCY_KEY_CONFLICT` (same key, different body) and `ENTITY_EXISTS` (duplicate `external_ref`) are TERMINAL — surface as errors, do NOT retry (would hot-loop the rail). `IDEMPOTENCY_KEY_INVALID` (bad format) is also terminal. | `x-idempotency-key: <UUIDv4>` on POST / PATCH / DELETE. **Two idempotency layers:** the header AND `anchor_reference_id` (per-job) — re-create with the same `anchor_reference_id` returns the existing job. |
| **Traceparent** | `traceparent: 00-<32-hex>-<16-hex>-01` recommended on every protected POST. Propagates to audit_log + event_outbox + outbound Todoku envelope. | Same shape recommended on every protected POST. Itafika propagates it through to its own audit + Kafka. |

**Build the client once for each rail with these as configuration.** Don't build a shared "rail HMAC client" — the rails diverge enough that one helper would have more flags than logic.

### 2.4 Audit propagation — both rails follow the same §A.11 invariant

On every audit_log row your app writes for a rail-side action, set:

```
traceparent       = the value you sent in the rail call
business_op_id    = your domain id — shift_id (Klokd) or kitchen_id / order_id (LD) or job's anchor_reference_id (Itafika)
request_id        = from the rail response envelope's meta.request_id
```

This is the §A.11 cross-rail invariant from the Reboot Pack. Both rails propagate it for you when you send the headers + the appropriate `external_ref` / `business_op_id` in the body.

### 2.5 Money Rule carve-out — when sub-agents are and aren't safe

Per the feedback memory `[[feedback-subagent-parallelism-default]]`: sub-agent parallelism is the default for mass mechanical work. **Money-touching code is the carve-out** — payment integration, idempotency-keyed money operations, signature verification on payment webhooks. Specifically:

- **Hakken integration: NO money code anywhere.** Hakken is a discovery rail. The §10.7 banned-key wall (see §3.1 below) rejects any payload containing `amount`, `currency`, `funds`, `credit`, etc. Sub-agents OK for everything in the Hakken integration.
- **Itafika integration: payment-touching code stays in main loop.** Itafika charges your KP account internally via KP-16 on delivery — but the `webhook.ts` receiver for `job.delivered` (which is the trigger that commits delivery-fee reconciliation in your books) is payment-adjacent. Hand-write that. Hand-write the inbound HMAC verifier. Sub-agents OK for the outbound `client.ts` quote/create/get/cancel paths.

### 2.6 Smoke parity — match the rail-side script

For each rail, the rail-side `scripts/` folder has a smoke script that asserts the integration is alive. If your client exercises the same sequence with the same assertions, you have parity with what the rail thinks "integrated" means.

- Hakken: `c:\Projects\hakken\scripts\lunchDropSmoke.ts` (LD path) + `pilotSmoke.ts` (Klokd path)
- Itafika: encoded in the create flow demonstrated in `c:\Projects\itafika\docs\INTEGRATOR_HANDOVER_LUNCHDROP.md` §8 (smoke recipe verified on dev 22 Jun returning 201, `price_minor 19000`)

Author `apps/api/scripts/smoke-hakken.ts` and `apps/api/scripts/smoke-itafika.ts` matching these exactly.

---

## 3. Per-rail summary

### 3.1 Hakken

**Both Klokd and Lunch Drop consume.** Single rail, two plugins (one per app), enforced at the rail level by `app_slug`.

| Aspect | Klokd | Lunch Drop |
|---|---|---|
| Plugin | `klokd_two_sided_v1@v1` (HK-7 shipped) | `lunch_drop_v1@v1` (HK-6 shipped) |
| Entity types you register | `entity_type=employer` with `role_flags=["publisher","employer"]` + `entity_type=worker` with `role_flags=["worker"]` | `entity_type=kitchen` with `role_flags=["publisher"]` |
| Broadcast types you publish | `shift_open` (emits `hakken.shift_opening` outbox event), `shift_filled` + `availability` (publish-only, no outbox echo) | `lunch_ready` + `special` (both emit `hakken.fresh_arrivals`), `restock` (emits `hakken.basket_auto_refill`) |
| Ranking query type | `two_sided` (Pass 1: workers for an employer's shift, `user_role=consumer`; Pass 2: shifts for a worker, `user_role=publisher`) | `one_sided` (consumer) |
| Outbox events your Todoku tenant subscribes to | `hakken.entity.created` + `.updated` + `.deactivated` + `hakken.shift_opening` + `hakken.tier_changed` + `hakken.consent_scope_changed` | `hakken.entity.created` + `.updated` + `.deactivated` + `hakken.fresh_arrivals` + `hakken.basket_auto_refill` + `hakken.tier_changed` + `hakken.consent_scope_changed` |

**Broadcast envelope (both apps) — required body fields:**

```
{
  "publisher_id":   "<server-assigned entity_id (UUID) returned from POST /v1/entities>",
  "broadcast_type": "<per-vertical, see above>",
  "payload":        { ... vertical-specific, ≤64 KB ... },
  "geo":            { "lat": <number>, "lng": <number> },
  "geo_label":      "<optional human label>",
  "consent_scope":  "single_app | cross_app_optional | cross_app_required",   // REQUIRED
  "ttl_at":         "<ISO-8601 future timestamp, ≤ now + 168h>"                // REQUIRED — past = 422 TTL_PAST; >168h = 422 TTL_TOO_FAR
}
```

**`publisher_id` discipline:** it's the server-assigned `entity_id` (UUID) Hakken returns from POST `/v1/entities` — NOT your internal `employer_id` / `kitchen_id` / external_ref. **Cache the returned entity_id keyed by your internal id at registration time**, and reuse it on every broadcast for that publisher. A naive `publisher_id = "klokd:emp:42"` returns `404 PUBLISHER_NOT_FOUND`.

**Hard rules (from the §10.7 banned-key wall — both apps):** never send `amount`, `currency`, `monetary_value`, `kes_amount`, `funds`, `credit`, `transfer`, `disburse`, `debit`, `refund`, `withdraw`, `deposit`, `money`, `balance`, `settlement`, `commission`, `ledger`, `usd_amount`, `yield`, `float`, `source_payment`*  in any payload at any depth — rejected with `422 REGULATORY_CONTAINMENT_VIOLATION` before schema validation. \*`source_payment` is **carved out for `/v1/entities/` and `/v1/tiers` only** — banned elsewhere. **Approved alternatives:** `pay_rate_kes: 800` (Klokd integer minor units), `price_range_kes: [200, 350]` (LD array of integer minor units), `tier_slug: 'boosted'` (never `monetary_value`).

**PII wall (both apps):** no raw MSISDN (`+254…`, `254…`, `07…`, `01…`), no email, no two-word capitalised names, no `name`/`full_name`/`first_name`/`last_name` on any non-empty value. Use opaque IDs: `publisher_id`, `worker_id`, `shift_id`, `kitchen_id`.

**Phase model (Klokd):** Phase 1 (Sprint 5, per S5-NEW-01) ships entity registration + broadcast publishing only — non-blocking calls. Phase 3 (Sprint 8+, per S8-NEW-01 + AD-K09) swaps Klokd-internal `GET /shifts/available` for Hakken-backed `POST /v1/ranking/query`. **Do not start Phase 3 in a Phase 1 session.**

**Phase model (Lunch Drop):** No phasing — register kitchens + publish `lunch_ready` / `restock` broadcasts + (later) query for discovery. All buildable in one stretch when LD dev cycles allow.

### 3.2 Itafika

**Lunch Drop only.** No Klokd-Itafika joint exists in any canonical doc — see §3.3.

Per IT-S5 (rail-side fully provisioned + smoke-verified 22 Jun on dev — see master RECAP §1.3 Itafika row):

| Aspect | Lunch Drop |
|---|---|
| Anchor | `lunchdrop` (status `active`, `anchor_id = 02e311c8-00ca-46a4-8769-5d37083723a5`) |
| Endpoints you call | `POST /v1/jobs/quote` (price, no create) · `POST /v1/jobs` (create dispatch, idempotent) · `GET /v1/jobs/{job_id}` (state) · `POST /v1/jobs/{job_id}/cancel` (pre-DELIVERED only) |
| Job state machine | `PENDING_ASSIGNMENT → ASSIGNED → AT_PICKUP → IN_TRANSIT → AT_DROPOFF → DELIVERED → SETTLED` + `CANCELLED` / `FAILED` from any pre-DELIVERED state |
| Webhook events you receive | `job.assigned`, `job.picked_up`, `job.delivered`, `job.failed`, `job.cancelled`. **`IN_TRANSIT`, `AT_DROPOFF`, `SETTLED` do NOT emit anchor webhooks — poll `GET /v1/jobs/{id}`** if you need those. |
| Money handling | Itafika charges YOUR KP account (anchor → Itafika) on delivery, via KP-16 internally. You do NOT call KP-16 for delivery fees. You just supply your KP `account_uuid` for Itafika to charge. Money Rule does not require hand-writing the dispatch path — only the `webhook.ts` receiver where you commit delivery-fee reconciliation. |
| Idempotency layers | TWO — `x-idempotency-key` header (per request) + `anchor_reference_id` field (per job, your order id) |

**What Lunch Drop does NOT do for Itafika:** anchor registration (operator-only), KP-16 charge initiation (Itafika does it internally), rider management / KYC / payouts (all rail-internal).

### 3.3 Klokd-Itafika is explicitly out of scope

There is NO Klokd-Itafika joint in any canonical doc:

- The Klokd v3 advisory (`chamia new docs/klokd_rails_integration_advisory.md`) does not mention Itafika.
- The Klokd Sprint Backlog Delta v1.1 has no Itafika story.
- The Itafika rail roadmap has IT-S5 (Lunch Drop) and IT-S6 (Sabakifresh) as the two anchor patterns — no `klokd` anchor seeded.

If a Klokd session is told to "wire to Itafika," it MUST refuse to author code and ask Chamia to confirm one of:

(a) Cross-pool: Klokd workers as Itafika rider candidates (shared Identiti tier-1 KYC, opt-in). New rail-side scope needed.
(b) Worker-transport for Klokd Europa: out-of-scope for Itafika (flight/visa logistics, not LaaS).
(c) Delivery-of-payslips / uniforms: edge case, small volume. Maybe.
(d) None — Klokd doesn't need Itafika. Park the thread.

Defer to Chamia. Do not invent.

---

## 4. Per-app consumption matrix

What each app needs to implement, end-to-end:

| | Hakken (Klokd) | Hakken (Lunch Drop) | Itafika (Lunch Drop) |
|---|---|---|---|
| `client.ts` | ✓ — header-pair auth | ✓ — header-pair auth | ✓ — base64 HMAC, asymmetric encoding |
| `webhook.ts` | ✗ — events via Todoku | ✗ — events via Todoku | ✓ — hex HMAC verifier, dedupe on `job_id + event` |
| Entity registration | `employer` + `worker` POST + PATCH | `kitchen` POST + PATCH | n/a (operator-only) |
| Broadcast publishing | `shift_open` (P1), `shift_filled`, `availability` | `lunch_ready`, `special`, `restock` | n/a |
| Ranking query | Phase 3 only (Sprint 8+) — two-sided | One-sided consumer query | n/a |
| Dispatch / job lifecycle | n/a | n/a | quote + create + get + cancel; 5 webhook events |
| KP coupling | none direct (Hakken doesn't touch money) | none direct | KP `account_uuid` registered on anchor; Itafika charges KP internally |
| Smoke script | `smoke-hakken.ts` mirroring `pilotSmoke.ts` | `smoke-hakken.ts` mirroring `lunchDropSmoke.ts` | `smoke-itafika.ts` mirroring §8 of Itafika ref doc |
| Tests (estimate) | ~10 unit (HMAC + envelope + payload shapes) + 1 integration smoke | ~10 unit + 1 integration smoke | ~10 unit + 1 integration smoke |

---

## 5. Pre-flight checklist (run before opening any source file)

### 5.1 Confirm rail-side state

- [ ] Hakken production is up: `curl https://hakken-production.up.railway.app/v1/health` → 200
- [ ] Itafika production is up: `curl https://itafika-production.up.railway.app/v1/health` → 200 *(Lunch Drop only)*
- [ ] Read the per-rail integration reference doc(s) in your app's `docs/` folder end-to-end
- [ ] Read the §1.3 Hakken row + (LD) Itafika row of the master RECAP for current rail-side status

### 5.2 Confirm credentials

- [ ] `HAKKEN_APP_SECRET` for your app_slug from Silvia (1Password) → loaded into `.env` (NOT committed)
- [ ] Identiti customer JWT minting works in your app AND the JWT carries `aud=hakken` (in addition to `iss=$IDENTITI_JWT_ISSUER`, `sub=<user_uuid>`). **If your existing app mints JWTs for its own audience (e.g. `aud=klokd` / `aud=lunch_drop`), you must either mint a SECOND JWT for Hakken or extend your audience claim.** Audience mismatch returns `401 AUTH_JWT_AUDIENCE` on every protected POST.
- [ ] **Lunch Drop only:** `ITAFIKA_APP_SECRET` (64-char hex) from Silvia (1Password) → `.env` (NOT committed)

### 5.3 Baseline

- [ ] Run `pnpm typecheck && pnpm test` and confirm green at HEAD. Do NOT start integration work on a broken baseline.

### 5.4 Confirm you have the right session

- [ ] You're at `C:\Projects\Klokd\` OR `"C:\Projects\lunch drop\"` (folder name has a SPACE — quote any path argument)
- [ ] NOT in a rail folder (do not modify `C:\Projects\hakken\` or `C:\Projects\itafika\` from a consumer session)

---

## 6. Work plan (3-day rhythm per rail)

### 6.1 Klokd — Hakken integration (Phase 1 only)

**Day 1 — Authority + scaffold**
- Read this playbook + `docs/HAKKEN_INTEGRATION_REFERENCE.md` + `chamia new docs/klokd_rails_integration_advisory.md` §2.4 + `klokd_sprint_backlog_delta_silvia_v1.1.md` S5-NEW-01
- Scaffold `src/rails/hakken/client.ts` mirroring `PaymentRailClient` shape from `src/rails/payment-rail/client.ts` (your existing pattern)
- 4 unit tests for the three-header pair + Identiti JWT injection + idempotency-key handling

**Day 2 — Entity registration + broadcast publishing (background jobs, non-blocking)**
- Wire `POST /v1/entities` for `employer` (`role_flags=["publisher","employer"]`, `external_ref="klokd:emp:<id>"`) on KYC tier ≥ 1 KYC_TIER_CHANGED webhook + `worker` (`role_flags=["worker"]`, `external_ref="klokd:worker:<uuid>"`) on same trigger. **Cache the returned `entity_id` (UUID) keyed by your internal id** — you need it as `publisher_id` on every broadcast for that publisher (a naive `publisher_id = "klokd:emp:42"` returns 404 PUBLISHER_NOT_FOUND).
- Wire `PATCH /v1/entities/:id` for rating / availability changes (workers) + `PATCH` with `status='retired'` for off-boarding
- Wire `POST /v1/broadcasts` for `shift_open` (on shift posted). Body: `{ publisher_id: <cached entity_id UUID>, broadcast_type: "shift_open", payload: { shift_id, role, shift_start_at, shift_end_at, pay_rate_kes, certifications_required, sector, headcount }, geo: { lat, lng }, consent_scope: "cross_app_optional", ttl_at: <shift_end_at, must be ≤ now + 168h> }`. **`consent_scope` and `ttl_at` are REQUIRED** — missing `consent_scope` schema-fails; `ttl_at > now + 168h` returns 422 TTL_TOO_FAR; `ttl_at ≤ now` returns 422 TTL_PAST.
- Wire `DELETE /v1/broadcasts/:id` for shift filled / cancelled (soft-revoke before TTL). Note: expired broadcasts are reaped by Hakken's own TTL sweeper; DELETE on an already-expired broadcast may 404 — treat as success.
- Idempotency-Key = your `shift_id` / `employer_id` / `worker_account_uuid` (deterministic per business operation). **409 handling**: retry only `IDEMPOTENCY_KEY_IN_FLIGHT` (with backoff); surface `IDEMPOTENCY_KEY_CONFLICT` + `ENTITY_EXISTS` as terminal errors (do NOT hot-loop).
- All as background jobs — upstream Klokd flow completes regardless; failures logged to your own `audit_log` and retried with exponential backoff
- 6 unit tests + 1 integration smoke

**Day 3 — Verification + propagation tests**
- Author `scripts/smoke-hakken.ts` mirroring `C:\Projects\hakken\scripts\pilotSmoke.ts`
- §A.11 propagation test: assert `traceparent` + `business_op_id` flow from inbound Klokd HTTP → your audit_log → Hakken request headers
- Test the §10.7 banned-key wall: send `{"amount": 100}` in a metadata bag → expect 422 `REGULATORY_CONTAINMENT_VIOLATION`
- Document result in `docs/HAKKEN_INTEGRATION_RESULT.md`
- Author OPERATOR_REQUEST_HAKKEN.md follow-up if any gaps surfaced

**Out of scope for this session:** Phase 3 ranking-query swap (Sprint 8+). Klokd-Itafika (no joint exists).

### 6.2 Lunch Drop — Hakken integration

**Day 1 — Authority + scaffold**
- Read this playbook + `docs/HAKKEN_INTEGRATION_REFERENCE.md` + `docs/v2-canonical/` (Founding Mamas + brand) + `KMV_RAILS_INTEGRATION_GUIDE.md`
- Scaffold `apps/api/src/rails/hakken/client.ts` mirroring `apps/api/src/rails/helpan/client.ts` shape (your most-recently-aligned client)
- 4 unit tests for three-header pair + Identiti JWT injection + idempotency

**Day 2 — Kitchen registration + meal broadcasts**
- Wire `POST /v1/entities` for `kitchen` (`role_flags=["publisher"]`, `external_ref="ld:kitchen:<id>"`) on Mama onboarding flow completion in `apps/zm-portal/`. **Cache the returned `entity_id` (UUID)** — you need it as `publisher_id` on every broadcast for that kitchen.
- Wire `PATCH /v1/entities/:id` for kitchen `display_name` / `geo` / `metadata` updates + `PATCH` with `status='retired'` for off-boarding
- Wire `POST /v1/broadcasts` for `lunch_ready` (fresh batch — payload includes `items[]` with `price_range_kes`), `special` (limited-time), `restock` (basket refill — emits `hakken.basket_auto_refill`). Body envelope: `{ publisher_id: <cached entity_id UUID>, broadcast_type, payload, geo: { lat, lng }, consent_scope: "cross_app_optional" | "single_app", ttl_at: <available_until_at, ≤ now + 168h> }`. **`consent_scope` and `ttl_at` are REQUIRED**; `ttl_at > now + 168h` → 422 TTL_TOO_FAR; `ttl_at ≤ now` → 422 TTL_PAST.
- Wire `DELETE /v1/broadcasts/:id` for soft-revoke before TTL (note: expired broadcasts are reaped automatically; DELETE on expired = 404, treat as success)
- 10 unit tests + 1 integration smoke

**Day 3 — Discovery query + verification**
- Wire `POST /v1/ranking/query` with `vertical=lunch_drop`, `user_role=consumer`, `query_type=one_sided` for meal/kitchen discovery (the buyer-app feed)
- Author `scripts/smoke-hakken.ts` mirroring `C:\Projects\hakken\scripts\lunchDropSmoke.ts`
- Banned-key wall + PII wall test rounds
- Document in `docs/HAKKEN_INTEGRATION_RESULT.md`

### 6.3 Lunch Drop — Itafika integration (IT-S5)

**Day 1 — Authority + scaffold**
- Read this playbook + `docs/ITAFIKA_INTEGRATION_REFERENCE.md` + `KMV_RAILS_INTEGRATION_GUIDE.md`
- Scaffold `apps/api/src/rails/itafika/client.ts` — **base64 outbound HMAC**, asymmetric encoding (this is the diff vs Hakken)
- **Critical:** bake the bodyless-GET rule (empty Content-Type in canonical, no Content-Type header sent) from day 1 — Silvia called this out as the bug that bit Identiti
- 4 unit tests covering: bodied POST signature, bodyless GET signature, replay-window rejection, Idempotency-Key behaviour

**Day 2 — Dispatch surface + webhook receiver (Money-Rule callout)**
- Wire `POST /v1/jobs/quote` + `POST /v1/jobs` (use your `order_id` as `anchor_reference_id` — second idempotency layer) + `GET /v1/jobs/{job_id}` + `POST /v1/jobs/{job_id}/cancel`
- **Hand-write** `apps/api/src/rails/itafika/webhook.ts` — hex HMAC verifier, raw-byte constant-time compare, 300s replay window, dedupe on `job_id + event`. **This stays in main loop (Money-Rule carve-out).** Sub-agents OK for the outbound client; the inbound verifier is payment-adjacent.
- Wire receivers for the 5 anchor webhook events: `job.assigned`, `job.picked_up`, `job.delivered`, `job.failed`, `job.cancelled`
- On `job.delivered`: commit delivery-fee reconciliation against your KP statement (this is the payment-touching path — main loop)
- 10 unit tests + 1 integration smoke

**Day 3 — Smoke + operator delivery**
- Author `scripts/smoke-itafika.ts` matching §8 of `docs/ITAFIKA_INTEGRATION_REFERENCE.md` (the recipe that returned 201 on dev 22 Jun)
- Confirm with operator: **`webhook_callback_url`** has been registered on the `lunchdrop` anchor row (until then no webhooks are delivered; create+poll still works) + **KP `account_uuid`** has been supplied
- Document in `docs/ITAFIKA_INTEGRATION_RESULT.md`

### 6.4 Cross-rail consistency check (at end of any session)

- Both clients use the same `KMV_RAILS_INTEGRATION_GUIDE.md` envelope conventions
- Both have `traceparent` propagation tests
- Both have audit-log writes with `business_op_id` set (your domain id)
- Test count went UP, didn't go DOWN
- `pnpm typecheck && pnpm test` clean

---

## 7. Hard rules (non-negotiable)

- **No emojis** in code, commits, or docs (Chamia rule).
- **No `Co-Authored-By: Claude` / "Generated with Claude Code" trailers** in commits (Chamia rule, 15 May 2026).
- **KES integer minor units only** for monetary values that aren't banned. Never floats; never major units; never `currency: 'KES'` (that's a banned key — see §3.1).
- **No raw GPS** in any Hakken call (privacy contract, Hakken D-13). Pass `geo: { lat, lng }` numerically but understand that Hakken stores PostGIS internally and your privacy posture (H3-cell centroid or hash-derived coordinates) is yours to enforce.
- **No PII in any payload** — see Hakken §5 PII wall and apply the same discipline on the Itafika side even though Itafika doesn't enforce it at the rail layer.
- **Money-Rule carve-out:** payment-touching code (Itafika webhook receiver, delivery-fee reconciliation) stays in the main loop. Sub-agents OK for the rest.
- **Confirm scope before significant changes.** Treat "proceed" as full authorization per `[[feedback-rail-folder-canonicalization]]`.
- **Klokd MUST NOT consume Itafika** in this session. If asked, defer to Chamia (§3.3).
- **Do NOT modify the rail repos** (`C:\Projects\hakken\`, `C:\Projects\itafika\`) from a consumer session. Read-only.

---

## 8. Hard blockers (operator-gated, can't proceed past these)

| Blocker | Who | Effect |
|---|---|---|
| **3 stale Identiti integrator HMAC secrets** at operator (14–20 days stale) — `lunchdrop_sandbox`, `itafika_sandbox`, `klokd_sandbox` | Silvia | Without these, you cannot mint Identiti customer JWTs that Hakken accepts on the `Authorization: Bearer` header. **This is the single most consequential block in the whole platform right now** (per master RECAP §8). |
| **Hakken `HAKKEN_APP_SECRET`** for your app_slug | Silvia | Without this, the `X-Hakken-App-Secret` header value is unknown. |
| **Itafika `ITAFIKA_APP_SECRET`** (LD only) | Silvia / 1Password | Delivered out-of-band as of 22 Jun for `lunchdrop` (per Silvia's handover) — confirm it's in the LD team's 1Password. |
| **`webhook_callback_url` registration on `lunchdrop` anchor row** | Silvia (operator) | Until set, no Itafika webhooks delivered. Create + poll still works without it (so Day 2 can proceed; Day 3 webhook tests will not). |
| **KP `account_uuid` supplied to Itafika** | Lunch Drop → Silvia | Until set, KP-16 charging on `job.delivered` is inert. Delivery flow proceeds; settlement does not. |
| **OPS-6 Itafika Railway billing** (trial expired) | Silvia | Blocks any rail-side redeploy. Does NOT block your client work against the currently-deployed dev image. |
| **OD-9 (Klokd dev allocation) + OD-10 (LD dev allocation)** | Chamia → you | The "this resource" — without dev capacity, none of the above runs. |

---

## 9. What to do at the end of the session

Whatever progress was made:

1. Commit with a clean message: `<rail>: integration <phase> for <app>` — NO Claude trailer, NO emojis.
2. Author / update `docs/HAKKEN_INTEGRATION_RESULT.md` (and / or `docs/ITAFIKA_INTEGRATION_RESULT.md`) with: what's wired, what's tested, what's blocked, what's next.
3. If any of the §8 hard blockers tripped: append the discovery to `OPERATOR_REQUEST_<RAIL>.md` (Klokd) or `OPERATOR_STATUS_CHASEUP.md` (Lunch Drop).
4. Report back the test count delta and the green/red state of `pnpm typecheck && pnpm test`.

---

## 10. Cross-reference

- `c:\Projects\Platform Rails-instruction pack v1-reboot pack v1.2\RECAP.md` (master, 23 Jun 2026)
- `c:\Projects\Platform Rails-instruction pack v1-reboot pack v1.2\Sprint_Backlog_v1_0.html` (master sprint visual, 11 Jun snapshot)
- Hakken: `c:\Projects\hakken\INSTRUCTION_PACK.md` · `docs/pilots/lunch-drop-integration.md` · `docs/pilots/klokd-integration.md` · `docs/runbooks/hakken-rail.md`
- Itafika: `c:\Projects\itafika\INSTRUCTION_PACK.md` · `docs/INTEGRATOR_HANDOVER_LUNCHDROP.md` · `docs/IT-S5_LUNCHDROP_JOINT.md` · `openapi.yaml`
- Per-app: Klokd `INSTRUCTION_PACK.md` + `OPERATOR_REQUEST_HAKKEN.md` + `chamia new docs/`; Lunch Drop `docs/v2-canonical/` + `docs/LD5_CUTOVER_RUNBOOK.md` + `OPERATOR_STATUS_CHASEUP.md`

---

*KMV Platform Rails · Hakken + Itafika Integration Playbook for Klokd & Lunch Drop consumers · 23 June 2026 · Confidential*
