# Klokd v3 — Casual Labour Marketplace (Rail-Aligned)

> Two-sided M-Pesa-native casual labour marketplace · hospitality beachhead (Nairobi) · Klokd Health sibling product.

**Status:** 🟡 v1 codebase shipped (Express + Prisma + Supabase + Direct Daraja/AT) · 🟠 v3 rail-alignment not yet started · 9 operator items at Silvia
**Entity:** Klokd Workplace Solutions Ltd (under Kipkiren Teknolojia umbrella per June 2026 advisory)
**Domain:** `klokd.co.ke` · handle `@klokdKE` (NEVER `@klokKE`)
**Logomark:** K · single letter, bold weight
**Brand CTA:** Electric Mint `#00E5A0` → Volt Lime `#BCFF4E` gradient, near-black text
**Two-shell identity:** Worker = ink dark `#0A0A0F` · Employer = mist light `#F4F6F3` (never blur)
**Regulator:** DPA 2019 · WIBA · Employment Act s.9 · NSSF · SHIF · PAYE

---

## Start here

**Read [`STARTUP_PROMPT.md`](./STARTUP_PROMPT.md) first** — copy-pasteable bootstrap brief for a fresh Claude Code session.

**Then read [`INSTRUCTION_PACK.md`](./INSTRUCTION_PACK.md)** — the deeper build brief (12 sections covering Chamia June advisory + delta · 4 sprint conflicts · 7 new stories · 10 AD-K decisions · 9 open operator items).

**Live sprint state lives in [`RECAP.md`](./RECAP.md)** — updated at every sprint boundary.

**Operator-actionable asks for Silvia (4):**
- [`OPERATOR_REQUEST_IDENTITI.md`](./OPERATOR_REQUEST_IDENTITI.md) — provision `klokd_sandbox` consuming-app on Identiti
- [`OPERATOR_REQUEST_KP.md`](./OPERATOR_REQUEST_KP.md) — provision Klokd payment-rail app on Kipkiren Pay (with LipaStack Phase 3 transition framing)
- [`OPERATOR_REQUEST_TODOKU.md`](./OPERATOR_REQUEST_TODOKU.md) — provision `klokd` external-billed tenant + 8 templates (6 core + 2 Health)
- [`OPERATOR_REQUEST_HAKKEN.md`](./OPERATOR_REQUEST_HAKKEN.md) — confirm shift + worker entity schemas (Phase 3, Sprint 5+)

---

## Canonical docs (in this folder)

```
chamia new docs/                                   ← June 2026 CANONICAL
  klokd_rails_integration_advisory.md              v1.0 · authority for rail integration
  klokd_sprint_backlog_delta_silvia_v1.1.md        v1.1 · engineering delta

klokd_reboot_pack_v1.md                            March 2026 · historical (rail decisions superseded; product/brand/UX still authoritative)
klokd_mvp_spec.md                                  March 2026 · product flows + compliance gates
klokd_sprint_backlog.html                          v4 backlog · apply June delta
klokd_brand_guide.tsx                              brand
klokd_worker_onboarding.html                       match-canonical-UI source
klokd_employer_onboarding.html                     match-canonical-UI source
klokd_worker_employer_mockups.html                 match-canonical-UI source
```

---

## Existing codebase

```
octopus-api/        Express 5 + TypeScript + Prisma + Supabase + Railway · 10 modules:
                    admin · auth · compliance · dispute · identity · notification ·
                    payment · rating · shift · storage
worker-app/         Expo SDK + React Native · ink dark shell · 3 screen groups:
                    main · onboarding · shift
employer-app/       Expo SDK + React Native · mist light shell · 3 screen groups:
                    main · onboarding · shift
claude-design/      4 prototype HTMLs + design iterations + 3 ZIPs + 6 design screenshots
```

**Last commit:** `52b9a26 Port Claude Design 1:1 to both apps (worker + employer)` · **24 April 2026** · 17 commits total

---

## Cross-rail joints (KMV platform rails)

| Rail | Klokd uses | Phase |
|---|---|---|
| **Identiti** | Account UUID · KYC docs storage · phone tokens · step-up · KYC tier signal | Sprint 3 onward |
| **Payment Rail** (KP → LipaStack Phase 3) | Wallet · escrow funding · 4hr auto-release · B2C payouts · 4% fee · KYC-tiered limits | Sprint 3 (client) + Sprint 16 (production) |
| **Todoku** | OTP delivery · 8 templates · SMS + WhatsApp · SIMjacker defence inherited | Sprint 3 onward |
| **Hakken** | Shift + worker entity registration · discovery backing | Sprint 5 (entity registration) · Sprint 8+ (discovery) |
| **Helpan AI** | DEFERRED — Phase 2 candidates only | Phase 2 |
| **Itafika** | NOT APPLICABLE — workers commute independently | N/A at v3 |

---

## Hard rules (from INSTRUCTION_PACK §8)

**Cardinal Rule — 3 non-negotiables:**
1. Klokd NEVER calls Daraja directly (Kipkiren Pay only)
2. Klokd NEVER stores National ID images / biometrics (Identiti only)
3. Klokd NEVER calls Africa's Talking / WhatsApp Business API directly (Todoku only)

**Other:**
- `PaymentRailClient` naming (NOT `KipkirenPayClient`) — survives LipaStack Phase 3 transition (AD-K06)
- Env vars `PAYMENT_RAIL_*` (NOT `KIPKIREN_PAY_*`) — survives Phase 3
- Typed DTOs on all payment rail boundaries (AD-K07)
- `account_uuid` from Identiti = primary FK on every worker/employer table (AD-K10)
- KES minor units only
- No raw MSISDNs anywhere — phone tokens 15-min freshness, never cached beyond
- No emojis (unless explicitly requested)
- Code as files only
- English + Swahili bilingual

---

## Key historical decisions still locked (from reboot pack §11)

- **D-09** M-Pesa Native — firm-wide defining characteristic
- **D-11** Manual matching at MVP (no algorithm)
- **D-12** Escrow STK Push on confirmation + auto-release at 4 hours
- **D-13** GPS geo_hash only — raw coords NEVER persisted
- **D-14** GPS clock-in radius 500m
- **D-15** Payment Service isolated from Shift Service
- **D-16** Compliance Engine as discrete Layer 1 service from Sprint 7
- **D-17** Statutory rates in config table — NEVER hardcoded
- **D-18** AHL toggle via config — currently OFF

---

*Klokd v3 · 9 June 2026 · Confidential · Klokd Workplace Solutions Ltd*
