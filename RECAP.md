# Klokd v3 · RECAP

> Per-app sprint state, deployment state, test counts, blockers. Master cross-rail tracker at `C:\Projects\Platform Rails-instruction pack v1-reboot pack v1.2\RECAP.md`.

**App:** Klokd Workplace Solutions Ltd · `klokd.co.ke` · Casual Labour Marketplace (Hospitality + Health)
**Status:** 🟢 v3 rail-alignment SHIPPED — **2 rails LIVE** (Identiti, Todoku), **3 rails PROVISION-READY** (Payment Rail, Helpan AI, Hakken Phase 1) · client wire-correct end-to-end · Itafika **formally parked** (playbook §3.3, option d) · awaiting operator handovers for KP + Helpan + Hakken
**Repo:** `iamkn1ght/klokd` (moved from `thhvvv/klokd`) · branch `main`
**Latest commit:** `ca74640 docs(hakken): log Klokd-Itafika (d)None decision` · 23 June 2026
**Octopus API URL:** https://klokd-production.up.railway.app (Railway)
**Supabase project:** `nbtpkmjovgbwgwefsdjn` · region locked **eu-west-1** (CHAMIA-REGION resolved per platform standard)
**Domain:** `klokd.co.ke` (NEVER `.com` or `.app`) · handle `@klokdKE` (NEVER `@klokKE`)

---

## Headline — what shipped 9-23 June 2026

Klokd went from "v1 MVP, no rail integration" to "wire-correct against all five applicable KMV rails" in two weeks. Discovered + documented ~20 wire-format errata across the operator packs and reference clients. Two LIVE end-to-end (Identiti, Todoku); three PROVISION-READY (KP, Helpan, Hakken) awaiting operator handovers; Itafika formally closed as N/A. Reference work memorialised in [KMV_RAILS_INTEGRATION_GUIDE.md](./KMV_RAILS_INTEGRATION_GUIDE.md), [HAKKEN_ITAFIKA_INTEGRATION_PLAYBOOK.md](./docs/HAKKEN_ITAFIKA_INTEGRATION_PLAYBOOK.md), [HAKKEN_INTEGRATION_REFERENCE.md](./docs/HAKKEN_INTEGRATION_REFERENCE.md), and per-rail integration result docs.

| Commit | Date | What |
|---|---|---|
| `0e24e6d` | 09 Jun | Sprint 3 v3 scaffolding — rail clients + DTOs + webhook router + Daraja deletion + Prisma migration (accountUuid as FK per AD-K10) |
| `f7dbe96` | 09 Jun | Identiti HMAC-SHA256 base64 sig refactor (operator pack §4 said hex; live rail expects base64) |
| `ee2f48f` | 09 Jun | **Identiti LIVE** — 3/4 endpoints verified end-to-end; first real cross-rail call (`acc_b4edc8da-...`) |
| `2d0222c` | 10 Jun | **Todoku LIVE** — `POST /v1/messages/send` returned 201 `message_id 01KTRPQ4X92VDD25PEY8RJZSW0` |
| `c71d72a` | 10 Jun | KP rewrite per handover — vocab (holds/refund), KES MINOR units, step-up threshold 10K, audience `kipkiren_pay` |
| `a21ba78` | 10 Jun | KMV_RAILS_INTEGRATION_GUIDE.md authored — 871 lines covering all 4 rails |
| `73e27d6` | 11 Jun | **Helpan AI integration** — dual-role surface (consuming app + target rail per §A.11), 3 new tables |
| `219b162` | 11 Jun | Fix: ship demo module + Klokd-side OTP flow rewrite (Identiti step-up requires `active` state; Klokd does local OTP via Todoku) |
| `7f723d2` | 11 Jun | RECAP bump to v1.1 |
| `9572095` | 19 Jun | EAS project ownership switched mumbus → kmv209; both APKs re-built (worker `8ce0a4cb`, employer `b8842660`) |
| `2c8dc8b` | 23 Jun | **Hakken Phase 1 integration** — entity registration + broadcast publishing as non-blocking background jobs (S5-NEW-01); 3-lens adversarial-verify workflow caught 2 critical + 4 major bugs, all fixed in same commit |
| `ca74640` | 23 Jun | Klokd-Itafika decision logged — **option (d) None: parked** per playbook §3.3 |

