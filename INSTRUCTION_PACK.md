# Klokd v3 — v1 → v3 Rail-Alignment Instruction Pack

**Document type:** Brownfield migration instruction pack — takes the existing Klokd codebase (Express + Prisma + Supabase Auth + Direct Daraja + Direct AT) to Klokd v3 (rail-consuming) per Chamia's June 2026 Rails Integration Advisory.
**Date authored:** 9 June 2026.
**Authority:** `chamia new docs/klokd_rails_integration_advisory.md` v1.0 (June 2026, CANONICAL) + `chamia new docs/klokd_sprint_backlog_delta_silvia_v1.1.md` (June 2026, CANONICAL engineering delta) + Klokd Sprint Backlog v4 (root, apply the delta) + Klokd Reboot Pack v1.0 (March, historical context — superseded for rail decisions).
**Owner:** Chamia Mutuku (CEO · Klokd Workplace Solutions Ltd) · CTO interface: Silvia Mumbua (Kipkiren Teknolojia, rails owner).
**Target repo:** `C:\Projects\Klokd\` (this folder).
**Status:** 🟡 v1 codebase shipped (MVP build · last commit `52b9a26` Port Claude Design 1:1 · 24 April 2026) · 🟠 v3 rail-alignment not yet started · 9 operator items at Silvia.

---

## 0. Read this first — Klokd v3 in one paragraph

Klokd is a **two-sided M-Pesa-native casual labour marketplace** — workers find shifts near them, employers post in under 2 minutes, M-Pesa pays workers within 30 minutes of clock-out, every shift generates a compliant Employment Act s.9 contract. Hospitality beachhead in Nairobi (50 employers + 200 workers beta cohort). **Klokd Health** is a sibling product (same codebase pattern, adds KMPDC professional licence verification). v1 codebase is real and deployed (Express 5 + Prisma + Supabase Auth + Direct Daraja + Direct Africa's Talking + Supabase Storage) but pre-dates the KMV rails thesis. **v3 is the rail-alignment retrofit** — replace 3 direct-vendor integrations (Daraja → PaymentRailClient; AT/WA → Todoku; Internal-S3 KYC → Identiti) per Chamia's June Rails Integration Advisory. 10 architecture decisions locked (AD-K01..AD-K10), 4 sprint conflicts identified, 7 new sprint stories required.

**Two strategic shifts in the June advisory:**
1. **Entity restructure** — Klokd is being separated from KMV parent into "Klokd Workplace Solutions Ltd" under Kipkiren Teknolojia umbrella (advisory authorship line confirms).
2. **Payment rail abstraction** — Klokd's payment client is `PaymentRailClient` (NOT `KipkirenPayClient`). Env var is `PAYMENT_RAIL_*` (NOT `KIPKIREN_PAY_*`). Reason: LipaStack will transcend Kipkiren Pay at Phase 3 (not replace it as a wrapper — see advisory Part E).

---

## 1. Platform context — six rails + Klokd's relationship to each

| Rail | Klokd uses it for | Klokd phase |
|---|---|---|
| **Identiti** | Account UUID · KYC verification + storage · phone tokens · step-up · KYC tier signal | Sprint 3 onward (mandatory from v3) |
| **Payment Rail** (Kipkiren Pay → LipaStack at Phase 3) | Wallet creation · escrow funding · 4-hour auto-release · B2C payouts · 4% fee deduction · KYC-tiered transaction limits | Sprint 3 (client) + Sprint 16 (production) |
| **Todoku** | OTP delivery (registration + step-up) · 6 core notification templates + 2 Health templates · SMS + WhatsApp routing · SIMjacker defence inherited | Sprint 3 onward (mandatory) |
| **Hakken** | Shift entity registration (post/fill/expire) · Worker entity registration · Phase 3 worker-side shift discovery + employer-side worker ranking | Sprint 5 (entity registration) + Sprint 8+ (discovery backed by Hakken) |
| **Helpan AI** | DEFERRED — no Klokd-specific agent in Phase 1. Phase 2 candidates: worker shift optimisation, employer demand forecasting, dispute resolution assistant | Phase 2 / Year 2 |
| **Itafika** | NOT APPLICABLE — workers commute independently. Future relevance: Klokd Agri (equipment transport), Klokd Home (elder-care worker transport) at Year 2 | N/A at v3 |

Plus: **LipaStack** is the eventual designated KMV payment rail. Klokd never calls LipaStack directly — it calls `PaymentRailClient`, which points at Kipkiren Pay sandbox now and at LipaStack production at Phase 3. The transition is an env-var change, not a code change.

---

## 2. What Klokd IS (and is NOT)

### Klokd IS (per `klokd_reboot_pack_v1.md` §1)
- **Two-sided M-Pesa-native casual labour marketplace.** Workers find shifts; employers post; M-Pesa pays within 30 min of clock-out.
- **Hospitality-first** (beachhead Nairobi · 50 employers + 200 workers beta cohort).
- **Compliance-led** — every shift generates an Employment Act s.9 contract; PAYE + NSSF + SHIF deductions; Section 37 alerts at 20/25/30 days.
- **Two products v3:** Klokd (hospitality) + Klokd Health (healthcare, adds KMPDC verification). Same codebase pattern.

### Klokd is NOT
- Not an HR platform (Product A — deferred indefinitely)
- Not an algorithm-driven matching platform (manual at MVP per D-11)
- Not an EOR business at MVP (Year 2, pending legal opinion)
- Not pan-Africa (Year 4+)
- **NOT a regulated financial entity** — Kipkiren Pay holds the CBK relationship; Klokd never calls Daraja
- **NOT a designated Data Processor for identity documents** — Identiti is; Klokd never stores National IDs or biometrics

---

## 3. Canonical docs read order

**All paths relative to `C:\Projects\Klokd\` (this folder) unless otherwise noted.**

### Phase 0 — Klokd v3 specifics (READ FIRST, ~60 min)
1. **`chamia new docs/klokd_rails_integration_advisory.md`** — 🔴 v1.0 June 2026 CANONICAL. Sections 1 (cardinal rule), 2 (six rails per-rail), 3 (cross-rail sequence diagrams), 5 (architecture summary), 6 (sprint conflicts), 9 (10 AD-K decisions).
2. **`chamia new docs/klokd_sprint_backlog_delta_silvia_v1.1.md`** — 🔴 v1.1 June 2026 CANONICAL. 4 conflict stories (C1–C4) + 7 new stories (S3-NEW-01/02/03, S4-NEW-01, S5-NEW-01, S8-NEW-01, S9-NEW-01) + Part E (LipaStack transition) + Part F (env var checklist) + Part G (6 questions for Silvia).

### Phase 1 — Klokd v1 historical context (~30 min)
3. `klokd_reboot_pack_v1.md` (32 KB) — March 2026 reboot pack. **Historical** for rail decisions (superseded by June advisory) BUT still authoritative for: §1 product identity · §2 brand + design system · §3 architecture three-layer model · §10 key UX decisions · §11 decisions register (D-01..D-18).
4. `klokd_mvp_spec.md` (57 KB) — March 2026 full spec. Still authoritative for product flows + screens + compliance gates (WIBA, minimum wage, Section 37).
5. `klokd_sprint_backlog.html` (71 KB) — v4 sprint backlog (March). Apply the delta from `chamia new docs/`.
6. `klokd_brand_guide.tsx` (54 KB) — brand guide (still valid).
7. `klokd_worker_onboarding.html` + `klokd_employer_onboarding.html` + `klokd_worker_employer_mockups.html` — onboarding mockups (still valid, port verbatim per match-canonical-UI rule).

### Phase 2 — Platform-wide canonical (~30 min)
8. `C:\Projects\Platform Rails-instruction pack v1-reboot pack v1.2\may23rd\Platform Rails Integration and reboot\Platform_Rails_Reboot_Pack_v1_3.md` — six-rail thesis.
9. `C:\Projects\Platform Rails-instruction pack v1-reboot pack v1.2\may23rd\Platform Rails Integration and reboot\App_Integration_Guide_v1_1.md` — App Integration Guide v1.1.
10. Master `C:\Projects\Platform Rails-instruction pack v1-reboot pack v1.2\RECAP.md` — current cross-rail state (synced 6 Jun).

### Phase 3 — Closest code analogues
11. **`C:\Projects\lunch drop\`** — closest analogue (brownfield Express + Supabase app being rail-migrated). Especially `INSTRUCTION_PACK.md` + `OPERATOR_REQUEST_*.md` + `apps/api/src/rails/_shared/env.ts` (per-rail HMAC client pattern).
12. `C:\Projects\identiti\docs\INTEGRATOR_HANDOVER_LUNCHDROP.md` — per-request HMAC pattern; sandbox OTP echo; phone-token producer flow.
13. `C:\Projects\kipkiren_web_services\kws\` — Express stack, KP + Todoku consumer, two-tier env pattern.

---

## 4. Cross-rail integration — the v1 → v3 delta

Source: `chamia new docs/klokd_sprint_backlog_delta_silvia_v1.1.md`.

### 4 sprint conflicts (existing stories — REVISED)

| Conflict | Story | What changes |
|---|---|---|
| **C1** | S3-02 (Authentication) | OTP via **Todoku**, NOT Africa's Talking · `account_uuid` as primary FK on workers/employers · phone tokens 15-min freshness · 5→8 pts |
| **C2** | S3-03 (Identity Service) | All identity docs to **Identiti**, NOT Klokd S3. Klokd holds `kyc_tier` signal cached locally. Delete all Klokd-side KYC upload/encryption code. Klokd S3 retained for **pay statements + contracts only** (legitimate Klokd-owned docs) |
| **C3** | S6-04 (Notifications) | FCM stays direct (Todoku doesn't handle push). WhatsApp fallback re-routed through **Todoku** (phone_token + template_id). WA Business API credentials removed from environment |
| **C4** | S16-01 (Payment Service) | **Most significant.** Daraja credentials REMOVED. Implement as **`PaymentRailClient`** (rail-agnostic, env-driven base URL, typed DTOs). Maps to Kipkiren Pay sandbox now, LipaStack at Phase 3. Step-up JWT via Identiti for high-value payouts |

S16-02 (Escrow STK Push) and S16-03 (Deduction-adjusted disbursement) need minor revisions — same conceptual flow, implementation shifts from direct Daraja to Kipkiren Pay escrow API.

### 7 new stories (must be ADDED to backlog)

| Story ID | Sprint | Description | Pts |
|---|---|---|---|
| S3-NEW-01 | 3 | **Identiti SDK integration** — `IdentityService` class · methods: `createAccount`, `lookupAccount`, `submitKycDocuments`, `getKycTier`, `issuePhoneToken`, `initiateStepUp` · KYC_TIER_CHANGED webhook handler | 3 |
| S3-NEW-02 | 3 | **Todoku client integration** — `CommsService` class · methods: `sendOtp`, `sendNotification`, `sendWhatsApp` · MESSAGE_DELIVERED/FAILED webhook handler · `notification_log` table with NO phone-number column | 3 |
| S3-NEW-03 | 3 | **`PaymentRailClient` integration** (rail-agnostic) — env-driven base URL · typed DTOs · methods: `createWallet`, `getBalance`, `getLimits`, `fundEscrow`, `initiatePayout`, `releaseEscrow` · ESCROW_FUNDED/PAYOUT_COMPLETED/FAILED webhooks | 3 |
| S4-NEW-01 | 4 | **KP wallet creation on onboarding** — POST to payment-rail `/wallets` on KYC tier ≥1 confirmed (worker) and WIBA confirmed (employer) | 2 |
| S5-NEW-01 | 5 | **Hakken shift entity registration** — POST/PATCH `/hakken/entities/shifts` on post/fill/expire. Non-blocking (fall through if Hakken down) | 3 |
| S8-NEW-01 | 8 | **Hakken worker entity registration** — POST/PATCH `/hakken/entities/workers` on KYC tier ≥1 confirmed. Phase 3 onwards: `GET /shifts/:id/applicants` backed by Hakken ranking | 3 |
| S9-NEW-01 | 9 | **Todoku template registration** — submit 6 core templates (+ 2 Health) to Todoku. WhatsApp templates submitted to Meta for approval (24–72h) | 2 |
| **Total** | — | **+19 pts across 23 sprints. Sprint 3 carries the biggest addition (+9 pts) — foundational rail-client setup.** | |

---

## 5. Stack lock — Klokd-specific (NOT the rail stack lock)

Klokd is an **APP, not a rail**. Stack flexibility allowed; do NOT rewrite working code to match rail stack-lock. Existing Klokd stack stays through v3:

| Layer | Klokd choice | Notes |
|---|---|---|
| Backend runtime | Node.js 20+ | NOT Node 22 (rails) — keep current |
| Backend framework | Express 5 + TypeScript | NOT Fastify — keep current |
| Validation | Zod | NOT AJV — keep current |
| ORM | Prisma | NOT Drizzle — keep current (existing migration `20260401193045_init` applied) |
| Database | Supabase Postgres (eu-west-1 per `klokd_sprint_backlog_delta` Part F) | Migrate from SQLite → Supabase Postgres per `octopus-api/DEPLOY.md` plan |
| Auth | Supabase Auth (existing) → **Identiti** at Sprint 3 per C1 | Internal JWT issued by Klokd after Identiti account active |
| KYC storage | Internal S3 (current) → **Identiti** at Sprint 3 per C2 | Klokd S3 retained for pay statements + contracts ONLY |
| Payments | Direct Daraja (current) → **`PaymentRailClient`** at Sprint 16 per C4 | Phase 1: Kipkiren Pay sandbox · Phase 3: LipaStack · env-var driven |
| SMS | Africa's Talking (current) → **Todoku** at Sprint 3 per C1 (OTP) + Sprint 6 per C3 (notifications) | Phone tokens 15-min freshness; no phone numbers in Klokd DB |
| Push | Firebase FCM | UNCHANGED — direct integration, Todoku doesn't handle push |
| Storage | Supabase Storage bucket `klokd-documents` | UNCHANGED for pay statements + contracts; KYC moves to Identiti |
| Mobile | Expo SDK + React Native | UNCHANGED — both `worker-app` and `employer-app` |
| Deploy | Railway (API) + EAS Build (mobile) | UNCHANGED |

**Region note:** `klokd_reboot_pack_v1.md` §3 says "AWS af-south-1 (Cape Town) — Kenyan data residency requirement". The June delta Part F says Supabase in eu-west-1. There's a tension here — reboot pack predates Reboot Pack v1.3 §13.4 which codified eu-west-1 as platform standard. **Default to eu-west-1** unless Chamia decides otherwise; flag this for explicit decision before Sprint 3 begins.

---

## 6. Klokd-specific locked decisions

### From `klokd_rails_integration_advisory.md` §9 — 10 AD-K decisions (LOCKED)

| ID | Decision | Why |
|---|---|---|
| **AD-K01** | Klokd never calls Daraja directly — all payments via Kipkiren Pay | Cardinal rule; CBK regulatory boundary |
| **AD-K02** | Klokd never stores National ID documents or biometrics — all identity via Identiti | Cardinal rule; DPA 2019 data minimisation |
| **AD-K03** | Klokd never calls Africa's Talking or WhatsApp Business API directly — all comms via Todoku | Cardinal rule; SIMjacker/telecom-signalling protection inherited |
| **AD-K04** | Pay statements + contracts stay in Klokd S3 — NOT in Identiti | Legitimate Klokd-owned financial/employment records; 7-year retention under Employment Act |
| **AD-K05** | FCM push remains direct Klokd integration — Todoku is fallback, not primary | Todoku doesn't handle mobile push |
| **AD-K06** | **Payment rail base URLs from environment variables only — NEVER hardcoded** | LipaStack migration must be config change, not code change |
| **AD-K07** | **Typed DTOs on all payment rail response boundaries** | LipaStack migration localised to DTO layer if field names change |
| **AD-K08** | KMPDC verification is Klokd Health-owned compliance layer — NOT an Identiti function | KMPDC = professional licence; Identiti = national identity. Separate concerns |
| **AD-K09** | Hakken is backing data source for shift feed + worker ranking from Phase 3 (Sprint 8+) | Sprint 4 internal sort is temporary — design for swappable resolver |
| **AD-K10** | **`account_uuid` (from Identiti) is the primary foreign key on ALL Klokd worker/employer tables** | Enables portable reputation across Klokd Health / Klokd Agri / Klokd Home |

### From `klokd_reboot_pack_v1.md` §11 — D-01..D-18 (STILL LOCKED for product/UX/brand)

- **D-01..D-04** brand: Klokd · klokd.co.ke · @klokdKE (NEVER @klokKE) · K logomark
- **D-05** two-shell identity — Worker = ink dark `#0A0A0F` · Employer = mist light `#F4F6F3`. Never blur
- **D-06** primary CTA — Electric Mint `#00E5A0` → Volt Lime `#BCFF4E` gradient · text near-black, NEVER white
- **D-09** M-Pesa Native — firm-wide defining characteristic
- **D-10** Kirimon (now Kipkiren Teknolojia) NEVER appears in user-facing copy
- **D-11** Manual matching at MVP — no algorithm
- **D-12** Escrow STK Push on confirmation · auto-release at 4 hours
- **D-13** GPS geo_hash only · raw coordinates NEVER persisted
- **D-14** GPS clock-in radius 500m
- **D-15** Payment Service isolated from Shift Service (failed payment never corrupts a shift)
- **D-16** Compliance Engine as discrete Layer 1 service from Sprint 7
- **D-17** Statutory rates in config table — NEVER hardcoded
- **D-18** AHL toggle via config — currently OFF

