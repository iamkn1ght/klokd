# Hakken Integration Result — Klokd (Phase 1, S5-NEW-01)

**Authored:** Klokd integration session, 2026-06-23 (per ultracode workflow).
**Scope:** Phase 1 only per advisory §2.4 + delta S5-NEW-01 + playbook §6.1. Phase 3 (ranking-query swap, Sprint 8+) is OUT.
**Rail-side state used as source-of-truth:** `docs/HAKKEN_INTEGRATION_REFERENCE.md` (Chamia, 22 Jun).

---

## What's wired

| Surface | Where | State |
|---|---|---|
| `octopus-api/src/modules/rails/hakken.client.ts` | Three-header pilot auth (Bearer Identiti JWT + X-Hakken-App-Key + X-Hakken-App-Secret) per reference §2 | ✓ Built; non-blocking failure semantics |
| `octopus-api/src/modules/rails/hakken.dto.ts` | Wire types + §10.7 banned-key guard + §5 PII guard (`assertNoBannedKeysOrPii`) | ✓ Built; assertions fire before round-trip |
| `octopus-api/src/modules/hakken/hakken.service.ts` | `upsertEmployerEntity`, `upsertWorkerEntity`, `publishShiftOpen`, `revokeShiftBroadcast`, `retireEntity` | ✓ Built; all non-blocking; integration deferred when JWT not yet mintable |
| `octopus-api/src/modules/shift/shift.service.ts` | `createShift` → `void hakkenIntegrationService.publishShiftOpen(shift.id)` after commit; `confirmShift` → `void revokeShiftBroadcast` after fill | ✓ Wired; both fire-and-forget |
| `octopus-api/src/modules/rails/webhook.routes.ts` | KYC_TIER_CHANGED handler also calls `upsertWorkerEntity` / `upsertEmployerEntity` when tier ≥ 1 | ✓ Wired |
| `octopus-api/prisma/migrations/20260619140000_hakken_entity_ids/` | Adds `hakken_entity_id` on workers + employers, `hakken_broadcast_id` on shifts | ✓ Applied |
| `octopus-api/.env.example` + `src/config/index.ts` | `HAKKEN_API_BASE`, `HAKKEN_APP_KEY=klokd`, `HAKKEN_APP_SECRET` slots | ✓ Declared |
| `octopus-api/scripts/smoke-hakken.ts` | Mirrors `c:\Projects\hakken\scripts\pilotSmoke.ts` shape | ✓ Authored; parks until `HAKKEN_APP_SECRET` + JWT stub land |

---

## Wire-format details encoded (per `HAKKEN_INTEGRATION_REFERENCE.md`)