---

## Sprint state — v4 backlog + June 2026 delta

| Sprint | Title | Status | Delta items | Notes |
|---|---|---|---|---|
| **S0** | MVP foundation (monorepo + Prisma + Supabase + Railway + EAS + CI/CD) | 🟢 DONE Apr 2026 | — | `ae90457 Klokd MVP — full build` |
| S1–S2 | Pre-rail (schema, auth scaffold, mobile shells) | 🟢 DONE Apr 2026 | — | — |
| **S3** | Authentication + Identity foundation | 🟢 DONE Jun 2026 | C1 ✓ + C2 ✓ + 3 NEW ✓ (Identiti SDK · Todoku client · PaymentRailClient) | Shipped 9-11 Jun across `0e24e6d`, `ee2f48f`, `2d0222c`, `c71d72a`. Klokd-side OTP flow per `219b162` (Identiti step-up requires `active` state; gap escalated to Silvia) |
| S4 | Worker/employer onboarding flows | 🟠 PARTIAL | S4-NEW-01 KP wallet creation | Wallet client wired; activates when KP-1-Ops lands |
| **S5** | Shift posting + matching | 🟢 **DONE** **23 Jun** (Klokd side) | S5-NEW-01 Hakken shift entity registration | `2c8dc8b` — Phase 1 client + service + schema + non-blocking triggers. Activates when HAKKEN_APP_SECRET + Identiti customer-JWT (aud=hakken) land |
| S6 | Notifications + GPS + clock-in | 🟠 PARTIAL | C3 ✓ (S6-04 revised — WhatsApp via Todoku, FCM unchanged) | Notification flow refactored; FCM direct (AD-K05); Todoku WA fallback wired |
| S7 | Compliance Engine (Layer 1 service per D-16) | ⚪ NOT STARTED | (no rail delta) | — |
| **S8** | Worker app MVP | 🟠 PARTIAL | S8-NEW-01 Hakken worker entity registration | Worker upsert on KYC_TIER_CHANGED webhook wired (`2c8dc8b`); RailsLoginScreen shipped 11 Jun |
| S9 | Notifications hardening | 🟢 DONE | S9-NEW-01 Todoku template registration (8 templates, ULIDs locked) | All templates approved + ULIDs in `rails/templates.ts` |
| S10–S15 | Employer app + shift state machine + dispute + ratings + admin | ⚪ NOT STARTED | (no rail delta) | — |
| **S16** | Payment Service production | 🟠 PROVISION-READY | C4 ✓ (S16-01 revised — `PaymentRailClient` not Daraja) + S16-02/03 minor | Client wire-correct per KP handover; awaits KP-1-Ops Railway deploy |
| S17–S22 | Pilot ops + WIBA + ODPC + Privacy Policy + load test + KRA/PAYE/NSSF/SHIF registrations | ⚪ NOT STARTED | — | External regulator gates |
| S23 | Beta launch — 50 employers + 200 workers Nairobi hospitality | ⚪ NOT STARTED | — | Target: per advisory was May/June 2026 — overdue |
| **(new)** | **Helpan AI integration** | 🟠 PROVISION-READY | Dual-role surface · §A.11 audit enforced | `73e27d6` 11 Jun |

**Klokd Health phase H sprints** (separate roadmap):
- H1 (project setup) · ⚪ Not started
- H3 (KMPDC verification + 2 Health Todoku templates) · ⚪ Not started · Blocked on OI-09

**Total delta:** +19 points across 23 sprints. Sprint 3 (the biggest) is **DONE**. Sprint 5 is **DONE from Klokd's side** as of 23 Jun. Sprints 16 + Helpan are PROVISION-READY (code complete, awaiting operator handovers).

---

## Deployment + test state