---

## 7. Sprint plan — Klokd v3 (existing v4 backlog + delta)

**Sprint structure:** Klokd uses S1..S23 numbering from the existing v4 backlog (root `klokd_sprint_backlog.html`). The June delta adds revisions to S3, S4, S5, S6, S8, S9, S16 + Klokd Health phase H sprints.

| Sprint | Theme | Delta items |
|---|---|---|
| **S0** | (Already done) MVP foundation · monorepo + Prisma + Supabase + Railway + EAS Build + CI/CD · last commit 24 Apr 2026 | — |
| **S1–S2** | Pre-rail (already done — schema, auth scaffold, mobile shells) | — |
| **S3** | **🔴 BIGGEST DELTA.** Authentication + Identity foundation. C1 (S3-02 revised — OTP via Todoku) + C2 (S3-03 revised — KYC via Identiti) + S3-NEW-01 (Identiti SDK) + S3-NEW-02 (Todoku client) + S3-NEW-03 (PaymentRailClient). **+9 pts** | 5 stories changed/added |
| **S4** | Worker/employer onboarding flows. S4-NEW-01 (KP wallet creation). **+2 pts** | 1 new story |
| **S5** | Shift posting + matching. S5-NEW-01 (Hakken shift entity registration — non-blocking). **+3 pts** | 1 new story |
| **S6** | Notifications + GPS + clock-in. C3 (S6-04 revised — WhatsApp via Todoku, FCM unchanged). **0 net pts** | 1 story changed |
| **S7** | Compliance Engine (Layer 1 service per D-16) — PAYE, NSSF, SHIF, AHL toggle, minimum wage gate, Section 37 monitoring | (no rail delta — pure Klokd) |
| **S8** | Worker app MVP. S8-NEW-01 (Hakken worker entity registration). **+3 pts** | 1 new story |
| **S9** | Notifications hardening. S9-NEW-01 (Todoku template registration — 6 core + 2 Health). **+2 pts** | 1 new story |
| **S10–S15** | Employer app + shift state machine + dispute flow + ratings + admin console | (no rail delta) |
| **S16** | Payment Service production. C4 (S16-01 revised — `PaymentRailClient` not Daraja) + S16-02 minor (Kipkiren Pay escrow API) + S16-03 minor (deduction calc stays in Klokd Compliance Engine). **0 net pts** | 2–3 stories changed |
| **S17–S22** | Pilot ops + WIBA + ODPC + Privacy Policy + load test + KRA/PAYE/NSSF/SHIF registrations | (no rail delta — external regulator work) |
| **S23** | Beta launch — 50 employers + 200 workers Nairobi hospitality | — |
| **Klokd Health** phase H | KMPDC verification compliance layer + 2 Health Todoku templates + healthcare worker onboarding. H1 (project setup) · H3 (KMPDC + Todoku Health templates) | (separate roadmap, same codebase pattern) |

