# Klokd v3 · RECAP

> Per-app sprint state, deployment state, test counts, blockers. Master cross-rail tracker at `C:\Projects\Platform Rails-instruction pack v1-reboot pack v1.2\RECAP.md`.

**App:** Klokd Workplace Solutions Ltd · `klokd.co.ke` · Casual Labour Marketplace (Hospitality + Health)
**Status:** 🟢 v3 rail-alignment SHIPPED + **unified product surface SHIPPED 24 Jun** — **3 rails LIVE** (Identiti, Todoku, **Hakken Phase 1 — go-live 23 Jul, verified 31/31 against the live rail**), **2 rails PROVISION-READY** (Payment Rail, Helpan AI) · client wire-correct end-to-end · Itafika **formally parked** (playbook §3.3, option d) · **3 personas now folded behind one web front door** (landing → persona-picker sign-in → Worker / Employer / Admin) · **Helpan integration ACTIVE** (customer-JWT unblocked — Identiti 0.1.4, verified 24 Jul) · **⏸️ KP + Todoku cross-rail work HELD** — every KP-dependent item (S4 wallet · S16 payment · Helpan→KP payout dispatch) parked until KP-1-Ops; the **Helpan→Todoku dispatch leg** + **Hakken→Todoku outbox (HK-11)** also parked. Todoku stays LIVE for Klokd's own SMS/OTP; only its cross-rail fan-out is held. **Do not chase either.**
**Repo:** `iamkn1ght/klokd` (moved from `thhvvv/klokd`) · branch `main`
**Latest commit:** `05fe5a4 fix(hakken): stop the PII guard from blocking employer business-name registration` · 23 July 2026 (Hakken go-live)
**Investor build:** 🟢 **APKs LIVE 08 Jul** (worker `57c3da93`, employer `e6de9740`) — mobile-first redesign + root-caused worker sign-in + expo-updates/OTA; cold-phone auth verified end-to-end against Railway with `RAIL_FALLBACK_LOCAL=true`. Supersedes the 07 Jul APKs (`4abd2fa8` / `e18e9fc7`) which predated the expo-updates config.
**iOS review:** User is iPhone-only (no APK sideload). Day-to-day path = **dev-server over Cloudflare tunnel** (`exp://<host>.trycloudflare.com` → Expo Go; no login, not persistent — dies when dev machine sleeps). Persistent path = published EAS Update (`exp://u.expo.dev/<projectId>?channel-name=preview`) but 403'd because projects are private + owned by `kmv209` while the user's phone Expo Go is signed in as **`mumbus`**. **Decision 08 Jul: transfer both projects `kmv209 → mumbus`** (dashboard, preserves project IDs/URLs/APKs, stays private) so mumbus-signed Expo Go loads them with no 403 and no dev machine. Transfer in progress (user-side dashboard action).
**Octopus API URL:** https://klokd-production.up.railway.app (Railway)
**Supabase project:** `nbtpkmjovgbwgwefsdjn` · region locked **eu-west-1** (CHAMIA-REGION resolved per platform standard)
**Domain:** `klokd.co.ke` (NEVER `.com` or `.app`) · handle `@klokdKE` (NEVER `@klokKE`)
**Surface count:** 4 Expo bundles — `web-app` (unified front door, all 3 personas), `worker-app` + `employer-app` (native mobile, App Store / Play Store), `admin-app` (legacy stand-alone, retiring as `web-app` admin matures)

---

## Headline — what shipped 9-24 June 2026

Klokd went from "v1 MVP, no rail integration" to "wire-correct against all five applicable KMV rails" in two weeks (9-23 Jun). Discovered + documented ~20 wire-format errata across the operator packs and reference clients. Two LIVE end-to-end (Identiti, Todoku); three PROVISION-READY (KP, Helpan, Hakken) awaiting operator handovers; Itafika formally closed as N/A.

**24 Jun product-surface day:** entire app surface unified behind one design backbone (the v5 employer Welcome — ambient electric orbs, glass cards, 520ms ease-out-quart motion) — 22 worker/employer screens migrated; a new `admin-app` shipped with 6 ops screens (Overview · Verification · Disputes · Payments · Audit · Users); and a unified `web-app` folded all three personas behind one landing + persona-picker sign-in (Stripe / Linear pattern; admin card hidden unless email ends `@klokd.co.ke`). Klokd is now **one product** on the web, **two role-specific apps** on mobile.