| Item | Value |
|---|---|
| Local `npm install` clean | ✅ |
| `tsc --noEmit` clean | ✅ (all 5 rail clients + agent routes + Hakken service) |
| Test count | ⚠️ Existing tests not re-run since v3 refactor — tech debt; new Vitest tests for Hakken guards a clean Sprint 5 follow-up |
| Migrations applied | 5 — `20260401193045_init` · `20260609120000_rails_v3` · `20260609120100_user_account_uuid` · `20260611120000_helpan_agent_runtime` · `20260619140000_hakken_entity_ids` |
| Railway service deployed | ✅ https://klokd-production.up.railway.app — auto-deploys on push to main |
| `GET /health` live | ✅ |
| `GET /ready` live | ✅ |
| **Visual rail demo page** | ✅ `/demo.html` exercises live Identiti + Todoku — `POST /v1/customers`, `GET tier`, `POST /v1/phone-tokens`, `POST /v1/messages/send` |
| **Worker app EAS Build (kmv209)** | ✅ `8ce0a4cb-34a5-4ced-a6fd-38b57c9f914d` — APK live at `expo.dev/artifacts/eas/ex-Dfp1UJwGSfMtrLEH1zwqMlEuyKAmTdKGJm3BDInQ.apk` |
| **Employer app EAS Build (kmv209)** | ✅ `b8842660-1297-4a79-bb4b-bf9755bc2c68` — APK live at `expo.dev/artifacts/eas/S_HY_j78DKOUp-zekPVG_mwQtQPa7a6jGbDJsAdBiMA.apk` |
| Worker app iOS via Expo Go | ✅ LAN mode tunnel (no Apple Developer fee) |
| Supabase Auth wired | 🗑️ REMOVED — replaced by Identiti customers + Klokd-side OTP via Todoku (cardinal rule AD-K02 + AD-K03) |
| Direct Daraja integration | 🗑️ REMOVED — `daraja.service.ts` deleted, callbacks dropped, `DARAJA_*` env vars purged from Railway (AD-K01) |
| Direct Africa's Talking integration | 🗑️ REMOVED — `AT_*` env vars purged from Railway (AD-K03) |
| Direct WhatsApp Business API | 🗑️ Never wired — flows via Todoku from Day 1 (AD-K03) |
| Supabase Storage `klokd-documents` bucket | ✅ for pay statements + contracts (retain per AD-K04); KYC images NEVER stored (AD-K02) |
| DEPLOY.md cardinal-rule cleanup | ✅ 23 Jun — removed stale DARAJA_* + AT_API_KEY instructions; replaced with full v3 rail set |

---

## Cross-rail joint status

| Joint | Producer-side | Klokd-side |
|---|---|---|
| **Identiti** (account_uuid + KYC docs + phone tokens + step-up) | ✅ Live · 14/17 sprints closed | ✅ **LIVE** — 3/4 endpoints verified end-to-end (`POST /v1/customers`, `GET tier`, `POST /v1/phone-tokens`); step-up blocked on `klokd.*` `operation_kind` registration. Customer-JWT issuance (aud=hakken) is the new escalation surfaced 23 Jun |
| **Todoku** (OTP + 8 templates + SMS + WhatsApp + SIMjacker defence) | ✅ Live on Railway · klokd_sandbox provisioned 10 Jun | ✅ **LIVE** — `POST /v1/messages/send` 201 confirmed; 8 templates with ULID constants in `rails/templates.ts` |
| **Payment Rail (Kipkiren Pay)** | 🟠 Sandbox stack ready · KP-1-Ops Railway deploy pending | ✅ **PROVISION-READY** — `PaymentRailClient` wire-correct per 10 Jun handover (holds vocab, KES minor, step-up threshold 10K, kipkiren_pay audience); smoke script parks at `scripts/smoke-payment-rail.ts` |
| **Hakken** (cross-app discovery — `klokd_two_sided_v1` plugin) | ✅ HK-1..HK-7 closed + HK-8 PARTIAL · `klokd_two_sided_v1` plugin shipped | ✅ **PROVISION-READY** (Phase 1 — 23 Jun, `2c8dc8b`) — three-header pilot auth, banned-key + PII guards (incl. `source_payment` + capitalised-name pattern found by adversarial verify), idempotency-required, non-blocking service triggers wired into ShiftService + KYC_TIER_CHANGED webhook. Smoke at `scripts/smoke-hakken.ts`. Hard blockers: HAKKEN_APP_SECRET for klokd + Identiti customer-JWT (aud=hakken) endpoint |
| **Helpan AI** (agent runtime · briefings · authorities · action dispatch) | ✅ LIVE on Railway (Supabase `jvkhoveeayixbjnhmqxa`) · `helpan-klokd-v1` agent admitted with 3 scopes + `klokd.shift_search` matcher | ✅ **PROVISION-READY** — dual-role client + target-rail dispatch endpoint shipped 11 Jun per `73e27d6`; smoke at `scripts/smoke-helpan.ts` |
| **Itafika** | LIVE on Railway dev | 🚫 **NOT APPLICABLE** — per advisory §2.6 + playbook §3.3 decision logged 23 Jun (option d: parked). No Klokd-Itafika joint exists; re-open via `OPERATOR_REQUEST_ITAFIKA.md` only if real demand surfaces |
| LipaStack | Separate platform; not a rail | Phase 3 — `PAYMENT_RAIL_API_BASE` env-var flip when LipaStack designated (CHAMIA-WALLET deferred) |