**Realistic 3-day target if continuous push:** complete Sprint 3 rail-client foundations (S3-NEW-01 + S3-NEW-02 + S3-NEW-03 + C1 revision of S3-02 + C2 revision of S3-03). That's the highest-leverage move — Sprint 3 is the foundational rail-client setup sprint; if not done correctly, the integration debt compounds into every subsequent sprint.

---

## 8. Hard rules — NON-negotiable

1. **Cardinal Rule (3 non-negotiables):**
   - Klokd never holds M-Pesa transaction credentials or runs a Daraja integration
   - Klokd never stores National ID images, biometric vectors, or KMPDC documents in own infrastructure
   - Klokd never calls Africa's Talking, WhatsApp Business API, or any SMS/messaging provider directly
2. **KES minor units only** on every monetary field — never floats
3. **No raw MSISDNs in Klokd DB / logs / queues / S3** after Sprint 3 — phone tokens via Identiti (15-min freshness, never cached beyond)
4. **No National ID images / biometrics in Klokd S3** after Sprint 3 — Identiti owns these
5. **No Daraja credentials in Klokd environment** after Sprint 16 — Kipkiren Pay holds the Daraja relationship
6. **`PaymentRailClient` naming** — NOT `KipkirenPayClient`. Env vars `PAYMENT_RAIL_*` — NOT `KIPKIREN_PAY_*`. Per AD-K06
7. **Env-var-driven base URLs** — NO hardcoded payment rail URLs anywhere in codebase
8. **Typed DTOs at the payment rail boundary** — all response field mappings in one file (`payment-rail.dto.ts`)
9. **`account_uuid` from Identiti is the primary FK on every worker/employer table** — NOT Klokd's own UUID
10. **Phone tokens NEVER cached beyond 15-minute freshness window** — request a fresh token per Todoku call
11. **No emojis** unless explicitly requested
12. **Code as files only** — never chat code blocks
13. **No `Co-Authored-By: Claude` commit trailer** · no "Generated with Claude Code" footer
14. **Confirm scope before destructive changes** (drop tables, rename schemas, remove migrations)
15. **English + Swahili bilingual** per `klokd_reboot_pack_v1.md` §10 — every UI text + every Todoku template