Reference work memorialised in [KMV_RAILS_INTEGRATION_GUIDE.md](./KMV_RAILS_INTEGRATION_GUIDE.md), [HAKKEN_ITAFIKA_INTEGRATION_PLAYBOOK.md](./docs/HAKKEN_ITAFIKA_INTEGRATION_PLAYBOOK.md), [HAKKEN_INTEGRATION_REFERENCE.md](./docs/HAKKEN_INTEGRATION_REFERENCE.md), and per-rail integration result docs.

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
| `5dfe526` | 24 Jun | RECAP bump to v1.3 |
| `2ecc56b` | 07 Jul | **Mobile-first redesign** across worker + employer — native ambient orbs (SVG radial), `PressScale` feedback, `KlokdTabBar` custom bottom bar, `SafeTop` notch handling on 21 screens, mobile-only Welcome screens, 54pt CTAs / 44pt tap-target floor, type-scale bumps, staggered reveals |
| `155526a` | 07 Jul | **Root-caused worker sign-in** (4 stacked causes) + landing polish — see Sign-in fix box below |
| `3cfb47f` | 07 Jul | Sandbox OTP echo follows `RAIL_FALLBACK_LOCAL` (one flag now controls full sandbox auth) |
| `2c8dc8b` | 23 Jun | **Hakken Phase 1 integration** — entity registration + broadcast publishing as non-blocking background jobs (S5-NEW-01); 3-lens adversarial-verify workflow caught 2 critical + 4 major bugs, all fixed in same commit |
| `ca74640` | 23 Jun | Klokd-Itafika decision logged — **option (d) None: parked** per playbook §3.3 |
| `86b2b71` | 23 Jun | RECAP bump to v1.2 |
| `202eb43` | 24 Jun | **Design backbone unified across worker + employer apps** — shared `KlokdLayout` primitives (ambient orbs, dot grid, glass cards, FadeUp motion, HoverCard, LiveDot); 22 screens migrated to the v5 visual language; one accent rule (electric `#00E5A0`) honoured throughout, volt reserved for per-app brand identifier |
| `10ab737` | 24 Jun | **`admin-app/` scaffolded** — new third Expo project for ops/compliance/support · desktop-first side-rail nav · 6 screens shipped (Overview · Verification · Disputes · Payments · Audit · Users) · all using KlokdLayout backbone · Money Rule preserved (no amount mutations) |
| `2801629` | 24 Jun | **`web-app/` unified front door** — single landing page (both audiences) → persona-picker sign-in (Worker / Employer / Admin, admin hidden unless `@klokd.co.ke`) → routes to the right shell (top-tab `ConsumerShell` for worker/employer, side-rail `AdminShell` for admin) · "Switch workspace" hops without re-auth · folds all three personas behind one URL |

---

## Headline — Hakken go-live (23 July 2026)

**Hakken is LIVE end-to-end.** The two blockers that held Phase 1 at PROVISION-READY since 23 Jun both cleared, and the full integration was verified against **deployed** Hakken (`hakken-production.up.railway.app`) through Klokd's real service + client code with real Identiti-minted tokens — **31/31 functionality checks, no mocks**.