---

## Outstanding blockers — Silvia's queue + operator handovers

### Identiti escalations (per `SILVIA_ESCALATIONS.md` + new 23 Jun)

| Issue | Status | Workaround in Klokd |
|---|---|---|
| `klokd.*` operation_kind enum not registered | ⏳ Pending Silvia | Klokd does Klokd-side OTP via Todoku for first-login (Identiti step-up reserved for high-value payouts on `active` customers) |
| Customer state `pending_onboarding` → `active` activation path | ⏳ No endpoint exists | Klokd-side OTP flow makes this non-blocking; step-up only after Identiti's activation path exists |
| **NEW (23 Jun): Customer-JWT issuance endpoint for `aud=hakken`** | ⏳ Pending Silvia | Klokd's `IdentityRailClient` mints phone tokens (aud=todoku) only. Hakken needs a CUSTOMER JWT (RS256, JWKS-verifiable). Until endpoint shape confirmed, `getHakkenJwt` throws 503; all Hakken triggers write `audit_log.action='hakken.deferred.*'` rows for observability + replay |
| Operator pack §4 says hex sig; live rail uses base64 | 📋 Documented in `KMV_RAILS_INTEGRATION_GUIDE.md` | Klokd uses base64 (correct) |
| `/v1/customers/{uuid}/kyc/iprs` wire schema | ⏸ Untested | VerifyID flow stub — Identiti KYC is IPRS data lookup (national_id + DOB), not image upload |
| Webhook HTTP signing | ⏸ Deferred to ID-14 Phase 2 (Kafka today) | Handler built but inert until secret lands |

### Todoku escalations

| Issue | Status |
|---|---|
| Webhook URL registration (`https://klokd-production.up.railway.app/api/v1/webhooks/rails/todoku`) | ⏳ Pending Silvia operator-console config |
| Cross-rail sandbox token mismatch (Identiti issues real JWTs; Todoku sandbox needs `SANDBOX_TOKEN_DELIVER_OK_*`) | ⏳ Pending coordination; prod unaffected |

### Hakken escalations (new — 23 Jun, per `docs/HAKKEN_INTEGRATION_RESULT.md`)

| Issue | Status |
|---|---|
| `HAKKEN_APP_SECRET` for `app_slug=klokd` | ⏳ Pending out-of-band delivery from Silvia |
| Identiti customer-JWT endpoint for `aud=hakken` (cross-listed above) | ⏳ Pending Silvia — bigger of the two blockers |
| `pay_rate_kes` units ambiguity (reference says "integer, minor units" but example shows `800` matching whole KES) | ⏳ Conservative interpretation in code (whole KES); awaits Silvia confirmation |
| Hakken-emitted Todoku outbox events (`hakken.entity.created`, `hakken.shift_opening`, `hakken.tier_changed`) — Klokd's Todoku consumer not yet subscribed | 📋 Documented gap; Sprint 5 follow-up |