---

## 9. Pre-flight checklist — 9 open items (mostly Silvia's queue)

From `chamia new docs/klokd_sprint_backlog_delta_silvia_v1.1.md` Part G + advisory §8:

| # | Item | Owner | Deadline | Blocks |
|---|---|---|---|---|
| **OI-01** | Identiti API sandbox access for Klokd dev environment | Silvia | Before Sprint 3 | S3-NEW-01 |
| **OI-02** | Kipkiren Pay API sandbox access for Klokd dev environment | Silvia | Before Sprint 3 | S3-NEW-03 |
| **OI-03** | Todoku sandbox access + Klokd tenant registration | Silvia | Before Sprint 3 | S3-NEW-02 |
| **OI-04** | Klokd registered as **external billed tenant** in Todoku · rate agreed | Chamia + Silvia | Before Sprint 3 | All Todoku integration |
| **OI-05** | Hakken shift + worker entity schemas confirmed | Silvia | Before Sprint 5 | S5-NEW-01 |
| **OI-06** | Kipkiren Pay production access timeline | Chamia | Before Sprint 16 | S16 (revised) |
| **OI-07** | LipaStack designation date communicated to Klokd integration team | Silvia | When known | DTO design in S16 |
| **OI-08** | Todoku WhatsApp template submission timeline for Klokd's 6 core templates | Silvia | Before Sprint 9 | S9-NEW-01 |
| **OI-09** | Klokd Health Todoku template submission (2 KMPDC expiry templates) | Silvia | Before Klokd Health Sprint H3 | Klokd Health beta |

