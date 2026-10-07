# Klokd → Hakken integration audit

**Date:** 22 Jul 2026
**Auditor:** Claude Code session at `C:\Projects\Klokd\` (read-only audit; no Klokd code modified)
**Against:** `App_Integration_Guide_v1_0.md` §17.3 + §18.5.6 + §18.5.6a (Platform Rails instruction pack v1.2)
**Cross-referenced:** `docs/HAKKEN_INTEGRATION_REFERENCE.md` (local mirror), `hakken/docs/operator-asks/identiti-activation-ask.md §A1`, `hakken/docs/operator-asks/todoku-activation-response.md`, `hakken/docs/pilots/klokd-kickoff-prompt.md`
**Klokd Hakken client commit:** `2c8dc8b` (Phase 1)

> **Scope note.** This is a READ + AUDIT pass. Nothing in Klokd's codebase was modified, committed, or pushed. Every defect below is flagged, not fixed.

> **Path note.** The audit prompt and the kickoff prompt both cite Klokd source as `src/modules/...`. Klokd's API actually lives under `octopus-api/`, and `hakken.service.ts` is in `modules/hakken/`, not `modules/rails/`. All file:line citations below use the **real** paths. See Errata E-2.

---

## 1. Coverage map

The §18.5.6a matrix header says "34 items" but Groups A–G contain **47 rows**. 34 appears to be the Klokd-scoped subset (47 − 11 E-group − A2 − A4). Audited here as all 47, with LD-only rows marked N/A. See Errata E-1.

### Group A — Hakken-rail-side operator items (Silvia + Chamia)

None of these are actionable by Klokd; Klokd's only exposure is A1 landing in its own Railway env.

| # | Status | Evidence / note |
|---|---|---|
| A1 | **Pending** — Silvia → Cornelius | Klokd receiving side is ready: config slot `config.hakken.appSecret` at `octopus-api/src/config/index.ts:65-69`. Transport agreed: Bitwarden Send / onetimesecret / live-call (not 1Password). |
| A2 | **N/A to Klokd** | LD-only (`app_slug=lunch_drop`). |
| A3 | **Done** | Chamia, HK-1 bootstrap — `apps` row for `klokd`. Rail-side; not Klokd-verifiable. |
| A4 | **N/A to Klokd** | LD-only. |
| A5 | **Pending** — Chamia | `ADMIN_API_TOKEN`. Gates `/v1/admin/observability`, which is the data source for **D7**. Klokd's KPI dashboard cannot render without it. |
| A6 | **Pending B1b** — Silvia | `IDENTITI_JWKS_URL` on Hakken's env. |
| A7 | **Pending, non-blocking** — Silvia | REST consent fallback (60s TTL) is acceptable pilot mode. |
| A8 | **Pending, non-blocking** — Silvia + KP | `tx_signal_score = 0` in ranking until live. Phase 3 relevance only. |
| A9 | **Pending, non-blocking** — KP Eng | KP-15 v1.1 materialised views. |
| A10 | **Pending, non-blocking** — Silvia | App-layer `app_id` filters carry tenancy meanwhile. |
| A11 | **Optional** — Silvia | `REDIS_URL`; in-memory cache is HK-4 baseline. |

### Group B — Identiti-side dependencies

| # | Status | Evidence / note |
|---|---|---|
| B1a | **Pending** — Silvia + Identiti Eng | Mechanism decision. **Klokd's vote is (a) dedicated mint endpoint** `POST /v1/customer-jwts { audience: 'hakken' }` — confirmed at `identiti-activation-ask.md §A1` table row (a) "Klokd's stance: Preferred". Consistent with Klokd's per-audience least-privilege pattern. |
| B1b | **Pending** — Identiti Eng | JWKS URL path confirmation; unblocks A6. |
| B2 | **Pending B1a** — Identiti Eng | Mechanism shipped to staging + prod. |
| B3 | **Pending B2** — Cornelius | **Verified accurate.** `identityRailClient` mints `aud=todoku` only: `octopus-api/src/modules/rails/identiti.client.ts:170` (`audience: 'todoku'`), `identiti.dto.ts:50,57` (both hardcode `audience: 'todoku'`). Guide's cited line numbers are correct. |
| B4 | **N/A to Klokd** | LD mirror of B3. |
| B5 | **Done — verified this session, 22 Jul** | Klokd ran `octopus-api/scripts/smoke-identiti.ts` against live Identiti: `createCustomer` → `acc_5efab39a-b88d-4504-8d66-f885d765bdb6` (`state: pending_onboarding`, `tier_0`), `getTier` → `tier_0`, `issuePhoneToken` → `pht_01KY263D23NSGRRS5H5PP6DYDM` (`aud: todoku`). Step-up still fails (`validation_request_invalid`) pending `klokd.*` operation_kind registration — separately tracked, not Hakken-blocking. |
| B6 | **Deferred** — informational | ID-14 Phase 2 signed webhooks. Hakken works without. |

### Group C — Todoku joint-spec reconciliation (HK-11-B1)

| # | Status | Evidence / note |
|---|---|---|
| C1 | **Pending** — Chamia + Silvia + Todoku Eng | Path decision (A/B/C/D); Hakken recommends Path B. |
| C2 | **Pending C1** | Implementation per chosen path. |
| C3 | **Pending, non-blocking** — Silvia | `TODOKU_HMAC_SECRET`; safe to land now (empty outbox, no cold-start risk). |

**Confirmed: Group C is NOT applicable to Klokd Phase 1.** Two independent confirmations:
1. §18.5.6a: *"Group C impact on apps: NONE for Klokd or LD Phase 1 … Group C can slip indefinitely without affecting either app's real-money launch."*
2. `todoku-activation-response.md`: Hakken's emitter stays in `todoku_emitter_disabled`; consuming-app calls succeed regardless.

**Verified in code:** Klokd does **not** consume Hakken's outbox. Grep for all eight `hakken.*` event names across `octopus-api/src` returns zero matches. Klokd handles its own user notifications via its own Todoku tenant (`octopus-api/src/modules/rails/templates.ts`). The §18.5.6 spec-non-conformant outbox-mapping tables therefore **cannot** affect Klokd — no code was built against them.

### Group D — Klokd-side code + product + operations

| # | Status | Evidence |
|---|---|---|
| D1 | **Done** | Phase 1 client + service at `2c8dc8b`. `hakken.service.ts` — `upsertEmployerEntity:78`, `upsertWorkerEntity:134`, `publishShiftOpen:196`, `revokeShiftBroadcast:268`, `retireEntity:295`. Client `hakken.client.ts` — `createEntity:125`, `patchEntity:183`, `publishBroadcast:228`, `revokeBroadcast:282`. Triggers wired: `webhook.routes.ts:73-82` (KYC tier ≥1), `shift.service.ts:80` (publish), `shift.service.ts:247` (revoke on fill). Non-blocking discipline intact (`void` + try/catch throughout). |
| D2 | **Pending — Day 1-2** | Marker confirmed at `octopus-api/src/modules/hakken/hakken.service.ts:24` ("background sweep (not implemented in this pass)"). **See DISC-7 — the sweep cannot be built as specced without first fixing `recordDeferral`.** |
| D3 | **Pending — Day 1** | Only fill wired (`octopus-api/src/modules/shift/shift.service.ts:247`). Expire + cancel paths do not call `revokeShiftBroadcast`. |
| D4 | **Pending — Day 1** | `retireEntity` exists (`hakken.service.ts:295`) with **zero callers**. `ACCOUNT_DEACTIVATED` handler at `octopus-api/src/modules/rails/webhook.routes.ts:88` only writes an audit row. Ivy decided option (a) hard signal. |
| D5 | **Pending B2 + B3** | `getHakkenJwt()` 503-stub confirmed at `hakken.service.ts:38-50`; `HAKKEN_IDENTITY_JWT_STUB` escape hatch at `:42`. |
| D6 | **Pending A1 + B2 + D5** | Klokd smoke script does not yet exist at `octopus-api/scripts/smoke-hakken.ts` for the Hakken flow parity target. **Blocked additionally by DISC-1** — the audit-assertion step cannot pass as written. |
| D7 | **Pending Ivy + A5** | KPI targets unset. Also gated on A5 (`ADMIN_API_TOKEN`) for `/v1/admin/observability`, and the trace-propagation metric is unmeasurable per DISC-1. |
| D8 | **Pending D6** | Ivy signs H15-001 AC#1. |
| D9 | **Not required for "Klokd live"** | Phase 3 A/B switchover bar. |

### Group E — Lunch Drop

**E1–E10: N/A to Klokd** (LD-side code, product, and sign-off).

| # | Status | Evidence |
|---|---|---|
| E11 | **Partially satisfied — mirror present but STALE** | `docs/HAKKEN_INTEGRATION_REFERENCE.md` exists in Klokd's repo as required. However line 65 still reads `pay_rate_kes: 800` (integer, **minor units**) — the `fbe1040` whole-KES correction was applied rail-side but **not propagated to Klokd's mirror**. See DISC-2. |

### Group F — Joint / cross-cutting (do NOT block "live")

| # | Status | Note |
|---|---|---|
| F1 | **N/A to Klokd** | Guide marks Klokd "—"; LD-only soft dependency. |
| F2 | **Pending, non-blocking** | Kafka broker for ID-14 consent events. *Adjacent Klokd finding:* Identiti v1.0 has no webhooks (Kafka-only), and Klokd has no Kafka consumer — this affects Klokd's **KYC tier sync**, which is the trigger for Hakken registration. Tracked separately from Hakken; noted here because it gates the D1 trigger firing for real users. |
| F3 | **Pending** — KMV ops | k6 load run; harness on Hakken `main`. |
| F4 | **Overdue** — Chamia | OD-11 DPA 2019 counsel review. |

### Group G — Time gates

| # | Status |
|---|---|
| G1 | **Blocked** — cannot start until D6 + E10 land |
| G2 | **Blocked G1 + F4** |

---

## 2. Discrepancies

Flagged only. No fixes applied.

### DISC-1 — §A.11 trace fields are never recorded in Klokd's audit_log — **HIGH**

**Expected (guide):**
- §18.5.6a roll-forward step 6: *"Confirm the app's audit_log records `traceparent` + `business_op_id` on every Hakken call (§A.11)."*
- "Klokd live" definition (c): audit chain records the write with propagated §A.11 fields.
- Kickoff prompt: *"§A.11 traceparent + business_op_id (= shift_id or worker_account_uuid) on every audit row — non-negotiable."*

**Actual:**
- `octopus-api/src/modules/rails/hakken.client.ts:82` mints a `traceparent` per request (`args.traceparent ?? generateTraceparent()`), sends it on the wire at `:90` — then **discards it**. It is never returned to the caller.
- `octopus-api/src/utils/auditLogger.ts:4-10` — `logAudit()` accepts `tenantId, actorId, action, resource, resourceId, metadata`. There is **no `traceparent` and no `business_op_id` field**.
- `hakken.service.ts:58-70` — `recordDeferral()` writes `metadata: { reason, deferredAt }` only.
- **Successful** Hakken calls write no audit row at all (only failures/deferrals do).

**Impact:** D6's audit assertion and D7's "trace-propagation success ≥0.99" KPI are both unsatisfiable as the code stands. Note the *rail* side records its own §A.11 fields correctly (Klokd does send `traceparent` on the wire) — the gap is Klokd's own audit trail.

### DISC-2 — `pay_rate_kes` documented as minor units in two Klokd locations — **MEDIUM**

**Expected:** whole KES. §18.5.6: *"Approved alternatives (whole KES — Hakken doesn't touch money so the KP minor-units rule does NOT apply here) … `pay_rate_kes: 800`"*. Confirmed at Hakken commit `fbe1040`, 8 Jul.

**Actual — the shipping code is CORRECT**; only the documentation is stale:
- `octopus-api/src/modules/rails/hakken.dto.ts:11` — comment reads *"§10.7 banned keys (BANNED_KEYS regex) — pay_rate_kes integer **minor units** only"*.
- `docs/HAKKEN_INTEGRATION_REFERENCE.md:65` — *"Klokd pay rate → `pay_rate_kes: 800` (integer, **minor units**)"*.
- Correct behaviour at `hakken.service.ts:229` — `pay_rate_kes: shift.rateKes` where `shift.rateKes` is whole KES.

**Impact:** this is the exact doc Mumbua is directed to read on Day 1 (kickoff prompt line 21). A dev trusting the mirror could "fix" correct code into a 100× error. Highest-risk item in this audit despite being documentation-only.

### DISC-3 — Client operation names diverge from the guide's contract — **LOW**

**Expected (§18.5.6):** `registerEntity`, `getEntity`, `updateEntity`, `publishBroadcast`, `revokeBroadcast`, `rankingQuery`, `request`.

**Actual (`hakken.client.ts`):** `createEntity:125`, `patchEntity:183`, `publishBroadcast:228`, `revokeBroadcast:282`, private `request:71`.
- `registerEntity` → named `createEntity`; `updateEntity` → named `patchEntity` (cosmetic).
- `getEntity` — **absent.** Acceptable for Phase 1: Klokd caches the server-assigned id in `employer.hakkenEntityId` / `worker.hakkenEntityId`, so no read-back path is needed.
- `rankingQuery` — **absent.** Correct; Phase 3 (Sprint 8+) per AD-K09.

### DISC-4 — Env var name mismatch in the config error message — **LOW**

**Expected (§18.4, §18.5.6):** `HAKKEN_BASE_URL`.
**Actual:** `config/index.ts:66` accepts `HAKKEN_API_BASE || HAKKEN_BASE_URL` (so it functions either way), but `hakken.client.ts:61` error text names only `HAKKEN_API_BASE`. An operator setting `HAKKEN_BASE_URL` per the guide and hitting a misconfiguration would be told to set a differently-named var.

### DISC-5 — `source_payment` banned more broadly than the rail requires — **LOW / INTENTIONAL**

§18.5.6 carves out `source_payment` for `/v1/entities/` and `/v1/tiers`. Klokd's `BANNED_KEY_REGEX` (`hakken.dto.ts:137-138`) bans it everywhere, deliberately documented at `:133-135`. Divergence is in the **safe** direction (Klokd sends less than permitted). No action needed; recorded so it is not mistaken for a defect.

### DISC-6 — `patchEntity` sends no `Idempotency-Key` — **LOW**

§18.5.6 honours `Idempotency-Key` on `/v1/entities` + `/v1/broadcasts`. `createEntity` supplies one (defaults to `externalRef`, `hakken.client.ts:161`) and `publishBroadcast` requires one (`:234`), but `patchEntity:183-206` supplies none. PATCH is largely idempotent by shape, so impact is low, but retries have no dedup envelope.

### DISC-7 — Deferral rows are not replayable; blocks D2 as specced — **HIGH (for D2)**

**Expected:** D2 — *"Retry sweep — replays `audit_log action=hakken.deferred.*` entries with exponential backoff."*

**Actual:** `hakken.service.ts:58-70` writes:
```
action:   `hakken.deferred.${operation}`   // e.g. hakken.deferred.entity_upsert
resource: 'hakken_integration'
metadata: { reason, deferredAt }
```
There is **no `resourceId` and no target identifier in metadata**. The row records *that* an `entity_upsert` was deferred, but not *which* employer, worker, or shift. A sweep reading these rows has nothing to replay against.

**Impact:** D2 cannot be built as written. Prerequisite work: extend `recordDeferral()` to capture the business target (`employerId` / `workerId` / `shiftId`) plus enough operation context to reconstruct the call. This is a design change to existing shipped code, not net-new work, and should be scoped into Day 1-2 rather than discovered mid-sprint.

### Confirmed conformant (no action)

| Contract point | Verified at |
|---|---|
| 3-header pilot auth, verbatim, no HMAC | `hakken.client.ts:86-91` |
| `publisher_id` = server-assigned `entity_id` (not `external_ref`) — avoids `404 PUBLISHER_NOT_FOUND` | `hakken.service.ts:243` uses `shift.employer.hakkenEntityId` |
| `ttl_at` capped ≤168h with 1-min slack — avoids `422 TTL_TOO_FAR` | `hakken.service.ts:237-239` (absolute-timestamp math, no float drift) |
| `consent_scope` always present | `hakken.service.ts:250` (`'cross_app_optional'`) |
| §10.7 banned-key wall — all 21 keys | `hakken.dto.ts:137-138`, matches guide list exactly |
| §5 PII wall — 4 field names + MSISDN/email/two-word-capitalised patterns | `hakken.dto.ts:140-148` |
| Deterministic idempotency keys per business op | `hakken.service.ts:117,180,219` |
| Non-blocking discipline (fire-and-forget + try/catch) | `shift.service.ts:80,247`; all service methods try/catch'd |
| Does NOT consume Hakken outbox (spec-non-conformant tables cannot bite) | zero grep matches for `hakken.*` event names in `octopus-api/src` |

---

## 3. Blockers remaining

Cornelius's 22 Jul framing — **`HAKKEN_APP_SECRET` + `aud=hakken` JWT** — maps exactly onto the checklist:

| Cornelius's framing | Checklist items | Owner | Klokd-side readiness |
|---|---|---|---|
| `HAKKEN_APP_SECRET` | **A1** | Silvia → Cornelius | Ready. Config slot exists (`config/index.ts:65-69`); receipt is a Railway env paste. |
| `aud=hakken` JWT mechanism | **B1a → B2 → B3** (and D5 downstream) | Silvia + Identiti Eng, then Cornelius for B3 | Blocked. Klokd voted (a). `getHakkenJwt()` correctly 503s (`hakken.service.ts:38-50`) rather than faking auth. |

Confirmed: the mapping holds. B1b/A6 (JWKS URL) is a third rail-side item that gates Hakken's *verifier*, not Klokd's *caller*, so it does not appear in Cornelius's framing — correctly so.

**Klokd-internal blockers not in Cornelius's framing** (surfaced by this audit): DISC-1 (§A.11 audit fields) and DISC-7 (deferral replay context). Both are Klokd-side code, both block D6/D7 and D2 respectively, and neither is waiting on Silvia.

---

## 4. Day-1 pre-work — safe before Silvia's items land

All four items below are Klokd-side, need no real auth, and are unaffected by A1/B1a/B2. `getHakkenJwt()` 503s cleanly and every call path records a deferral, so wiring new trigger points is safe pre-auth.

| Item | Work | Notes |
|---|---|---|
| **D4** — deactivation retire | Add `retireEntity` call in the `ACCOUNT_DEACTIVATED` branch at `webhook.routes.ts:88`. Method exists at `hakken.service.ts:295`. | Needs a lookup from `payload.accountUuid` → `worker.hakkenEntityId` / `employer.hakkenEntityId` (mirror the pattern at `webhook.routes.ts:75-82`). Skip cleanly when no entity id is cached. Ivy's decision: option (a) hard signal. |
| **D3** — expire/cancel revoke | Add `revokeShiftBroadcast` to the shift expire path and the cancel path. | Only fill is wired (`shift.service.ts:247`). Preserve the `void` fire-and-forget shape — do not add `await`. |
| **DISC-7 prerequisite** | Extend `recordDeferral()` to persist the replay target + operation args. | **Must land before D2.** Without it the sweep has no target to replay. |
| **D2** — retry sweep | Scheduled worker reading `audit_log action=hakken.deferred.*`, exponential backoff, max 5 retries → permanently-failed. | Depends on the row above. Kickoff prompt suggests grepping `src/` for the existing schedule/cron pattern; note `octopus-api/src/modules/payment/retry.service.ts` and `autorelease.service.ts` are the closest in-repo precedents. |
| Unit tests | Cover all three [NOT BUILT] items against `HAKKEN_IDENTITY_JWT_STUB`. | `hakken.service.ts:42` honours the stub only when `nodeEnv !== 'production'`. |

**Also safe pre-auth, per §18.5.6a "What consuming sessions CAN do":** author `octopus-api/scripts/smoke-hakken.ts` mirroring `pilotSmoke.ts` assertions, and add a `HAKKEN_ENABLED` feature flag so activation is an env flip.

**Recommended addition:** fix DISC-1 (§A.11 audit fields) during Day 1-2. It is pure Klokd-side, needs no auth, and D6 cannot be signed off without it.

---

## 5. Errata — for Chamia to fix on the platform doc

| # | Location | Issue |
|---|---|---|
| E-1 | §18.5.6a, "Activation matrix — 34 items grouped by owner" | Groups A–G contain **47 rows** (11+7+3+9+11+4+2). 34 appears to be the Klokd-scoped subset (47 − 11 E-group − A2 − A4). As written, "34 items" reads as a miscount of the matrix that follows. Suggest "47 items (34 Klokd-scoped)". |
| E-2 | `klokd-kickoff-prompt.md` line 22 (and the OD-9 audit prompt) | Path `C:\Projects\Klokd\src\modules\rails\hakken.service.ts` is wrong twice: (a) missing the `octopus-api\` segment, (b) the service is in `modules\hakken\`, not `modules\rails\`. Correct path: `C:\Projects\Klokd\octopus-api\src\modules\hakken\hakken.service.ts`. Note `hakken.client.ts` **is** correctly under `modules\rails\`. Likewise `webhook.routes.ts` is at `octopus-api\src\modules\rails\webhook.routes.ts` (not `modules\webhook\`). |
| E-3 | §18.5.6a D6 + `klokd-kickoff-prompt.md` Day 3 | Both say the smoke runs against "Hakken **staging**", contradicting §18.5.6a Day-1 heads-up #1: *"Hakken has no staging environment. Only `https://hakken-production.up.railway.app` … Do NOT spend Day 1 hunting for a `hakken-staging.up.railway.app` — it doesn't exist."* Internal contradiction; D6/Day-3 wording should say production. |
| E-4 | `Klokd/docs/HAKKEN_INTEGRATION_REFERENCE.md:65` (Klokd's mirror) | Still reads "(integer, minor units)". The `fbe1040` whole-KES correction landed rail-side but was not propagated to Klokd's mirror. E11 records the mirror as "confirmed present" — present is not the same as current. Recommend a mirror-freshness check (commit hash or date stamp) in E11's definition. |

**Verified accurate — no errata:** guide's `identiti.client.ts:170` + `identiti.dto.ts:50,57` citations (B3); `hakken.service.ts:24` (D2 marker), `:38-50` (D5 stub), `:295` (retireEntity); `shift.service.ts:247` (D3); `webhook.routes.ts:88` (D4); `config/index.ts:65-69` (A1 slot); commit `2c8dc8b` (D1).

---

## Summary

Klokd's Phase 1 Hakken client is **wire-conformant** against §18.5.6 on every substantive contract point — auth headers, banned-key wall, PII wall, TTL bounds, `publisher_id` semantics, idempotency, and non-blocking discipline. Klokd does not consume Hakken's outbox, so the spec-non-conformant event-mapping tables in §18.5.6 cannot affect it. The two external blockers Cornelius named map cleanly to A1 and B1a→B2→B3.

Two Klokd-side defects were found that are **not** on anyone's blocker list and do not depend on Silvia: §A.11 trace fields are never persisted to Klokd's audit_log (DISC-1), which makes D6's audit assertion and D7's trace KPI unsatisfiable; and deferral rows carry no replay target (DISC-7), which makes D2's retry sweep unbuildable as specced. Both should be scoped into Day 1-2. Separately, Klokd's local wire-contract mirror still documents `pay_rate_kes` as minor units (DISC-2) — the shipping code is correct, but it is the document Mumbua is told to read first, so it is the highest-risk item here.

*Audit complete. No Klokd code modified, no commits, no pushes.*