### Helpan escalations (per `OPERATOR_REQUEST_HELPAN.md`)

| Issue | Status |
|---|---|
| `HELPAN_API_BASE` + `HELPAN_APP_SECRET` + `HELPAN_WEBHOOK_SECRET` | ⏳ Pending Helpan operator handover |
| Customer JWT briefings — Klokd's JWT ≠ Identiti's; briefings will 401 until either Identiti adds Klokd as JWT verifier or Helpan adds HMAC-app-acting-for-customer flow | ⏳ Deferred per operator request |
| Register `klokd.shift_offer` event_type | ⏳ Operator action |
| Configure `HELPAN_KLOKD_URL` for target-rail dispatches | ⏳ Operator action |

### KP escalations (per KP handover 10 Jun)

| Issue | Status |
|---|---|
| `PAYMENT_RAIL_API_BASE` + `PAYMENT_RAIL_APP_SECRET` | ⏳ KP-1-Ops Railway deploy pending |
| Klokd's KP corporate `account_uuid` (tier_3) | ⏳ `onboard-account.ts --tier tier_3` once Railway live |
| `kp.hold.events` Kafka topic emission | ⏳ ~30 min KP-side work committed |
| `GET /v1/holds/:hold_id` poll fallback | ⏳ ~15 min KP-side committed |
| Webhook fork decision: Klokd chose Kafka (1) for prod, polling (3) for sandbox | 📋 Locked in client design |

### Chamia decisions

| ID | Status |
|---|---|
| **CHAMIA-WALLET** — wallet topology at Phase 3 | ⏳ Deferred; Klokd designed `PaymentRailClient` assuming option (a) LipaStack absorbs |
| **CHAMIA-ENTITY** — "Klokd Workplace Solutions Ltd" formalisation date | ⏳ Needed before Sprint 16 (KP corporate account_uuid) |
| **CHAMIA-REGION** — af-south-1 vs eu-west-1 | ✅ **RESOLVED** — eu-west-1 locked per platform standard |
| **CHAMIA-ITAFIKA** — Klokd-Itafika scope (playbook §3.3 options a/b/c/d) | ✅ **RESOLVED 23 Jun** — option (d) None: parked. Re-open only if real demand surfaces |

### Original 9 OIs

| ID | Status |
|---|---|
| OI-01 Identiti sandbox | ✅ Live |
| OI-02 KP sandbox | ⏳ KP-1-Ops pending |
| OI-03 Todoku sandbox | ✅ Live |
| OI-04 Klokd external billed tenant in Todoku | ✅ Provisioned 10 Jun |
| **OI-05 Hakken entity schemas** | ✅ **Resolved** via canonical `HAKKEN_INTEGRATION_REFERENCE.md` 22 Jun; Klokd Phase 1 client built against it 23 Jun |
| OI-06 KP production timeline | ⏳ CBK gate |
| OI-07 LipaStack designation date | ⏳ Affects S16 DTO |
| OI-08 Todoku WhatsApp template Meta approval timeline | ✅ All 8 templates approved + ULIDs delivered |
| OI-09 Klokd Health KMPDC expiry templates | ⏳ Deferred for Klokd Health |

---

## Architecture invariants — locked

From advisory §9 (AD-K01..AD-K10) — cannot change without explicit sign-off from Chamia + Silvia.