**Plus 1 wallet-topology question for Silvia (delta Part G #6):** when LipaStack is designated as the payment rail at Phase 3, does it ABSORB Kipkiren Pay's wallet/trust pool function, or does a Kipkiren Pay wallet service SURVIVE alongside LipaStack? Determines whether `GET /wallets/:uuid/balance` in Phase 3 is a LipaStack call or a surviving Kipkiren Pay call. The `PaymentRailClient` interface needs the answer before Sprint 3.

**Plus 1 Chamia decision** — entity restructure: "Klokd Workplace Solutions Ltd" formalised in writing per advisory authorship line. Confirm date of incorporation + relationship to Kipkiren Teknolojia umbrella before Sprint 16 (Kipkiren Pay corporate `account_uuid` setup needs the legal entity).

**Plus 1 region decision** — `klokd_reboot_pack_v1.md` §3 says AWS af-south-1; delta Part F says Supabase eu-west-1. Reboot Pack v1.3 §13.4 codified eu-west-1 as platform standard. Default to eu-west-1 unless Chamia overrides.

---

## 10. First-steps checklist — once the new Claude session starts

1. Read this entire pack (you're doing it now).
2. Read [`STARTUP_PROMPT.md`](./STARTUP_PROMPT.md) for the tight session-start brief.
3. Read both Chamia June docs end-to-end:
   - `chamia new docs/klokd_rails_integration_advisory.md`
   - `chamia new docs/klokd_sprint_backlog_delta_silvia_v1.1.md`
4. Read v1 historical context: `klokd_reboot_pack_v1.md` (§1, §2, §3, §10, §11) + `klokd_mvp_spec.md` (skim) + `klokd_sprint_backlog.html` (open in browser).
5. Read the existing codebase:
   - `octopus-api/src/modules/` (10 modules: admin · auth · compliance · dispute · identity · notification · payment · rating · shift · storage)
   - `octopus-api/prisma/schema.prisma`
   - `worker-app/src/screens/{main,onboarding,shift}/`
   - `employer-app/src/screens/{main,onboarding,shift}/`
   - `octopus-api/DEPLOY.md`
6. Check Silvia's queue with Chamia — have OI-01/02/03/04 landed? Branches the work plan:
   - **All four landed** → wire S3-NEW-01 + S3-NEW-02 + S3-NEW-03 (Identiti + Todoku + PaymentRailClient clients) immediately
   - **Pending** → do offline-stub work: scaffold the 3 client classes against mocks, scaffold the DTO layer, design migration plan for KYC docs to Identiti
7. Update [`RECAP.md`](./RECAP.md) at every sprint boundary.
8. Mirror the Lunch Drop pattern at `C:\Projects\lunch drop\` — same brownfield situation, same rail-migration pattern, same per-request HMAC client design (commit `b8b3279` reference).
9. Coordinate with Hakken side — the advisory says Klokd Hakken integration is Phase 3 (Sprint 8+), but Hakken HK-8 PARTIAL is **blocked on OD-9 Klokd dev resource**. Reconcile timing with Silvia before Sprint 5 begins.

---

## 11. Hard blockers — outside session authority

- **OI-01..OI-09** — Silvia's queue (9 items). Without OI-01/02/03/04, Sprint 3 cannot land code against live rails.
- **Chamia entity-restructure formalisation** — "Klokd Workplace Solutions Ltd" formalised in writing. Sprint 16 (KP corporate `account_uuid`) needs legal entity confirmed.
- **Region decision** — af-south-1 (reboot pack) vs eu-west-1 (delta + platform standard). Default eu-west-1; confirm with Chamia.
- **LipaStack designation date** (OI-07) — affects PaymentRailClient interface design at Sprint 3.
- **Wallet topology at Phase 3** (delta Part G #6) — LipaStack absorbs KP wallet or survives alongside? Needs answer before Sprint 3.
- **Hakken timing reconciliation** — advisory says Klokd Hakken at Phase 3 / Sprint 8+; Hakken side says OD-9 Klokd dev blocks HK-8 finish. Either (a) HK-8 closes without Klokd-side wiring + Klokd lands Hakken later per its own Sprint 5+8, or (b) Klokd accelerates Hakken work to unblock HK-8. Silvia decides.

---

## 12. Reference index

**Chamia June 2026 canonical (READ FIRST):**
- [`chamia new docs/klokd_rails_integration_advisory.md`](./chamia%20new%20docs/klokd_rails_integration_advisory.md) (38 KB · v1.0 · authority for rail integration)
- [`chamia new docs/klokd_sprint_backlog_delta_silvia_v1.1.md`](./chamia%20new%20docs/klokd_sprint_backlog_delta_silvia_v1.1.md) (24 KB · v1.1 · engineering delta)

**Klokd v1 historical (root):**
- [`klokd_reboot_pack_v1.md`](./klokd_reboot_pack_v1.md) (32 KB · March 2026 · still authoritative for §1 product, §2 brand, §3 architecture, §10 UX, §11 D-01..D-18)
- [`klokd_mvp_spec.md`](./klokd_mvp_spec.md) (57 KB · March 2026 · product flows + compliance gates)
- [`klokd_sprint_backlog.html`](./klokd_sprint_backlog.html) (71 KB · v4 backlog · apply the June delta)
- [`klokd_brand_guide.tsx`](./klokd_brand_guide.tsx) (54 KB · brand)
- [`klokd_worker_onboarding.html`](./klokd_worker_onboarding.html) + [`klokd_employer_onboarding.html`](./klokd_employer_onboarding.html) + [`klokd_worker_employer_mockups.html`](./klokd_worker_employer_mockups.html) — match-canonical-UI sources

**Existing code:**
- [`octopus-api/`](./octopus-api/) — Express 5 + TypeScript + Prisma + Supabase + Railway
- [`octopus-api/DEPLOY.md`](./octopus-api/DEPLOY.md) — deployment guide (replace DARAJA_* + AT_* envs per AD-K01/AD-K03)
- [`worker-app/`](./worker-app/) — Expo · ink shell
- [`employer-app/`](./employer-app/) — Expo · mist shell
- [`claude-design/`](./claude-design/) — 4 prototype HTMLs + design iterations

**Operator-actionable asks for Silvia:**
- [`OPERATOR_REQUEST_IDENTITI.md`](./OPERATOR_REQUEST_IDENTITI.md) — provision `klokd_sandbox` app on Identiti
- [`OPERATOR_REQUEST_KP.md`](./OPERATOR_REQUEST_KP.md) — provision `klokd_sandbox` payment-rail app on Kipkiren Pay (with LipaStack transition framing)
- [`OPERATOR_REQUEST_TODOKU.md`](./OPERATOR_REQUEST_TODOKU.md) — provision `klokd` external-billed tenant + 8 templates
- [`OPERATOR_REQUEST_HAKKEN.md`](./OPERATOR_REQUEST_HAKKEN.md) — confirm shift + worker entity schemas

**Platform-wide canonical:**
- `C:\Projects\Platform Rails-instruction pack v1-reboot pack v1.2\may23rd\Platform Rails Integration and reboot\Platform_Rails_Reboot_Pack_v1_3.md` — six-rail thesis
- `C:\Projects\Platform Rails-instruction pack v1-reboot pack v1.2\may23rd\Platform Rails Integration and reboot\App_Integration_Guide_v1_1.md` — App Integration Guide v1.1
- `C:\Projects\Platform Rails-instruction pack v1-reboot pack v1.2\RECAP.md` — master tracker (synced 6 Jun)

**Closest code analogues:**
- `C:\Projects\lunch drop\` — same brownfield rail-migration pattern (Express + Supabase, mid-rebrand). **THIS IS YOUR CLOSEST ANALOGUE.**
- `C:\Projects\identiti\docs\INTEGRATOR_HANDOVER_LUNCHDROP.md` — per-request HMAC spec
- `C:\Projects\kipkiren_web_services\kws\` — secondary analogue (Express stack, KP + Todoku consumer)

---

*Klokd v3 · v1 → v3 Rail-Alignment Instruction Pack v1.0 · 9 June 2026 · Confidential · Authored for Chamia Mutuku, Klokd Workplace Solutions Ltd · supersedes nothing (initial issue) · rooted in `chamia new docs/` June 2026 advisory + delta.*