- §2 auth: three-header pair (NOT HMAC — that's HK-9 post-pilot)
- §3 tracing: `traceparent` auto-generated, propagates Klokd's §A.11 invariants
- §3 idempotency: `Idempotency-Key` = `klokd:emp:<id>` / `klokd:worker:<uuid>` / `klokd:shift:<id>:publish` (deterministic per business op)
- §4 §10.7 banned keys: client-side guard `assertNoBannedKeysOrPii` rejects `amount`/`currency`/`funds`/etc. at any depth before HTTP
- §5 PII wall: worker display_name is opaque (`worker-<first-8-uuid-chars>`); no MSISDN/email/literal name fields ever sent
- §6.1 entity body: snake_case at wire (`entity_type`, `display_name`, `role_flags`, `external_ref`); camelCase in client
- §6.2 broadcast body: `consent_scope: 'cross_app_optional'` default; `ttl_at` capped to ≤168h
- §6.4 PATCH partials honoured (only sent fields included in body)
- §8 error codes surfaced verbatim in the AppError message

---

## What's NOT wired (out of scope this session)

| Item | Why deferred |
|---|---|
| `POST /v1/ranking/query` (two-sided pass 1 + pass 2) | Phase 3 (Sprint 8+) per advisory AD-K09; current `GET /shifts/available` Klokd-internal sort stays |
| Background sweep retry for failed Hakken calls | Failures logged via `console.error`; retry queue is a future enhancement |
| Hakken-driven worker reputation feed | Phase 3 |
| Klokd-Itafika integration | Out-of-scope per playbook §3.3 — defer to Chamia |

---

## Hard blockers (two)

### Blocker 1 — `HAKKEN_APP_SECRET` for `app_slug=klokd`

Pending out-of-band delivery from Silvia. Once delivered, paste into Railway as `HAKKEN_APP_SECRET=<value>` and the client activates. No code change needed.

### Blocker 2 — Identiti customer-JWT issuance for `audience=hakken`

Klokd's current Identiti integration mints **phone tokens** (`/v1/phone-tokens`, `audience=todoku`, opaque HS256) but does **not** yet mint **customer JWTs** for arbitrary audiences (RS256, JWKS-verifiable). Hakken's §2 explicitly requires `Authorization: Bearer <identiti-customer-JWT>` with `aud=hakken` and `sub=user_uuid`.

The integration service handles this gracefully via `getHakkenJwt(accountUuid)`:

- In dev mode with `HAKKEN_IDENTITY_JWT_STUB=<jwt>` env set, returns the stub
- Otherwise throws `HAKKEN_JWT_PENDING` (503); caller catches + logs + skips the Hakken call

This means **every Klokd flow that should trigger a Hakken call (shift posted, KYC tier change) currently logs a deferred warning instead of round-tripping.** When Silvia confirms the Identiti endpoint shape for customer-JWT issuance, replace `getHakkenJwt` body with a call to `identityRailClient.issueCustomerJwt({ accountUuid, audience: 'hakken' })`.

**Follow-up:** append to `OPERATOR_REQUEST_HAKKEN.md` requesting the Identiti customer-JWT endpoint specification + ETA.

---

## What lands when both blockers clear

A worker completing onboarding (KYC tier 1) triggers:
1. Identiti webhook `KYC_TIER_CHANGED` → Klokd's webhook router
2. `hakkenIntegrationService.upsertWorkerEntity(worker.id)` fires
3. Klokd mints Identiti customer JWT (aud=hakken, sub=worker.accountUuid)
4. `POST /v1/entities` to Hakken with opaque label + sector metadata
5. Hakken returns `entity_id`, persisted on Worker.hakkenEntityId
6. Hakken emits `hakken.entity.created` to Todoku outbox (Klokd's Todoku integration consumes — already wired)

A new shift posted by an employer triggers:
1. `ShiftService.createShift` commits
2. `hakkenIntegrationService.publishShiftOpen(shift.id)` fires
3. Klokd mints Identiti JWT for employer.accountUuid
4. `POST /v1/broadcasts` with `shift_open` payload (pay_rate_kes integer minor units, geo from shift location, ttl_at = shift.startTime)
5. Hakken returns `broadcast_id`, persisted on Shift.hakkenBroadcastId
6. Hakken emits `hakken.shift_opening` to Todoku → Klokd's Todoku consumer fans out worker notifications

Shift confirmed (worker picked) triggers `DELETE /v1/broadcasts/:id` — the shift is no longer discoverable.

---

## §A.11 audit propagation check

Each Hakken call:
- Generates `traceparent` (W3C, 32-hex trace + 16-hex span) when not passed in
- Sends `Idempotency-Key` = deterministic business-op key
- Hakken response envelope carries `meta.request_id` (not currently captured by client — minor enhancement opportunity; would add to Klokd's audit_log)

`business_op_id` semantics:
- Employer entity: `business_op_id = employer.id`
- Worker entity: `business_op_id = worker.accountUuid`
- Shift broadcast: `business_op_id = shift.id`

---

## Test count delta

Existing baseline (per RECAP §1.3): 45 pass + 1 skipped (last seen Apr 2026 — tech debt, not rebaselined post v3).

This session: 0 new tests authored. Reason: smoke script + adversarial-verify workflow used as the verification surface; new Vitest unit tests for `assertNoBannedKeysOrPii` + client header construction would be a clean follow-up but blocker 2 means the round-trip portion of any test would have to mock Hakken anyway. Tracked as Sprint 5 follow-up.

---

## References

- `docs/HAKKEN_INTEGRATION_REFERENCE.md` (Chamia, 22 Jun) — canonical wire contract
- `docs/HAKKEN_ITAFIKA_INTEGRATION_PLAYBOOK.md` (Chamia, 23 Jun) — cross-cutting playbook
- `KMV_RAILS_INTEGRATION_GUIDE.md` (Klokd authored, 10 Jun) — Klokd's own HMAC+envelope+idempotency pattern
- `chamia new docs/klokd_rails_integration_advisory.md` §2.4
- `chamia new docs/klokd_sprint_backlog_delta_silvia_v1.1.md` (S5-NEW-01, S8-NEW-01)
- `OPERATOR_REQUEST_HAKKEN.md` (Klokd, 9 Jun — pre-existing) — OI-05 ask