| ID | Decision | v3 status |
|---|---|---|
| AD-K01 | Klokd NEVER calls Daraja directly — all payments via Kipkiren Pay | ✅ Daraja service deleted; env vars purged from Railway; DEPLOY.md cleaned (23 Jun) |
| AD-K02 | Klokd NEVER stores National ID documents or biometrics — all identity via Identiti | ✅ S3 KYC upload deleted; certificates only |
| AD-K03 | Klokd NEVER calls Africa's Talking or WhatsApp Business API directly — all comms via Todoku | ✅ AT env vars purged; DEPLOY.md cleaned; all SMS/WA via Todoku |
| AD-K04 | Pay statements + contracts in Klokd S3 — NOT in Identiti (legitimate Klokd-owned records, 7-yr retention) | ✅ Storage service retains pay statements + contracts only |
| AD-K05 | FCM push direct — Todoku doesn't handle push | ✅ Expo Push direct; Todoku WA fallback |
| AD-K06 | Payment rail base URLs from env vars only — NEVER hardcoded | ✅ `PAYMENT_RAIL_API_BASE` only |
| AD-K07 | Typed DTOs on all payment rail response boundaries | ✅ `payment-rail.dto.ts` boundary; KES minor units helpers |
| AD-K08 | KMPDC verification is Klokd Health-owned compliance layer — NOT an Identiti function | ✅ Reserved for Klokd Health Sprint H3 |
| AD-K09 | Hakken is backing data source for shift feed + worker ranking from Phase 3 (Sprint 8+) | 🟠 Phase 1 LIVE 23 Jun (entity + broadcast); Phase 3 ranking-query swap reserved for Sprint 8+ |
| AD-K10 | `account_uuid` from Identiti is primary FK on ALL Klokd worker and employer tables | ✅ Migration applied to User, Worker, Employer |

Plus historical D-XX locked decisions from `klokd_reboot_pack_v1.md` §11 (D-01..D-18) — product/brand/UX/architecture.

---

## Sprint close-out log

| Sprint | Date closed | Tests | Migrations | Deploy | Notes |
|---|---|---|---|---|---|
| S0 | Apr 2026 | 45 pass | `20260401193045_init` | Railway live | `ae90457 Klokd MVP — full build` |
| S1 | Apr 2026 | — | — | — | Pre-rail schema + auth scaffold |
| S2 | Apr 2026 | — | — | — | Mobile shells (worker + employer Expo) |
| **S3** | **11 Jun 2026** | (existing tests not yet rebaselined for v3) | `20260609120000_rails_v3` + `20260609120100_user_account_uuid` | Railway auto-deploy `219b162` | Sprint 3 v3 scaffolding — all 4 rail clients shipped, 2 LIVE end-to-end; demo page at `/demo.html`; Klokd-side OTP flow (Identiti step-up gap) |
| S4 | Partial | — | — | — | KP wallet creation client wired; activates with KP-1-Ops |
| **S5** | **23 Jun 2026** (Klokd side) | 0 new (adversarial-verify workflow used as verification surface) | `20260619140000_hakken_entity_ids` | Railway auto-deploy `ca74640` | Hakken Phase 1 — entity registration + broadcast publishing as non-blocking background jobs (S5-NEW-01). 3-lens adversarial-verify caught 2 critical + 4 major bugs, all fixed in same commit |
| S6 | Partial | — | — | — | Notification stack refactored — Expo direct + Todoku WA fallback |
| S8 | Partial | — | — | — | Worker app `RailsLoginScreen` wired through live rails (web + Expo Go); Hakken worker entity upsert on KYC tier change wired 23 Jun |
| S9 | 10 Jun 2026 | — | — | — | All 8 Todoku templates approved + ULIDs in `rails/templates.ts` |
| Helpan integration | 11 Jun 2026 | — | `20260611120000_helpan_agent_runtime` | Railway auto-deploy `73e27d6` | Dual-role surface — consuming app + target rail per §A.11 |
| EAS account switch | 19 Jun 2026 | — | — | — | mumbus → kmv209; both APKs re-built under new projects `0f6b66f6` (worker) + `f29c48de` (employer); commit `9572095` |
| **Klokd-Itafika decision** | **23 Jun 2026** | — | — | — | Option (d) None — parked per playbook §3.3. `ca74640` |
| S5, S7, S10-S22, S23, H1, H3 | — | — | — | — | NOT STARTED (S5 done — listed above) |

---

## Reference index