- **Identiti `aud=hakken` customer JWT** shipped at Identiti `0.1.3` (`POST /v1/customers/{uuid}/tokens`), operator-gated behind a new `identiti:token:issue` scope. Silvia granted it to `klokd_sandbox` (run in Identiti's **Supabase** SQL editor); verified from Klokd's side (pre-grant `403 AUTH_SCOPE_INSUFFICIENT` → gone). `getHakkenJwt` now mints a real RS256 token (iss `https://api.id.identiti.co.ke`, aud `https://hakken.co.ke`, sub `account_uuid`, kid `lrnn8c8kQzc0GJsU` in JWKS) and caches per account at ~80% TTL.
- **`HAKKEN_APP_SECRET` + `HAKKEN_API_BASE`** set in Klokd's Railway env — base `https://hakken-production.up.railway.app` (the `hakken.co.ke` custom domain does not resolve yet), secret `hak_sk…a9c4` (71 chars, plaintext-compared). Hakken `klokd` app row = `provisioning` (auth-accepted).
- **Hakken verifier config fixed** — deployed Hakken's `IDENTITI_JWKS_URL` + `IDENTITI_JWT_ISSUER` were pointed at the non-resolving `identiti.co.ke`; corrected to the live Railway JWKS + `https://api.id.identiti.co.ke`. Proven: a real token now passes Hakken's JWT layer (fails only on a deliberately-wrong secret → `APP_AUTH_INVALID`).
- **Bug caught + fixed by the smoke** (`05fe5a4`): Klokd's local PII guard rejected any two-word capitalised `display_name`, blocking employer registration for essentially every real business name ("Java House", "Sarova Stanley"). The rail itself accepts business names (verified 201, not `PII_DETECTED`); guard relaxed for `display_name` only — phone/email detection there + all metadata checks retained.

**Verified functionalities (31/31, live rail):** employer + worker registration, shift publish/revoke, entity retire, idempotency (register + publish), `patchEntity`, 3-header auth (+ invalid-token + wrong-secret negatives), consent_scope `single_app` (R8), whole-KES `pay_rate_kes`, banned-key (§10.7) + PII (§5) walls, TTL bounds (>168h rejected), §A.11 traceparent + business_op_id on audit rows, ranking correctly absent (Phase-1 deferred), and the **D2 deferral-retry sweep** replaying a stranded `hakken.*.deferred` row to a live publish.

| Commit | Date | What |
|---|---|---|
| `532c4fa` | 23 Jul | Persist §A.11 traceparent + business_op_id on Hakken audit rows; R8 consent_scope → `single_app`; fixed a latent FK bug that was silently swallowing every deferral audit row |
| `b9ac159` | 23 Jul | docs: formal Identiti request for the `aud=hakken` JWT (answered + shipped as 0.1.3) |
| `393d124` | 23 Jul | **D2 deferral-retry sweep** — replays `hakken.*.deferred` audit rows; probe-gated + exponential backoff (Hakken R7) |
| `883be64` | 23 Jul | Real `aud=hakken` mint via Identiti 0.1.3 + per-account token cache + scope-gate probe |
| `489d427` | 23 Jul | Keep deferrals retryable until BOTH prerequisites (Identiti scope + Hakken creds) land, not just one |
| `05fe5a4` | 23 Jul | Fix PII guard blocking employer business-name registration (caught by the full smoke) |

**Still open (non-blocking):** Hakken `klokd` app is `provisioning` — Silvia may flip to `active` for formal go-live. Two Identiti *smoke* accounts remain from testing (`acc_a91e2d68…`, `acc_44cbfc00…`; no hard-delete). Ranking client stays Phase-3 (Sprint 8+).

---

## Sprint state — v4 backlog + June 2026 delta

| Sprint | Title | Status | Delta items | Notes |
|---|---|---|---|---|
| **S0** | MVP foundation (monorepo + Prisma + Supabase + Railway + EAS + CI/CD) | 🟢 DONE Apr 2026 | — | `ae90457 Klokd MVP — full build` |
| S1–S2 | Pre-rail (schema, auth scaffold, mobile shells) | 🟢 DONE Apr 2026 | — | — |
| **S3** | Authentication + Identity foundation | 🟢 DONE Jun 2026 | C1 ✓ + C2 ✓ + 3 NEW ✓ (Identiti SDK · Todoku client · PaymentRailClient) | Shipped 9-11 Jun across `0e24e6d`, `ee2f48f`, `2d0222c`, `c71d72a`. Klokd-side OTP flow per `219b162` (Identiti step-up requires `active` state; gap escalated to Silvia) |
| S4 | Worker/employer onboarding flows | 🟠 PARTIAL · ⏸️ **KP part HELD** | S4-NEW-01 KP wallet creation | Wallet client wired; **HELD — activates when KP-1-Ops lands (KP not ready; do not chase)** |
| **S5** | Shift posting + matching | 🟢 **DONE + LIVE 23 Jul** | S5-NEW-01 Hakken shift entity registration | `2c8dc8b` client/service/schema + `883be64`/`05fe5a4` go-live. **LIVE** — shift publish/revoke verified end-to-end against deployed Hakken (31/31). Blockers cleared 23 Jul |
| S6 | Notifications + GPS + clock-in | 🟠 PARTIAL | C3 ✓ (S6-04 revised — WhatsApp via Todoku, FCM unchanged) | Notification flow refactored; FCM direct (AD-K05); Todoku WA fallback wired |
| S7 | Compliance Engine (Layer 1 service per D-16) | ⚪ NOT STARTED | (no rail delta) | — |
| **S8** | Worker app MVP | 🟠 PARTIAL | S8-NEW-01 Hakken worker entity registration | Worker upsert on KYC_TIER_CHANGED webhook wired (`2c8dc8b`); RailsLoginScreen shipped 11 Jun |
| S9 | Notifications hardening | 🟢 DONE | S9-NEW-01 Todoku template registration (8 templates, ULIDs locked) | All templates approved + ULIDs in `rails/templates.ts` |
| S10–S15 | Employer app + shift state machine + dispute + ratings + admin | ⚪ NOT STARTED | (no rail delta) | — |
| **S16** | Payment Service production | ⏸️ **HELD** (provision-ready) | C4 ✓ (S16-01 revised — `PaymentRailClient` not Daraja) + S16-02/03 minor | Client wire-correct per KP handover; **HELD — awaits KP-1-Ops Railway deploy (KP not ready upstream; parked, do not chase)** |
| S17–S22 | Pilot ops + WIBA + ODPC + Privacy Policy + load test + KRA/PAYE/NSSF/SHIF registrations | ⚪ NOT STARTED | — | External regulator gates |
| S23 | Beta launch — 50 employers + 200 workers Nairobi hospitality | ⚪ NOT STARTED | — | Target: per advisory was May/June 2026 — overdue |
| **(new)** | **Helpan AI integration** | 🟠 PROVISION-READY | Dual-role surface · §A.11 audit enforced | `73e27d6` 11 Jun |

**Klokd Health phase H sprints** (separate roadmap):
- H1 (project setup) · ⚪ Not started
- H3 (KMPDC verification + 2 Health Todoku templates) · ⚪ Not started · Blocked on OI-09

**Product surface sprint (new, 24 Jun):**
- **SP-1** Design backbone unification across worker + employer apps · 🟢 **DONE 24 Jun** (`202eb43`) · 22 screens migrated
- **SP-2** Admin app scaffold · 🟢 **DONE 24 Jun** (`10ab737`) · 6 screens shipped
- **SP-3** Unified web-app (landing + persona-picker sign-in folding 3 personas) · 🟢 **DONE 24 Jun** (`2801629`) · Worker Home + Employer Dashboard + all 6 Admin screens live; remaining consumer tabs (Worker Shifts/Pay/Me, Employer Shifts/Pay/Team) show honest `PlaceholderTab` previews
- **SP-4** Port remaining consumer tabs into web-app (Worker Shifts/Pay/Me, Employer Shifts/Pay/Team full screens) · 🟠 PENDING
- **SP-5** Retire stand-alone `admin-app/` dev server once `web-app/admin/*` reaches parity · 🟠 PENDING (admin screens are byte-identical so this is a config flip, not a port)

**Total delta:** +22 points across 23 sprints + 5 product-surface sprints. Sprint 3 (the biggest) is **DONE**. Sprint 5 is **DONE from Klokd's side** as of 23 Jun. Product-surface sprints SP-1..SP-3 **DONE 24 Jun**. Sprints 16 + Helpan are PROVISION-READY (code complete, awaiting operator handovers).

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
| **`admin-app/` dev server (web)** | ✅ http://localhost:8093 — 6 screens (Overview · Verification · Disputes · Payments · Audit · Users) on KlokdLayout backbone (24 Jun) |
| **`web-app/` unified dev server (web)** | ✅ http://localhost:8094 — landing + persona-picker sign-in + all three workspace shells (24 Jun); production target `klokd.co.ke` |
| Worker `worker-app/` web dev server | ✅ http://localhost:8091 — legacy stand-alone, retiring as `web-app` matures |
| Employer `employer-app/` web dev server | ✅ http://localhost:8092 — legacy stand-alone, retiring as `web-app` matures |
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
| **Payment Rail (Kipkiren Pay)** | ⏸️ **HELD** — KP not ready upstream (KP-1-Ops Railway deploy pending) | ⏸️ **HELD (provision-ready, parked — do not chase)** — `PaymentRailClient` wire-correct per 10 Jun handover (holds vocab, KES minor, step-up threshold 10K, kipkiren_pay audience); smoke parks at `scripts/smoke-payment-rail.ts`. **All KP-dependent work (S4 wallet, S16 payment, Helpan→KP payout dispatch) resumes only when KP-1-Ops lands.** |
| **Hakken** (cross-app discovery — `klokd_two_sided_v1` plugin) | ✅ HK-1..HK-7 closed + HK-8 PARTIAL · `klokd_two_sided_v1` plugin shipped | ✅ **LIVE (Phase 1 — go-live 23 Jul)** — verified 31/31 end-to-end against deployed Hakken with real Identiti tokens: register (employer + worker) · publish/revoke shift broadcasts · retire · idempotency · patch · 3-header auth · consent_scope `single_app` · whole-KES pay_rate · banned-key + PII walls · TTL bounds · §A.11 trace propagation · D2 deferral-retry sweep. Real `aud=hakken` JWT mint (`883be64`) + guard fix (`05fe5a4`, employer business names). Both hard blockers (HAKKEN_APP_SECRET + Identiti aud=hakken JWT) **RESOLVED**. Ranking stays Phase 3 |
| **Helpan AI** (agent runtime · briefings · authorities · action dispatch) | ✅ LIVE on Railway (Supabase `jvkhoveeayixbjnhmqxa`) · `helpan-klokd-v1` agent admitted with 3 scopes + `klokd.shift_search` matcher | ✅ **PROVISION-READY** — dual-role client + target-rail dispatch endpoint shipped 11 Jun per `73e27d6`; smoke at `scripts/smoke-helpan.ts` |
| **Itafika** | LIVE on Railway dev | 🚫 **NOT APPLICABLE** — per advisory §2.6 + playbook §3.3 decision logged 23 Jun (option d: parked). No Klokd-Itafika joint exists; re-open via `OPERATOR_REQUEST_ITAFIKA.md` only if real demand surfaces |
| LipaStack | Separate platform; not a rail | Phase 3 — `PAYMENT_RAIL_API_BASE` env-var flip when LipaStack designated (CHAMIA-WALLET deferred) |

---

## Product surface — 24 Jun unification

Klokd is now one product on the web and two role-specific apps on mobile. The web surface is what unifies the brand; the mobile apps stay separate so they keep App Store / Play Store presence.

| Surface | Tech | Personas hosted | Status |
|---|---|---|---|
| **`web-app/`** | Expo + RNW (port 8094) | Worker · Employer · Admin | 🟢 LIVE 24 Jun — single landing + persona-picker sign-in, full Worker Home + Employer Dashboard + all 6 Admin screens; Worker Shifts/Pay/Me + Employer Shifts/Pay/Team render honest `PlaceholderTab` previews (SP-4 pending) |
| **`worker-app/`** | Expo (web + native) | Worker only | 🟢 LIVE; 14 screens on KlokdLayout backbone (24 Jun); native APK at `8ce0a4cb` |
| **`employer-app/`** | Expo (web + native) | Employer only | 🟢 LIVE; 9 screens on KlokdLayout backbone (24 Jun); native APK at `b8842660` |
| **`admin-app/`** | Expo + RNW (port 8093) | Admin only | 🟢 LIVE 24 Jun — 6 screens; **retiring** as `web-app/admin/*` reaches parity (screens are byte-identical copies, retirement is a config flip not a port) |

**Shared design backbone** (locked 24 Jun, mirrored across all four apps): `KlokdLayout.tsx` exporting `KlokdScreen` (marketing wrapper), `AmbientOrbs` (drop-in background for mobile-shaped flows), `FadeUp` (520ms ease-out-quart cascade), `GlassCard`, `HoverCard`, `LiveDot`, `EASE` constant.

**Design rules in force** (per `feedback_klokd_design_standards`):
- Single primary accent: electric `#00E5A0`. Volt `#BCFF4E` demoted to per-app brand identifier only (FOR WORKERS / FOR EMPLOYERS badges; employer-side eyebrows in admin).
- Reference quality bar: Linear, Stripe, Vercel, Arc, Raycast, Ramp.
- Motion: 0.4–0.7s, ease-out-quart (`Easing.bezier(0.22, 1, 0.36, 1)`), fade-up + stagger.
- Max content width 1180–1240px depending on shell.

**Sign-in / persona model:** A single account can hold multiple personas. Admin persona is gated — the card is hidden in the picker unless the email already entered ends in `@klokd.co.ke`. "Switch workspace" in every shell returns to the picker without signing out, so a multi-role operator hops between without re-auth. **Money Rule preserved** — no amount mutations from any of the four web surfaces yet (all release / refund / split actions stub pending KP wire).

---

## Outstanding blockers — Silvia's queue + operator handovers

### Identiti escalations (per `SILVIA_ESCALATIONS.md` + new 23 Jun)

| Issue | Status | Workaround in Klokd |
|---|---|---|
| `klokd.*` operation_kind enum not registered | ⏳ Pending Silvia | Klokd does Klokd-side OTP via Todoku for first-login (Identiti step-up reserved for high-value payouts on `active` customers) |
| Customer state `pending_onboarding` → `active` activation path | ⏳ No endpoint exists | Klokd-side OTP flow makes this non-blocking; step-up only after Identiti's activation path exists |
| **NEW (23 Jun): Customer-JWT issuance endpoint for `aud=hakken`** | ✅ **RESOLVED 23 Jul** | Shipped as Identiti `0.1.3` `POST /v1/customers/{uuid}/tokens`, scope-gated (`identiti:token:issue`, granted to `klokd_sandbox`). `getHakkenJwt` mints + caches real RS256 tokens (`883be64`). Verified end-to-end |
| Operator pack §4 says hex sig; live rail uses base64 | 📋 Documented in `KMV_RAILS_INTEGRATION_GUIDE.md` | Klokd uses base64 (correct) |
| `/v1/customers/{uuid}/kyc/iprs` wire schema | ⏸ Untested | VerifyID flow stub — Identiti KYC is IPRS data lookup (national_id + DOB), not image upload |
| Webhook HTTP signing | ⏸ Deferred to ID-14 Phase 2 (Kafka today) | Handler built but inert until secret lands |

### Todoku escalations

| Issue | Status |
|---|---|
| Webhook URL registration (`https://klokd-production.up.railway.app/api/v1/webhooks/rails/todoku`) | ⏳ Pending Silvia operator-console config |
| Cross-rail sandbox token mismatch (Identiti issues real JWTs; Todoku sandbox needs `SANDBOX_TOKEN_DELIVER_OK_*`) | ⏳ Pending coordination; prod unaffected |

### Hakken escalations (23 Jun · OD-9 dev-handoff closed Klokd-side 08 Jul, see `HAKKEN_OD9_ANSWERS.md`)

**OD-9 status (08 Jul):** dev = **Mumbua Makau, starts 23 Jul** (parallel Lunch Drop `lunch_drop` sprint → ~2wk @ 50% → Phase 1 lands early Aug). POC matrix collapsed — Klokd has no separate DevOps/SRE; dev + Cornelius own Railway env + auth; Ivy owns product. Both blockers below escalated to Silvia, target land by **22 Jul**.

| Issue | Status |
|---|---|
| `HAKKEN_APP_SECRET` for `app_slug=klokd` | ⏳ Pending Silvia. Transport: Bitwarden Send / onetimesecret / live-call paste (Klokd not on 1Password) → Railway env; receiver = dev/Cornelius. |
| Identiti customer-JWT endpoint for `aud=hakken` (cross-listed above) | ✅ **RESOLVED 23 Jul** — shipped as Identiti `0.1.3` `POST /v1/customers/{uuid}/tokens` (scope `identiti:token:issue`, granted). `HAKKEN_APP_SECRET` + base URL also landed. Hakken LIVE, verified 31/31. |
| `pay_rate_kes` units | ✅ **RESOLVED 08 Jul** — whole KES confirmed both sides (Hakken corrected ref `fbe1040`; Klokd code `hakken.service.ts:229` already correct). Hakken doesn't touch money. |
| Hakken-emitted Todoku outbox events (`hakken.entity.created`, `hakken.shift_opening`, `hakken.tier_changed`) — Klokd's Todoku consumer not yet subscribed | 📋 Documented gap; Sprint 5 follow-up |
| Klokd dev-owed items still with Ivy: §5 pilot KPI targets + deactivation trigger (Klokd recommends retire-on-`ACCOUNT_DEACTIVATED`-webhook) | ⏳ Pending Ivy |

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
| **SP-1 Design backbone unification** | **24 Jun 2026** | tsc clean across worker + employer | — | Dev only | `KlokdLayout` primitives + 22 screens migrated to v5 visual language. `202eb43` |
| **SP-2 Admin app scaffold** | **24 Jun 2026** | tsc clean | — | http://localhost:8093 | 6 screens (Overview · Verification · Disputes · Payments · Audit · Users) on KlokdLayout backbone. Money Rule preserved. `10ab737` |
| **SP-3 Unified web-app** | **24 Jun 2026** | tsc clean; Metro bundle clean (348 modules · 15s) | — | http://localhost:8094 | Single landing + persona-picker sign-in folding Worker / Employer / Admin behind one front door. Stripe/Linear pattern. Admin hidden unless `@klokd.co.ke`. `2801629` |
| S7, S10-S22, S23, H1, H3, SP-4, SP-5 | — | — | — | — | NOT STARTED (S3 + S5 + SP-1..SP-3 done — listed above) |

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

- Worker app: `@kmv209/klokd-worker` (`0f6b66f6-460e-4704-9824-6b60b882f266`) — **latest APK `57c3da93-4a45-4888-9526-b8e8daeb657d` (08 Jul, investor build, OTA-capable)** — `expo.dev/artifacts/eas/vbzCu8IML5uROdMMy9MXTHpGtxyNAFkyPqeyXVmUo0c.apk`
- Employer app: `@kmv209/klokd-employer` (`f29c48de-8704-4c2f-a60a-7c53934e2676`) — **latest APK `e6de9740-bc8c-4feb-affb-5d87406c6498` (08 Jul, investor build, OTA-capable)** — `expo.dev/artifacts/eas/B0waj6pYUl2QpJhK7Z7m3svl_zO9ASWt7tWwD5-fy-A.apk`
- Prior APKs (07 Jul, `4abd2fa8` / `e18e9fc7`) superseded — predated expo-updates config, so no OTA. Use the 08 Jul builds.
- EAS Update: both apps on `preview` channel + branch (runtime `exposdk:54.0.0`). The 08 Jul APKs embed the updates URL, so JS-only fixes can be shipped over the air via `eas update --branch preview` without a rebuild/reinstall. Republished clean on the `preview` branch 08 Jul (worker group `8d051a08`, employer `9f100d1e`) — verified the exported bundle targets Railway (`klokd-production.up.railway.app`, no tunnel URL leaked in) and both manifests serve iOS (HTTP 200). Build note: use `EAS_SKIP_AUTO_FINGERPRINT=1` on this machine — local fingerprinting (and `eas update` export) OOMs under ~1 GB free RAM; bump `NODE_OPTIONS=--max-old-space-size=2048+`.
- iOS review paths (user is iPhone-only): (1) **dev-server tunnel** — `cloudflared tunnel --url http://localhost:8181` + `expo start --lan --port 8181` with `EXPO_PACKAGER_PROXY_URL=<tunnel>` + `EXPO_OFFLINE=1`; scan `exp://<host>` in Expo Go; no login gate, dies on PC sleep. (2) **published update** `exp://u.expo.dev/<projectId>?channel-name=preview` — persistent but needs Expo Go signed into an account with project access (403 as `mumbus` until the kmv209→mumbus transfer lands). Standalone iOS + TestFlight still deferred until an Apple Developer account. **This machine holds only ONE Metro instance at a time (~0.4–0.9 GB free; VS Code ~1 GB)** — a second dev server OOMs, which is the practical driver for moving to the mumbus published-update path.
- Post-transfer TODO (needs mumbus access token, since CLI is authed as kmv209): flip `owner` `kmv209 → mumbus` in both `app.json`; future `eas update`/build run under mumbus. Token at expo.dev/accounts/mumbus/settings/access-tokens.
- Admin app: web-only at this stage; native EAS build deferred (operators work on desktop)
- Web app: dev only at this stage; production target `klokd.co.ke` (build + deploy reserved for next sprint)

### Worker sign-in fix (07 Jul) — 4 stacked root causes

Sign-in was fully broken on device; each cause was fixed at the root, not patched:

1. **API base URL** — client sent physical iOS devices to `http://localhost:3000` (which on the phone is the phone). `api.ts` now resolves `EXPO_PUBLIC_API_URL` first, else the deployed Railway API — the only safe default for a real device.
2. **Navigation architecture** — `RailsLogin` did `navigation.reset` to a `Main` route absent from the onboarding stack (redbox), and `RootNavigator` used `initialRouteName` (read once at mount, so auth-state flips never switched stacks). Now the canonical state-driven pattern: the rendered screen set changes with `isAuthenticated`/`isNewUser`, no manual cross-stack resets.
3. **`isNewUser` never cleared** — a new user could finish onboarding and stay locked out of Main. `AuthContext.completeOnboarding()` added; `MpesaSetup` calls it as the final step.
4. **Identiti rail outage** — `POST /v1/customers` 500s upstream for every new registration (Silvia's side, unresolved — needs `SILVIA_ESCALATIONS.md` entry). Klokd API gains **`RAIL_FALLBACK_LOCAL`** (default OFF, sandbox-only): when the rail is unreachable it mints a clearly-marked `acc_local_*` tier-0 placeholder so auth stays testable. **Set `true` on Railway for the investor demo; flip OFF before real traffic** — placeholders cannot pass KYC or receive payouts. Verified end-to-end 07 Jul: cold phone → OTP → verify → JWT issued against live Railway.

### Web dev surfaces (24 Jun)

| URL | App | Purpose |
|---|---|---|
| http://localhost:8094 | `web-app` | **Unified front door** — landing + persona-picker → Worker / Employer / Admin |
| http://localhost:8091 | `worker-app` | Legacy worker-only (retiring) |
| http://localhost:8092 | `employer-app` | Legacy employer-only (retiring) |
| http://localhost:8093 | `admin-app` | Legacy admin-only (retiring as `web-app/admin/*` is byte-identical) |

---

*Klokd v3 · RECAP v1.5 · 08 July 2026 · Confidential · Update at every sprint boundary.*
*v1.5 addendum: iOS review workflow settled — user is iPhone-only, so review runs through Expo Go via (a) a dev-server Cloudflare tunnel (frictionless, not persistent) or (b) published EAS Update (persistent, but 403 until the project is owned by the account the phone is signed into). Both preview updates republished clean (Railway-targeted, iOS manifests 200). Decision: transfer `klokd-worker` + `klokd-employer` `kmv209 → mumbus` (in progress, user-side) so the mumbus phone loads them off Expo's cloud with no dev machine and no 403. Machine is memory-starved (one Metro at a time), which is the practical reason to move off dev-server hosting. Post-transfer: set `owner=mumbus` in both app.json + mumbus access token for future eas commands.*
*08 Jul addendum: rebuilt both investor APKs (worker `57c3da93`, employer `e6de9740`) to include the expo-updates config — they are now OTA-capable, so JS fixes ship over the air on the `preview` channel without a reinstall. Prior 07 Jul APKs superseded.*
*Major delta from v1.3: Mobile-first redesign across worker + employer native apps (native ambient orbs, press feedback, custom bottom tab bar, notch-safe layout, mobile-only Welcome screens); worker sign-in root-caused and fixed end-to-end (4 stacked causes — API base, navigation architecture, isNewUser lifecycle, Identiti-outage fallback); fresh investor APKs built for both apps (worker `4abd2fa8`, employer `e18e9fc7`) with cold-phone auth verified against live Railway under `RAIL_FALLBACK_LOCAL=true`. iOS demo path = Expo Go via EAS Update (standalone iOS deferred until Apple Developer account). Open blocker: Identiti `POST /v1/customers` 500s upstream — flag is a sandbox bridge, not a fix.*
