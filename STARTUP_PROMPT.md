# Klokd v3 — Session Startup Prompt

**Purpose:** Copy-pasteable bootstrap brief for a fresh Claude Code session opening this folder.

**Why a separate file from `INSTRUCTION_PACK.md`?** INSTRUCTION_PACK is the deep reference (~600 lines covering full v1→v3 migration plan rooted in Chamia's June advisory). STARTUP_PROMPT is the tight bootstrap (~180 lines) that gets pasted at session-start. Both stay in sync; STARTUP_PROMPT is the "smaller, denser" form.

**Authored:** 9 June 2026.

---

```
You are working on Klokd v3 — Klokd Workplace Solutions Ltd's two-sided
M-Pesa-native casual labour marketplace (formerly under KMV parent; now
a Kipkiren Teknolojia subsidiary per the June 2026 advisory). NOT a rail.
It is a KMV portfolio APP that consumes the rails. Brownfield migration —
the v1 codebase exists, is deployed, and is being retrofitted to consume
the KMV rails. DO NOT REWRITE the existing app.

==========================================================================
ROLE & CONSTRAINTS
==========================================================================
- You are a build engineer for Klokd Workplace Solutions Ltd. Chamia
  Mutuku is CEO. Silvia Mumbua (CTO of Kipkiren Teknolojia) is the rails
  owner and operator interface.
- 3-day budget. Realistic target this window: scaffold Sprint 3 rail
  clients (S3-NEW-01 Identiti SDK + S3-NEW-02 Todoku client + S3-NEW-03
  PaymentRailClient) AGAINST STUBS while OI-01/02/03/04 land at Silvia.
  When creds arrive, env-flip activates them at boot.
- Code as files only, never chat blocks. KES minor units only on every
  monetary field. No Co-Authored-By: Claude commit trailer. Confirm scope
  before significant changes (destructive ops, schema drops, deletions).
- This is a TRADING-NAME REBRAND-FREE, RAIL-CONSUMPTION MIGRATION on top
  of a feature-complete v1 codebase. DO NOT REWRITE. The Express + Prisma
  + Supabase app works in production. Last commit 24 Apr 2026.
- No emojis. Bilingual EN + SW for user-facing copy + Todoku templates.

==========================================================================
WHERE TO START (literally — first 3 actions)
==========================================================================
1. Read INSTRUCTION_PACK.md in this folder end-to-end (~30 min, 12 sections).
   It is the canonical v1→v3 migration brief and supersedes anything in
   this prompt that conflicts.
2. Read both Chamia June canonical docs:
   - chamia new docs/klokd_rails_integration_advisory.md (v1.0)
   - chamia new docs/klokd_sprint_backlog_delta_silvia_v1.1.md (v1.1)
   These are AUTHORITATIVE for Klokd v3 rail integration. The reboot pack
   v1.0 (March) and sprint backlog v4 (March) at root are pre-rail-era
   historical for rail decisions but still authoritative for product +
   brand + UX + compliance gates.
3. Verify operator status with Chamia: have OI-01/02/03/04 landed?
   IF YES → wire S3-NEW-01 + S3-NEW-02 + S3-NEW-03 immediately
   IF NO  → scaffold against stubs + design DTO layer + plan KYC
            migration off Klokd S3.

==========================================================================
WHAT YOU INHERIT (existing codebase — DO NOT REWRITE)
==========================================================================
Stack on disk: Express 5 + TypeScript + Prisma + Supabase + Sentry +
Railway-deployed.

  C:\Projects\Klokd\
    octopus-api/        Express + Prisma + Supabase + Railway-deployed
                        10 modules: admin · auth · compliance · dispute ·
                        identity · notification · payment · rating ·
                        shift · storage
      DEPLOY.md         Deployment guide (has DARAJA_* + AT_* env vars —
                        these get REMOVED per AD-K01 + AD-K03)
      prisma/           schema.prisma + 1 migration (20260401193045_init)
      src/              app.ts · server.ts · start.ts · 10 modules
      tests/            jest.config.js
    worker-app/         Expo SDK · RN · ink dark shell #0A0A0F
                        3 screen groups: main · onboarding · shift
    employer-app/       Expo SDK · RN · mist light shell #F4F6F3
                        3 screen groups: main · onboarding · shift
    claude-design/      4 prototype HTMLs · 3 zips · 6 design screenshots
                        + design-canvas.jsx

What's in the root that's still relevant:
    chamia new docs/    🔴 June 2026 CANONICAL — read first
    klokd_reboot_pack_v1.md       March · historical for rail decisions
                                  · still authoritative for product/brand/UX
    klokd_mvp_spec.md             March · product flows + compliance gates
    klokd_sprint_backlog.html     v4 backlog · apply June delta
    klokd_brand_guide.tsx         brand
    klokd_worker_onboarding.html  match-canonical-UI source
    klokd_employer_onboarding.html match-canonical-UI source
    klokd_worker_employer_mockups.html match-canonical-UI source

Last commit: 52b9a26 "Port Claude Design 1:1 to both apps" · 24 Apr 2026

==========================================================================
WHAT'S PENDING OPERATOR — 9 OIs at Silvia (mostly)
==========================================================================
1. OI-01 ⏳ Identiti `klokd_sandbox` HMAC + URL — see OPERATOR_REQUEST_IDENTITI.md
2. OI-02 ⏳ Kipkiren Pay `klokd_sandbox` app + corp UUID + step-up policy —
   see OPERATOR_REQUEST_KP.md (PaymentRailClient framing, NOT KipkirenPayClient)
3. OI-03 ⏳ Todoku sandbox access + `klokd` external-billed tenant —
   see OPERATOR_REQUEST_TODOKU.md
4. OI-04 ⏳ Klokd registered as EXTERNAL BILLED tenant (not bypass-billing)
   in Todoku · rate agreed — Chamia + Silvia
5. OI-05 ⏳ Hakken shift + worker entity schemas — see OPERATOR_REQUEST_HAKKEN.md
6. OI-06 ⏳ Kipkiren Pay production access timeline (CBK gate)
7. OI-07 ⏳ LipaStack designation date (affects PaymentRailClient interface)
8. OI-08 ⏳ Todoku WhatsApp template approval timeline (Meta 24–72h after
   submission)
9. OI-09 ⏳ Klokd Health 2 KMPDC expiry templates submission

Plus 3 Chamia decisions:
- CHAMIA-WALLET: at LipaStack Phase 3, does LipaStack absorb KP wallet or
  does KP wallet survive alongside? PaymentRailClient interface needs answer
  before Sprint 3.
- CHAMIA-ENTITY: "Klokd Workplace Solutions Ltd" formalisation date.
  Needed before Sprint 16 (KP corporate account_uuid).
- CHAMIA-REGION: af-south-1 (reboot pack §3) vs eu-west-1 (delta Part F +
  platform standard). Default eu-west-1 unless Chamia overrides.

==========================================================================
READ ORDER (~90 min before first commit)
==========================================================================
Phase 0 — Klokd v3 CANONICAL (read first):
  1. chamia new docs/klokd_rails_integration_advisory.md (v1.0 June 2026)
     — Section 1 (cardinal rule applied) · §2 (six rails per-rail) ·
       §3 (cross-rail sequence diagrams) · §5 (architecture summary) ·
       §6 (sprint conflicts) · §9 (10 AD-K decisions)
  2. chamia new docs/klokd_sprint_backlog_delta_silvia_v1.1.md (v1.1 June 2026)
     — 4 conflict stories (C1–C4) · 7 new stories (S3-NEW-01/02/03,
       S4-NEW-01, S5-NEW-01, S8-NEW-01, S9-NEW-01) · Part E LipaStack
       transition · Part F env var checklist · Part G 6 questions for Silvia

Phase 1 — Klokd v1 historical (in this folder root):
  3. klokd_reboot_pack_v1.md — §1 product, §2 brand, §3 architecture,
     §10 UX decisions, §11 D-01..D-18 (all still locked)
  4. klokd_mvp_spec.md — product flows + compliance gates (skim)
  5. klokd_sprint_backlog.html — v4 backlog (open in browser; apply delta)
  6. klokd_brand_guide.tsx — brand
  7. klokd_worker_onboarding.html + klokd_employer_onboarding.html — UI

Phase 2 — existing code (in this folder):
  8. octopus-api/src/modules/ — 10 module structure
  9. octopus-api/prisma/schema.prisma
  10. octopus-api/DEPLOY.md — current env var set (note DARAJA + AT will be REMOVED)
  11. worker-app/src/screens/ · employer-app/src/screens/

Phase 3 — closest analogues for code patterns:
  12. C:\Projects\lunch drop\ — closest analogue (brownfield Express +
      Supabase app being rail-migrated). Read INSTRUCTION_PACK.md +
      OPERATOR_REQUEST_*.md + apps/api/src/rails/_shared/env.ts
  13. C:\Projects\identiti\docs\INTEGRATOR_HANDOVER_LUNCHDROP.md
      — per-request HMAC pattern · sandbox OTP echo · phone-token producer
  14. C:\Projects\kipkiren_web_services\kws\ — Express stack analogue

==========================================================================
LOCKED DECISIONS (don't relitigate)
==========================================================================
Stack — Klokd is an APP, NOT a rail. Existing Express + Prisma + Supabase
stays through v3. NO Fastify rewrite. NO Drizzle rewrite. NO Node 22
rewrite. App stack flexibility is allowed.

10 AD-K decisions from advisory §9 (NON-negotiable):
  AD-K01: NEVER Daraja direct (Kipkiren Pay only)
  AD-K02: NEVER National ID/biometrics in Klokd (Identiti only)
  AD-K03: NEVER AT/WA direct (Todoku only)
  AD-K04: Pay statements + contracts in Klokd S3 (legitimate)
  AD-K05: FCM stays direct (Todoku doesn't handle push)
  AD-K06: Payment rail URLs from env vars only — NEVER hardcoded
  AD-K07: Typed DTOs on all payment rail boundaries
  AD-K08: KMPDC verification is Klokd Health-owned, NOT Identiti
  AD-K09: Hakken backs shift feed + worker ranking from Phase 3 (S8+)
  AD-K10: account_uuid (Identiti) = primary FK on every worker/employer table

Payment client naming — PaymentRailClient, NOT KipkirenPayClient.
Env vars — PAYMENT_RAIL_*, NOT KIPKIREN_PAY_*.
Reason: LipaStack Phase 3 transition. Per AD-K06 + advisory Part E.

Brand locks (from reboot pack §2, still authoritative):
  - Two-shell identity: Worker = ink dark #0A0A0F · Employer = mist light
    #F4F6F3 · never blur
  - Primary CTA: Electric Mint #00E5A0 → Volt Lime #BCFF4E gradient
  - Text on gradient CTA: near-black, NEVER white
  - Typeface: Inter throughout · CTAs: Inter Black 900

Product locks (from reboot pack §11 D-XX, still authoritative):
  D-09 M-Pesa Native (firm-wide defining trait)
  D-11 Manual matching at MVP (no algorithm)
  D-12 Escrow STK Push + 4hr auto-release
  D-13 GPS geo_hash only — raw coords NEVER persisted
  D-14 GPS clock-in radius 500m
  D-15 Payment Service isolated from Shift Service
  D-16 Compliance Engine as discrete Layer 1 service from Sprint 7
  D-17 Statutory rates in config table — NEVER hardcoded
  D-18 AHL toggle via config — currently OFF

==========================================================================
SPRINT PLAN (authoritative: chamia new docs/ delta v1.1)
==========================================================================
S0–S2  ✅ DONE (April 2026) — MVP foundation + schema + auth scaffold +
       mobile shells
S3     ⚪ NOT STARTED — 🔴 BIGGEST RAIL DELTA. C1+C2 revisions +
       S3-NEW-01/02/03. Blocked on OI-01/02/03/04.
S4     ⚪ NOT STARTED. S4-NEW-01 KP wallet creation.
S5     ⚪ NOT STARTED. S5-NEW-01 Hakken shift entity registration.
       Blocked on OI-05.
S6     ⚪ NOT STARTED. C3 revision (S6-04 — WhatsApp via Todoku, FCM
       unchanged).
S7     ⚪ NOT STARTED. Compliance Engine Layer 1 service per D-16.
S8     ⚪ NOT STARTED. S8-NEW-01 Hakken worker entity registration.
S9     ⚪ NOT STARTED. S9-NEW-01 Todoku template registration.
S10–S15 ⚪ NOT STARTED. Employer app + state machine + dispute + ratings +
       admin.
S16    ⚪ NOT STARTED. 🔴 PAYMENT SERVICE production. C4 revision
       (PaymentRailClient not Daraja).
S17–S22 ⚪ NOT STARTED. Pilot ops + regulator gates (WIBA, ODPC,
       Privacy Policy, KRA/PAYE/NSSF/SHIF).
S23    ⚪ NOT STARTED. Beta launch.

Klokd Health phase H sprints — separate roadmap, same codebase pattern,
adds KMPDC verification + 2 Health templates.

Total delta: +19 pts across 23 sprints. Sprint 3 is the biggest (+9 pts).

==========================================================================
HARD RULES (non-negotiable)
==========================================================================
1. Code as files only — never chat code blocks.
2. KES minor units only.
3. NO raw MSISDNs in Klokd DB/logs/queues/S3 after Sprint 3 — phone tokens
   via Identiti only, 15-min freshness, NEVER cached beyond.
4. NO National ID images / biometrics in Klokd S3 after Sprint 3 — Identiti
   owns these.
5. NO Daraja credentials in Klokd environment after Sprint 16 — Kipkiren Pay
   holds the Daraja relationship.
6. PaymentRailClient naming (NOT KipkirenPayClient). Env vars PAYMENT_RAIL_*
   (NOT KIPKIREN_PAY_*). Per AD-K06.
7. Env-var-driven base URLs — NO hardcoded payment rail URLs anywhere.
8. Typed DTOs at the payment rail boundary — all field mappings in one
   payment-rail.dto.ts file.
9. account_uuid from Identiti = primary FK on every worker/employer table.
10. No Co-Authored-By: Claude commit trailers.
11. English + Swahili bilingual on all user-facing text + Todoku templates.
12. No emojis (unless explicitly requested).
13. Confirm scope before destructive ops (drop columns, rename tables,
    remove migrations).

==========================================================================
STANDING BLOCKERS (outside session authority)
==========================================================================
- ⏳ Silvia: OI-01..OI-09 (4 of 9 are Sprint 3 blockers)
- ⏳ Chamia: wallet topology at Phase 3 (CHAMIA-WALLET)
- ⏳ Chamia: "Klokd Workplace Solutions Ltd" formalisation (CHAMIA-ENTITY)
- ⏳ Chamia: af-south-1 vs eu-west-1 region (CHAMIA-REGION) — default eu-west-1
- ⏳ Hakken contradiction: HK-7 plugin shipped 3 Jun ✓; HK-8 PARTIAL
   blocked on "OD-9 Klokd dev resource" — but advisory says Klokd Hakken
   is Phase 3 (Sprint 8+). Reconcile with Silvia before Sprint 5.

==========================================================================
BEGIN.
==========================================================================
First action: read INSTRUCTION_PACK.md end-to-end. Then read both Chamia
June canonical docs in this folder's `chamia new docs/`. Then check
operator status with Chamia. Branch your work plan based on whether OI-01
+ OI-02 + OI-03 + OI-04 have landed at Silvia:

  ALL FOUR LANDED  → wire S3-NEW-01 + S3-NEW-02 + S3-NEW-03 against live
                     rail sandboxes. Then revise S3-02 (C1) and S3-03 (C2).
  PENDING          → scaffold the 3 client classes against mocks · design
                     the payment-rail.dto.ts boundary layer · plan the
                     KYC docs migration off Klokd S3 to Identiti · audit
                     the existing octopus-api/src/modules/identity for
                     code to delete vs code to refactor.

Do not write any business logic until those reads complete AND you have
a clear picture of which sprint you're working on.
```

---

*Klokd v3 · Startup Prompt v1.0 · 9 June 2026 · Confidential · paste the fenced block above into a fresh Claude Code session opening `C:\Projects\Klokd\`.*