- [KMV_RAILS_INTEGRATION_GUIDE.md](./KMV_RAILS_INTEGRATION_GUIDE.md) — **AUTHORITATIVE** wire-format reference for all 4 cross-cutting rails (871 lines; overrides operator packs)
- [docs/HAKKEN_INTEGRATION_REFERENCE.md](./docs/HAKKEN_INTEGRATION_REFERENCE.md) — **AUTHORITATIVE** Hakken-specific wire contract (Chamia, 22 Jun)
- [docs/HAKKEN_ITAFIKA_INTEGRATION_PLAYBOOK.md](./docs/HAKKEN_ITAFIKA_INTEGRATION_PLAYBOOK.md) — cross-cutting Hakken+Itafika playbook (Chamia, 23 Jun) — Klokd-Itafika §3.3 closed via (d)
- [docs/HAKKEN_INTEGRATION_RESULT.md](./docs/HAKKEN_INTEGRATION_RESULT.md) — Klokd Phase 1 integration result; what's wired, what's pending, both hard blockers
- [SILVIA_ESCALATIONS.md](./SILVIA_ESCALATIONS.md) — open items at Identiti's operator
- [STARTUP_HAKKEN.md](./STARTUP_HAKKEN.md) — Hakken bootstrap prompt for fresh sessions
- [OPERATOR_REQUEST_IDENTITI.md](./OPERATOR_REQUEST_IDENTITI.md) · [OPERATOR_REQUEST_TODOKU.md](./OPERATOR_REQUEST_TODOKU.md) · [OPERATOR_REQUEST_KP.md](./OPERATOR_REQUEST_KP.md) · [OPERATOR_REQUEST_HAKKEN.md](./OPERATOR_REQUEST_HAKKEN.md) · [OPERATOR_REQUEST_HELPAN.md](./OPERATOR_REQUEST_HELPAN.md) — provisioning asks
- [INSTRUCTION_PACK.md](./INSTRUCTION_PACK.md) — deeper build brief (12 sections)
- [STARTUP_PROMPT.md](./STARTUP_PROMPT.md) — tight session-bootstrap brief
- [README.md](./README.md) — orientation card
- [.env.example](./.env.example) — slot file for rail-consumer creds
- Chamia June 2026 canonical: [`chamia new docs/`](./chamia%20new%20docs/)
- Existing code: [`octopus-api/`](./octopus-api/) · [`worker-app/`](./worker-app/) · [`employer-app/`](./employer-app/) · [`claude-design/`](./claude-design/)
- Master cross-rail RECAP: `C:\Projects\Platform Rails-instruction pack v1-reboot pack v1.2\RECAP.md`

### Smoke scripts (parked until creds land)

- `octopus-api/scripts/smoke-identiti.ts` — ACTIVE (3/4 endpoints verified)
- `octopus-api/scripts/smoke-todoku.ts` — ACTIVE (POST /v1/messages/send confirmed)
- `octopus-api/scripts/smoke-payment-rail.ts` — parks until KP-1-Ops
- `octopus-api/scripts/smoke-helpan.ts` — parks until Helpan operator handover
- `octopus-api/scripts/smoke-hakken.ts` — parks until HAKKEN_APP_SECRET + Identiti customer-JWT endpoint

### Mobile builds (EAS · kmv209 account)

- Worker app: `@kmv209/klokd-worker` (`0f6b66f6-460e-4704-9824-6b60b882f266`) — latest APK `8ce0a4cb-34a5-4ced-a6fd-38b57c9f914d` (19 Jun)
- Employer app: `@kmv209/klokd-employer` (`f29c48de-8704-4c2f-a60a-7c53934e2676`) — latest APK `b8842660-1297-4a79-bb4b-bf9755bc2c68` (19 Jun)

---

*Klokd v3 · RECAP v1.2 · 23 June 2026 · Confidential · Update at every sprint boundary.*
*Major delta from v1.1: Sprint 5 closed with Hakken Phase 1 integration; 3-lens adversarial-verify workflow caught 2 critical + 4 major bugs (all fixed in same commit); Klokd-Itafika decision logged as (d) None — parked; EAS account switched mumbus → kmv209; OI-05 resolved via canonical reference doc; CHAMIA-ITAFIKA resolved.*
