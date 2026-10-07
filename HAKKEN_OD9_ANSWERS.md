# Klokd → Hakken (OD-9 / HK-8) — answers to Ivy's dev-handoff checklist

**From:** Klokd engineering (Cornelius + Claude)
**To:** Ivy Wanja (product owner, Klokd side) → Silvia (Hakken operator)
**Date:** 08 July 2026
**Grounding:** every technical answer below is cited to the actual Klokd code as it stands today. Where the code has already made the decision, it's marked **[WIRED]** with a file:line. Where it's genuinely still a product call, it's marked **[OPEN — Ivy]**. Where an operator credential blocks it, **[BLOCKED]**.

> One thing to read first: **two hard blockers gate every Hakken call.** Until they land, the dev can write and unit-test the wiring but cannot demonstrate "Klokd calls Hakken from staging" (H15-001 AC#1). See §Blockers at the end. Plan the sprint so the dev isn't sitting idle waiting on them.

---

## Before the dev starts

### 1. Named developer + start date — [OPEN — Ivy]
Mumbua Makau - 23rd July 2026

### 2. Sign-off on Phase 1 scope — [WIRED, mostly] + [OPEN — Ivy to accept]
Klokd's own `OPERATOR_REQUEST_HAKKEN.md` §0 recommends **option (a): defer Klokd↔Hakken query to Phase 3**, and the code was built to that scope. Concretely, here is what is **already implemented** vs **still owed** in Phase 1 (`S5-NEW-01`, commit `2c8dc8b`):

| Phase 1 item | State | Evidence |
|---|---|---|
| Employer entity register/upsert | **[WIRED]** | `hakken.service.ts:78` `upsertEmployerEntity` |
| Worker entity register/upsert | **[WIRED]** | `hakken.service.ts:134` `upsertWorkerEntity` |
| Shift `shift_open` broadcast publish | **[WIRED]** | `hakken.service.ts:196` `publishShiftOpen` |
| Broadcast revoke on fill | **[WIRED]** | `hakken.service.ts:268` `revokeShiftBroadcast` |
| Non-blocking (Klokd flow completes on Hakken failure) | **[WIRED]** | fire-and-forget `void ...` at `shift.service.ts:80`, all calls try/catch'd |
| Failure/deferral audit trail | **[WIRED]** | `recordDeferral` → `audit_log action=hakken.deferred.*` `hakken.service.ts:58` |
| **Retry queue/sweep that replays deferrals** | **[NOT BUILT]** | service comment `hakken.service.ts:24` "background sweep (not implemented in this pass)" |
| Broadcast revoke on **expire / cancel** | **[NOT BUILT]** | only fill is wired (`shift.service.ts:247`); expire/cancel paths don't call revoke yet |
| Deactivation → entity retire | **[NOT BUILT]** | `retireEntity` exists (`hakken.service.ts:295`) but has **no caller**; `ACCOUNT_DEACTIVATED` webhook only logs (`webhook.routes.ts:88`) |

**Phase 3 (Sprint 8+, per AD-K09):** `POST /v1/ranking/query` replacing Klokd's internal `GET /shifts/available` sort. **Deferred.** If Ivy wants Phase 3 pulled into this sprint it re-opens the point budget and needs Silvia's approval per §0 option (b) — Klokd's standing recommendation is to keep it in Sprint 8.

**Ivy's sign-off asked for:** "Klokd accepts Phase 1 = register + publish + non-blocking, and the dev's remaining work is the three **[NOT BUILT]** rows above (retry sweep, expire/cancel revoke, deactivation retire). Phase 3 ranking stays Sprint 8."

### 3. Integration trigger points — [WIRED] (this is the section Ivy worried the dev would guess — it's already decided)

| Trigger | Fires on | [state] | Evidence |
|---|---|---|---|
| **Employer registration** | Identiti `KYC_TIER_CHANGED` webhook, when `tier ≥ 1`, if an employer row matches the `account_uuid`. **Not** on profile completion, **not** on first shift. | **[WIRED]** | `webhook.routes.ts:73,79-82` |
| **Worker registration** | Identiti `KYC_TIER_CHANGED` webhook, `tier ≥ 1` (tier 1 is what unlocks shift apply). **Not** on availability toggle. | **[WIRED]** | `webhook.routes.ts:73-78` |
| **Shift broadcast** | Shift **creation** (`ShiftService.createShift`, status `POSTED`). Single fire at creation — Klokd has **no separate "hiring" state**; a posted shift is immediately discoverable. | **[WIRED]** | `shift.service.ts:80` |
| **Broadcast revoke** | Shift **filled** (`selectWorker` → status `CONFIRMED`). | **[WIRED]** | `shift.service.ts:247` |
| **Deactivation → retire** | **Nothing.** Not wired. `retireEntity` is a method with no caller; `ACCOUNT_DEACTIVATED` only writes an audit row. | **[OPEN — Ivy]** | `webhook.routes.ts:88`, `hakken.service.ts:295` |

**The only genuinely-open trigger decision for Ivy is deactivation.** Pick one and the dev wires it:
- **(a) Hard signal** — retire on Identiti `ACCOUNT_DEACTIVATED` webhook (add the `retireEntity` call at `webhook.routes.ts:88`). Cleanest, event-driven.
- **(b) Soft signal** — retire after N days inactive (needs a scheduled job; more work; no such job exists today).
- **Recommendation:** (a) now, (b) later if churn hygiene matters. Also decide whether expire/cancel of a shift should revoke its broadcast (recommend **yes** — wire revoke into the expire + cancel paths so stale shifts don't linger in Hakken discovery).

**Caveat the dev must know:** these triggers depend on Identiti's `KYC_TIER_CHANGED` webhook actually being **delivered** to Klokd. Webhook delivery/signing from Identiti is still operator-pending (RECAP: "webhook HTTP signing deferred to ID-14 Phase 2"). The handler is built and inert until Silvia enables delivery. Also: sandbox accounts minted under `RAIL_FALLBACK_LOCAL` are `tier_0` placeholders and will **never** cross the `tier ≥ 1` threshold, so they never register with Hakken — real KYC is required, which is correct for a discovery pilot.

### 4. Point-of-contact matrix — [RESOLVED] (Klokd is small; there are no separate role owners)

| When blocked on… | Escalate to |
|---|---|
| Product / scope / trigger decisions | **Ivy** |
| Klokd staging/prod env + secret placement | **The dev / Cornelius** — no separate DevOps role. Whoever holds the keyboard has Railway env access (rail secrets already live there); the Hakken secret is pasted straight into Railway → Variables. |
| KYC / Identiti integration questions | **The dev** — the auth / `identityRailClient` module is owned by Klokd as a company (no single individual); the dev has full access. |
| Klokd observability / traceparent fan-out | **The dev** — Klokd has no separate SRE and no OTel/Grafana backend yet; traceparent lands in `audit_log` today (see §"During", H12-004). |

**Net:** Klokd's structure collapses the "who receives the secret / who owns auth" questions to one answer — the dev has access to everything (Railway env, auth module, observability). The only genuinely-external owner is **Ivy** for product/scope. This also removes the "secret sits in a DM for 3 days" risk: the receiver is the same person who runs the sprint.

### 5. KPI list for the pilot dashboard — [RECOMMENDED, targets OPEN — Ivy]
5 items, mapped to what Klokd can actually emit today:

| KPI | Source in Klokd | Recommended pilot target |
|---|---|---|
| Registered employers (Hakken entities) | count of `employer.hakkenEntityId != null` | **[OPEN]** — Ivy sets (suggest 10–15 for pilot) |
| Registered workers (Hakken entities) | count of `worker.hakkenEntityId != null` | **[OPEN]** — Ivy sets (suggest 100–200) |
| Shifts published / day | count of `shift.hakkenBroadcastId` set per day | **[OPEN]** — Ivy sets (suggest 20–40/day) |
| **Fallback rate** (Hakken call deferred/failed) | rate of `audit_log action=hakken.deferred.*` ÷ total attempts | **alarm at 0.05** — we agree with Ivy's default |
| Trace-propagation success rate | share of Hakken calls whose `traceparent` + `business_op_id` land in `audit_log` (§A.11) | target **≥ 0.99** |
| Ranking-query volume | Phase 3 only — n/a until Sprint 8 | deferred |

Note the pilot targets above are **placeholders grounded in the app's demo scale, not committed numbers** — Ivy owns the real targets.

---

## During the sprint (dev's work; Ivy's ongoing owes)

- **Business-day response window on scope questions — [OPEN — Ivy].** Expect the ~5–8 questions to cluster around the three **[NOT BUILT]** rows and the deactivation decision (§3). If §3(deactivation) + §2(expire/cancel revoke) are decided up front, most of that queue evaporates.
- **Staging env + credential handoff — [BLOCKED on Silvia → OPEN — Ivy's ops].** When Silvia delivers `HAKKEN_APP_KEY=klokd` + `HAKKEN_APP_SECRET=<hex>`, it must land in Klokd staging env where the dev can read it (config keys already exist: `config.hakken.appKey` / `appSecret`, `config/index.ts:65-69`). This is the classic "secret sits in a DM for 3 days" delay — assign the DevOps owner from §4 now.
- **Trace fan-out (H12-004 mirror) — [OPEN — Ivy], with a reality check.** Klokd's §A.11 propagation currently writes `traceparent` + `business_op_id` **to `audit_log`** — that is the entire Klokd-side observability surface today (`hakken.service.ts:26-28`). There is **no Klokd OpenTelemetry backend or Grafana board yet.** So "which downstream surface shows the Hakken traceparent" has one honest answer right now: **`audit_log`.** If Ivy wants an OTel/Grafana view, that's net-new infra to scope separately — flag it, don't assume it exists.

---

## At the end (Ivy's sign-off)

- **Integration sign-off (H15-001 AC#1) — [BLOCKED until credentials].** The demo (register employer → publish `shift_open` → assert audit + outbox → ranking query pass 1 with `fallback_active=false`) **cannot run** until both blockers below land, because `getHakkenJwt()` throws `503` today (`hakken.service.ts:38-50`). There's a `HAKKEN_IDENTITY_JWT_STUB` env for local smoke (`smoke-hakken.ts`), but AC#1 is against staging with real auth. Sequence: credentials → staging smoke → Ivy signs off. Note the "ranking query pass 1" part of AC#1 is Phase 3 surface — confirm with Silvia whether HK-8 sign-off needs a live ranking query or just the publish+audit path (Klokd's Phase 1 does **not** include the ranking query).
- **A/B switchover criteria (H15-002) — [OPEN — Ivy sets the bar].** Condition to flip `GET /shifts/available` from internal sort to Hakken ranking. **Recommended bar, grounded in Klokd's model:** `≥ 1,000 successful ranking queries` **AND** `p95 latency ≤ 300 ms` (Klokd's UX motion budget is 300ms; a feed slower than that regresses the redesign) **AND** `fallback rate < 0.05 for 15 consecutive days` **AND** `zero PII-wall violations`. Klokd dev instruments it; not applicable until Phase 3.

---

## Blockers (gate everything above)

1. **`HAKKEN_APP_SECRET` for `app_slug=klokd`** — pending delivery from Silvia. Config slots ready (`config.hakken.appKey` / `appSecret`, `config/index.ts:65-69`); the only action is placing the secret into Klokd's **Railway env → Variables**, alongside the existing rail secrets (`IDENTITI_APP_SECRET`, `TODOKU_APP_SECRET`, …). Transport is negotiable — a **one-time secret link** (Bitwarden Send / onetimesecret) or a **live-call paste** both work; 1Password is only Silvia's vault preference, not a requirement. Receiver = the dev / Cornelius (has Railway access), so no cross-team handoff delay.
2. **Identiti customer-JWT issuance for `aud=hakken`** — Klokd's `identityRailClient` mints phone tokens (`aud=todoku`) only; Hakken needs an RS256 customer JWT with `aud=hakken`. Until Silvia confirms the mechanism, `getHakkenJwt()` throws `503` and every trigger records a deferral instead of calling Hakken (`hakken.service.ts:38`). **This is the load-bearing blocker** — no Hakken call succeeds without it. Silvia must pick the mechanism; **Klokd's vote is (a)**:
   - **(a) dedicated mint endpoint** — `POST /v1/customer-jwts { audience: 'hakken' }`. **Preferred.** Maps directly onto `getHakkenJwt(accountUuid)`'s per-operation fetch shape (it's designed to delegate to `identityRailClient` and fetch a fresh, narrowly-scoped token per call), and preserves Klokd's existing **per-audience least-privilege** token model — every rail token Klokd holds today is single-audience (phone_token is `aud=todoku`).
   - **(c) multi-audience JWT** (`aud: ["klokd","hakken"]`) — acceptable but widens blast radius (one leaked token is valid at two rails) and couples the two rails' token TTLs. Second choice only if (a) is infeasible operator-side.
   - **(b) re-encode/exchange** an already-issued JWT for `aud=hakken` — works, but adds a round-trip per Hakken op and a token-exchange surface to secure. Least preferred.
3. **RESOLVED — `pay_rate_kes` units = whole KES.** Confirmed aligned 08 Jul: Hakken side corrected the reference/guide labeling from "minor units" to "whole KES" (`fbe1040`, `HAKKEN_INTEGRATION_REFERENCE.md §4` + `App_Integration_Guide §18.5.6`), and Hakken does not touch money. Klokd's code was already correct — `pay_rate_kes: shift.rateKes` (whole KES) at `hakken.service.ts:229` stays as-is. No 100× risk.

---

## Escalation status (08 Jul → Silvia)

OD-9 dev-handoff **closed on Klokd's side**. Escalation sent to Silvia; everything now gates on two operator items, target **land by 22 Jul** (day before Mumbua starts):

1. **`HAKKEN_APP_SECRET` (`app_slug=klokd`)** — deliver via Bitwarden Send / onetimesecret / live-call paste (Klokd does not use 1Password); receiver = dev or Cornelius → Railway env. [PENDING Silvia]
2. **`aud=hakken` JWT mechanism** — Klokd votes **(a) dedicated mint endpoint**. Verified 08 Jul that `identityRailClient` mints `aud=todoku` only (`identiti.client.ts:170`, `identiti.dto.ts:50,57`), so the 503 is correct until this lands. [PENDING Silvia]

**Cross-pilot note:** Mumbua runs a **parallel Lunch Drop sprint** (`app_slug=lunch_drop`) needing the same two items mirrored. That confirms the **~2-weeks-at-50%** path (not 1-week-full-time) → Klokd Phase 1 realistically lands **early Aug**.

**Access note:** Mumbua's kickoff prompt lives on the **platform repo** (`docs/pilots/klokd-integration.md`) — NOT the Klokd repo (ours is `docs/HAKKEN_INTEGRATION_REFERENCE.md`). Confirm Mumbua has platform-repo read access before Day 1.

**Day-1 fallback if items slip:** dev works against `HAKKEN_IDENTITY_JWT_STUB` (`hakken.service.ts:42`) + `scripts/smoke-hakken.ts` — unit tests only, no real auth exercised.

---

*This doc answers Ivy's checklist against Klokd's code as of 08 Jul 2026. The [OPEN — Ivy] items are the real decisions owed; everything else is already built and cited. Updated 08 Jul post-Hakken-reply: pay_rate_kes resolved, JWT mechanism recommendation (a) added, escalation status appended.*
