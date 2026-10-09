# Klokd — Reboot Pack v1.0
## Session Continuity Document · Kirimon Market Ventures

**Product:** Klokd — Casual Labour Marketplace (Product B)
**Pack version:** v1.2 · 09 October 2026 (v1.1 · 08 Oct 2026 · v1.0 · March 2026)
**Prepared by:** Chamia Mutuku, Co-Founder & CPO
**Classification:** Confidential · Internal Use Only
**Rule:** Update this document at the end of every working session. Never start a session without reading it first.

---

> **v1.1 (08 Oct 2026) — read this first.** Sections 1–10 still describe the March 2026 plan. Since then the platform moved to the KMV rails model (Identiti, Todoku, Kipkiren Pay, Hakken, Helpan — Klokd never holds Daraja / Africa's Talking / WhatsApp credentials), hosting moved to Railway + Supabase (eu-west-1), and the web surface unified on one dark design. Where a Section 1–10 rule conflicts with the Decisions Register (Section 11), **the register wins** — superseded decisions are marked there, never deleted. Live engineering state (sprints, rails, builds) is tracked in `RECAP.md`; this pack tracks decisions, open questions, assets, infrastructure and the next starting point.

## 0. How to Use This Pack

This document is the single source of truth for all Klokd product, technical, legal, and design decisions. At the start of any Claude session involving Klokd, paste or upload this document first. Claude should read this pack before producing any output. If any information in the session contradicts this pack, raise it explicitly — do not silently override.

---

## 1. Product Identity (LOCKED)

| Attribute | Value |
|---|---|
| **Product name** | Klokd |
| **Domain** | klokd.co.ke |
| **Handle** | @klokdKE |
| **Logomark** | K |
| **Tagline** | Not finalised — do not invent one |
| **Entity** | Kirimon Market Ventures (parent) |
| **Footer attribution** | "A Kirimon Market Ventures Company" at opacity 0.18 |
| **Kirimon visibility** | Never appears in user-facing copy |
| **Pre-seed ask** | KES 18M |
| **Beta target** | May/June 2026 |
| **Beachhead** | Nairobi hospitality sector |
| **Beta cohort** | 50 employers · 200 workers |

### What Klokd Is
Two-sided M-Pesa Native mobile platform connecting verified casual workers with businesses in hospitality, health, and retail. Workers find shifts near them in seconds. Employers post in under 2 minutes. M-Pesa pays workers within 30 minutes of clock-out. Every shift generates a compliant employment contract.

### What Klokd Is Not
- Not an HR platform (Product A — deferred indefinitely)
- Not an algorithm-driven matching platform (manual at MVP)
- Not an EOR business at MVP (Year 2, pending legal opinion)
- Not a pan-Africa platform (Year 4+)

---

## 2. Brand & Design System (LOCKED)

### Identity
- **Brand name:** Klokd — never `KLokd`, `Klokd.`, or `KLOKD`
- **Logomark:** K — single letter, bold weight
- **Domain:** klokd.co.ke — never `.com` or `.app`
- **Handle:** @klokdKE — NEVER @klokKE (this is a common error — always check)

### Colour Palette
| Name | Hex | Usage |
|---|---|---|
| Electric Mint | `#00E5A0` | Primary CTA, active states, earnings figures |
| Volt Lime | `#BCFF4E` | Gradient partner to Mint, accents |
| Near Black | `#0A0A0F` | Worker App background (ink shell) |
| Slate | `#1A1A2E` | Cards, nav backgrounds |
| Mist | `#F4F6F3` | Employer App background (mist shell) |
| Mid | `#6B7280` | Secondary text, labels |
| Soft | `#E8EDE8` | Borders, dividers |

### Typography
- **Typeface:** Inter (all weights)
- **Display CTAs:** Inter Black (weight 900)
- **Body/UI:** Inter Regular (400) and Medium (500)
- **Monospace elements (IDs, references):** JetBrains Mono

### Two-Shell Identity (LOCKED — never blur)
| Shell | Background | Usage |
|---|---|---|
| Worker shell | Near Black `#0A0A0F` (ink) | All Worker App screens |
| Employer shell | Mist `#F4F6F3` | All Employer App screens |

**Rule:** Worker screens are ALWAYS dark. Employer screens are ALWAYS light. No exceptions. No crossover.

### Gradient CTA (LOCKED)
All primary CTAs use: `linear-gradient(135deg, #00E5A0, #BCFF4E)`
Text on gradient CTA: Near Black `#0A0A0F` — never white

### No white text on Electric Mint. This is explicitly prohibited.

---

## 3. Architecture (LOCKED)

### Three-Layer Model

**Layer 1 — Core Platform API** (Node.js / Express 5 / TypeScript)
Hosted: AWS af-south-1 (Cape Town) — Kenyan data residency requirement. All business logic lives here. REST API. Multi-tenant from day one (`tenant_id` on all tables).

Services:
- Shift Service
- Payment Service (isolated from shift state — a failed payment never corrupts a shift)
- Compliance Engine ← **discrete Layer 1 service, NOT embedded in shift flow**
- Contract Service
- Identity Service
- Notification Service
- Webhook Service
- Analytics Event Log

**Layer 2 — Products**
- Worker App (React Native, Android-first)
- Employer App (React Native, Android-first)
- Admin Portal (React web)
- EOR Portal ← **Year 2 only, pending legal opinion**

**Layer 3 — Ecosystem**
- Safaricom Daraja B2C (M-Pesa wage disbursement)
- Per-shift WIBA micro-insurance partner (MVP+)
- KRA/iTax (PAYE remittance)
- Enterprise HR API (Year 2, webhook-based)

### Key Architecture Decisions (LOCKED)

| Decision | Detail | Rationale |
|---|---|---|
| REST API for MVP | GraphQL deferred to Year 2 | Complexity before partner demand |
| Multi-tenant schema | `tenant_id` on all tables | White-label option from day one |
| Event-driven lifecycle | ShiftEventLog — all state transitions | Compliance, webhooks, analytics |
| Payment decoupled | PaymentService has zero dependency on ShiftService | Failed payment never corrupts shift |
| Compliance Engine discrete | Standalone Layer 1 API service from Sprint 7 | EOR portal will call same endpoints |
| All statutory rates in config | Never hardcoded | Update without code deployment |
| AHL toggle via config | On/off without deployment | Legal status unresolved |
| GPS as geo_hash only | Raw coordinates never persisted | DPA 2019 data minimisation |
| AWS af-south-1 only | All data in Cape Town region | Kenyan data residency |
| Manual matching at MVP | Filtered list — no algorithm | Sufficient at 50/200 cohort |
| GPS clock-in 500m radius | Offline queue for low connectivity | Worker persona network reality |
| Escrow model | Funds held from confirmation | Auto-release 4 hours post clock-out |
| Android-first | iOS in Year 1 post-beta | Worker persona device reality |
| 7-year data retention | Payment records and contracts | KRA + Employment Act requirement |

### Technology Stack

| Layer | Technology |
|---|---|
| Mobile apps | React Native · Android-first · Expo (SDK pinned) |
| Backend | Express 5 / TypeScript |
| Runtime | Node.js 22 (Railway) · Node.js 16 (local macOS Catalina — constraint) |
| Database | PostgreSQL (AWS RDS, af-south-1) |
| ORM | Prisma |
| File storage | AWS S3 (af-south-1 · AES-256 encryption at rest · 7-year lifecycle) |
| Auth | JWT + refresh tokens · OTP via Africa's Talking |
| Push | FCM (primary) · WhatsApp Business API (fallback at 5 min) |
| Payments | Safaricom Daraja B2C |
| Hosting | Railway (backend) · AWS af-south-1 |
| DNS | Cloudflare |
| Monitoring | CloudWatch · PagerDuty |
| CI/CD | GitHub Actions |
| Testing | Jest (unit/integration) · k6 (load) · Postman (API) |

---

## 4. Product Scope (LOCKED)

### In Scope — Beta

**Worker App — 15 screens**
1. Welcome (carousel)
2. Privacy & Consent (DPA 2019 — GATES all data collection)
3. ID Verification (National ID front/back + selfie)
4. Skills & Certifications
5. M-Pesa Setup (custom numpad)
6. Home (stats card + shift feed)
7. Shift Detail
8. Contract Acknowledgement (Employment Act s.9)
9. Clock-In (GPS + WIBA gate)
10. Active Shift (timer + clock-out)
11. Payment Confirmed (deduction breakdown + pay statement)
12. Shifts Tab
13. Pay Tab (monthly aggregation)
14. Profile/Me Tab (data subject rights panel)
15. Dispute Flow

**Employer App — 14 screens**
1. Welcome
2. Business Verify (KRA PIN)
3. WIBA & Insurance Declaration (GATES clock-in)
4. M-Pesa Setup (Paybill / Till / Personal)
5. Dashboard
6. Post a Shift (min wage gate + S37 alert + rate intelligence)
7. Select Worker (ranked cards)
8. Active Shift Monitoring
9. Clock-Out Confirm (easy release / friction dispute)
10. Rating Screen
11. Shifts Tab
12. Team Tab (favourites + one-tap re-hire)
13. Pay/Billing Tab
14. Dispute Flow

**Admin Portal — 4 panels**
1. Compliance Configuration (statutory rate toggles + audit trail)
2. Data Subject Request Management
3. Breach Response Panel (72-hour ODPC countdown)
4. Monthly Compliance Dashboard (KRA/NSSF/SHIF export)

**Compliance Engine — 5 Layer 1 endpoints**
- `POST /compliance/calculate` — PAYE, NSSF, SHIF, AHL
- `GET /compliance/wiba/:shiftId` — hard gate before clock-in
- `GET /compliance/section37/:workerEmployerPair` — threshold monitoring
- `POST /compliance/minwage/validate` — blocking gate on shift posting
- `POST /compliance/contract/generate` — Employment Act s.9 contract

### Out of Scope — MVP (do not propose or build)
- Algorithm matching
- GraphQL API
- EOR Portal
- Enterprise HR API
- Per-shift micro-WIBA insurance
- Labour Market Intelligence API
- iOS app
- AHL deductions (config-off pending legal)
- MFI micro-loan integration
- Pan-Africa white-label
- Product A (HR management)

---

## 5. Business Logic (LOCKED)

### Shift Lifecycle States
`posted → confirmed → accepted → active → completed → [disputed →] paid`

All transitions emit to `ShiftEventLog`. No state can be skipped.

### Payment Model
- **Platform fee:** 4% per completed shift
- **Escrow:** Employer funds held from shift confirmation (STK Push)
- **Auto-release:** 4 hours after clock-out if no dispute
- **Dispute:** Pauses auto-release. Admin resolves manually.
- **Deduction order:** Gross → PAYE → NSSF Tier I → NSSF Tier II → SHIF → AHL (if active) → Net to worker via Daraja B2C
- **M-Pesa timing:** Net lands within 30 minutes of clock-out (platform guarantee)
- **Payment decoupled from shift:** A payment failure NEVER changes shift status

### Matching Logic (MVP)
Manual matching only. No algorithm. Workers filtered by:
1. Proximity (distance from shift location)
2. Identity verified (status: approved)
3. No confirmed overlapping shift
4. Role matches shift requirement

Sorted: distance ASC → rating DESC → show-up rate DESC

### Rating System
- Workers rated by employers post-shift (1–5 stars)
- Employers rated by workers post-shift (1–5 stars)
- **Aggregate only** — individual ratings not visible
- **Minimum 3 ratings** before aggregate is displayed
- Show-up rate: calculated from confirmed shifts attended vs missed

### Section 37 Monitoring
- 20 days continuous engagement: warning returned in API response
- 25 days: employer must explicitly acknowledge before confirming shift
- 30 days: hard block — shift confirmation refused, admin notified

### GPS / Location
- Clock-in requires worker within 500m of shift location
- Offline: request queued locally, replayed on reconnect with timestamp
- Data stored as `geo_hash` — raw coordinates NEVER persisted

---

## 6. Compliance Architecture

### Legal Domains (Kenya)
Six domains govern the platform. All compliance logic lives in the Compliance Engine as a discrete Layer 1 service.

| Domain | Key Obligation | Compliance Gate |
|---|---|---|
| Employment Act 2007 | Written contract per engagement (s.9) | Contract Service generates on shift acceptance |
| PAYE | Deduction and remittance via KRA iTax | Compliance Engine calculates; Admin Portal exports |
| NSSF | Tier I + II contributions (worker + employer) | Monthly aggregation across all shifts |
| SHIF (SHA) | 2.75% of gross, min KES 300/month | Monthly aggregation |
| WIBA 2007 | Insurance confirmed before clock-in | Hard gate on clock-in — blocks if unconfirmed |
| DPA 2019 | Explicit consent, data minimisation, ODPC registration | Privacy & Consent screen gates all data collection |

### Statutory Rates (as of March 2026 — verify against legal opinion)
| Deduction | Rate | Notes |
|---|---|---|
| PAYE | 2025/26 bands | Rates in config table; personal relief KES 2,400/month |
| NSSF Tier I | 6% worker + 6% employer | Ceiling: KES 480 each per month |
| NSSF Tier II | 6% worker + 6% employer | On KES 8,001–72,000 band |
| SHIF | 2.75% of gross | Minimum KES 300/month |
| AHL | 1.5% worker + 1.5% employer | **TOGGLE OFF** — legal status unresolved |
| NITA | KES 50/worker/month | Monthly, not per-shift |

**Rule:** All rates live in `compliance_config` database table. NEVER hardcode. NEVER calculate inline in shift flow.

### DPA 2019 Compliance Requirements
- ODPC registration: Data Controller + Data Processor (both required)
- Biometric data (National ID + selfie): explicit consent required on Privacy & Consent screen
- GPS data: explicit consent toggle required; data minimisation (geo_hash only)
- Data retention: 7-year minimum on payment records and contracts (no delete option)
- Data subject rights: functional in-app (download, correct, delete, manage consent)
- Breach notification: 72 hours to ODPC (Breach Response Panel in Admin Portal)
- DPAs required: AWS, Safaricom, WhatsApp Business, Africa's Talking

### WIBA Architecture Decision (MVP)
**Option A selected for MVP:** Employers hold their own WIBA policy. Klokd captures policy reference, insurer, and expiry date during employer onboarding. Expired or undeclared policy = hard block at clock-in.

**Option B (future):** Klokd sells per-shift micro-insurance via insurer partner. Primed in employer onboarding screen copy: "No policy? Coming soon: Klokd per-shift cover."

### EOR Classification (UNRESOLVED — legal opinion required)
Three scenarios pending legal opinion:
- **Scenario A:** Pure marketplace intermediary — employer holds all obligations
- **Scenario B:** Platform bears employer-like obligations — EOR portal moves to Phase 2
- **Scenario C:** Hybrid — specific obligations (WIBA gate, min wage, record retention) without full EOR

**Do not design or build the EOR portal until the legal opinion is received and reviewed.**

---

## 7. Sprint Backlog Summary

**Format:** 2-week sprints · 23 total · 46 weeks · 387 story points
**Team:** Chamia (CPO/PO) + 2 developers (to confirm) + part-time designer (from Sprint 11)
**Story point scale:** XS=1, S=2, M=3, L=5, XL=8

| Phase | Sprints | Weeks | Points | Key Deliverable |
|---|---|---|---|---|
| Phase 0 — Validation | S1–S2 | 1–4 | 41 | Legal opinion · 50 interviews · Infrastructure |
| Phase 1 — Core API | S3–S6 | 5–12 | 78 | Auth · Shift · Match · GPS · Notifications |
| Phase 2 — Compliance | S7 | 13–14 | 26 | Compliance Engine · Contracts · Webhooks |
| Phase 3 — Worker App | S8–S11 | 15–22 | 69 | Complete worker flow |
| Phase 4 — Employer App | S12–S15 | 23–30 | 62 | Complete employer flow |
| Phase 5 — Payment | S16–S18 | 31–36 | 42 | Daraja production · Escrow · Pay statements |
| Phase 6 — Admin | S19–S21 | 37–42 | 35 | Compliance config · DPA rights · Security |
| Phase 7 — Beta | S22–S23 | 43–46 | 34 | First live shift · Go-live |
| **TOTAL** | **23** | **46** | **387** | **Controlled beta launch** |

---

## 8. Compliance Critical Path

These must complete before the sprint that depends on them. Missing them blocks development. No exceptions.

| Action | Owner | Deadline | Blocks | Priority |
|---|---|---|---|---|
| Legal opinion: PAYE/NSSF/WIBA/entity | Chamia | End Sprint 1 | Everything | P0 |
| ODPC registration confirmed | Chamia | End Sprint 2 | Sprint 8 — identity data | P0 |
| KRA PIN obtained | Chamia | End Sprint 1 | Sprint 19 — PAYE remittance | P0 |
| WIBA option A or B confirmed | Ivy | End Sprint 2 | Sprint 6 — clock-in gate | P0 |
| AHL enforceability confirmed | Legal | End Sprint 2 | Sprint 7 — Compliance Engine | P1 |
| Escrow / CBK licensing position | Legal | End Sprint 2 | Sprint 16 — Payment Service | P1 |
| Minimum wage schedules | Developer | End Phase 1 | Sprint 7 — min wage gate | P1 |
| DPAs: AWS / Safaricom / WhatsApp / AT | Chamia | Before Sprint 22 | Go-live | P1 |
| Daraja B2C production keys | Chamia | Before Sprint 16 | Payment Service | P1 |
| DPIA completed | Ivy + Legal | Before Sprint 8 | Worker onboarding | P1 |
| Privacy Policy published | Legal | Before Sprint 22 | DPA 2019 compliance | P2 |

---

## 9. Definition of Done

### Story-Level DoD
A story is Done only when ALL of the following are true:
- [ ] All acceptance criteria pass
- [ ] Unit tests written and passing (coverage ≥ 80% service layer)
- [ ] Integration test written and passing
- [ ] TypeScript clean (`tsc --noEmit`)
- [ ] ESLint zero warnings
- [ ] API endpoint documented if applicable
- [ ] Error states handled — no unhandled promise rejections
- [ ] Mobile screens reviewed at 360px and 390px
- [ ] Touch targets ≥ 44px, contrast sufficient
- [ ] Sensitive data handled per DPA 2019
- [ ] Story status updated to Done in Trello

### Sprint-Level DoD
- [ ] All stories meet story-level DoD
- [ ] Sprint review conducted
- [ ] All endpoints deployed to staging
- [ ] Staging smoke test passing (Postman)
- [ ] No P0 or P1 bugs open
- [ ] Sprint retrospective complete
- [ ] Reboot Pack updated
- [ ] Risk register reviewed

### MVP DoD (Beta-Ready)
- [ ] 50 employers + 200 workers onboarded
- [ ] End-to-end shift loop tested: post → match → clock-in → clock-out → M-Pesa → rating
- [ ] WIBA hard gate confirmed
- [ ] Minimum wage gate confirmed
- [ ] Section 37 alert at 20/25/30 days confirmed
- [ ] Real KES disbursed to real M-Pesa number
- [ ] Escrow auto-release at 4 hours confirmed
- [ ] ODPC registered (Data Controller + Processor)
- [ ] Privacy Policy published
- [ ] DPAs with all third-party processors executed
- [ ] All data in AWS af-south-1 confirmed
- [ ] API P95 < 500ms under 80 concurrent users
- [ ] Load test: 80 VUs, 30 minutes, zero errors
- [ ] KRA PIN · PAYE · NSSF · SHIF registrations complete

---

## 10. Key UX Decisions (LOCKED)

### Worker Onboarding (5 screens — order is fixed)
1. **Welcome** — 3-slide carousel, 3.4s interval, manual dot nav. "Verified once. Work everywhere." / "Shifts near you. Apply in seconds." / "Clock out. M-Pesa pays you."
2. **Privacy & Consent** — DPA 2019 biometric consent. Lists all data categories. Two explicit toggles (identity + GPS). BOTH required. BLOCKS all data collection if not built first.
3. **ID Verification** — National ID front, back, selfie. Verified badge preview shown BEFORE upload. All three required to unlock Continue.
4. **Skills & Certifications** — Role chips. At least one required. Optional cert upload.
5. **M-Pesa Setup** — Custom numpad. Real-time formatting. 30-minute guarantee messaging. CTA active at 10 digits.

### Employer Onboarding (4 screens — order is fixed)
1. **Welcome** — "For Business" pill. Three stacked value prop cards (not carousel). Light mist shell.
2. **Business Verify** — Business name, KRA PIN (11-char validation), contact. Escrow explainer inline.
3. **WIBA & Insurance** — Policy reference, insurer, expiry. "No policy? Coming soon: Klokd per-shift cover." ALL THREE required.
4. **M-Pesa Setup** — Paybill / Till / Personal M-Pesa radio selection. 3-step escrow visual. "Activate my account" → "You're live."

### Post a Shift screen
- Rate field: hard gate (not advisory) if below minimum wage
- Rate intelligence strip: "KES [min]–[max] for [role] in [area]" shown below rate field
- Section 37 alert inline if recent/saved worker is being considered
- Under 2 minutes to complete — all fields required but frictionless

### Select Worker screen
- Show-up rate sits directly under worker name — it is the primary employer anxiety signal
- Top card is visually dominant (full opacity, gradient CTA)
- Remaining cards progressively subdued
- Cards sorted: proximity ASC → rating DESC → show-up rate DESC

### Clock-Out Confirm screen (critical UX decision)
- **Release Payment:** Gradient CTA — easy, prominent, default
- **Raise Dispute:** Ghost button — intentional friction
- 4-hour auto-release countdown displayed
- Framing: "Release KES [amount] or raise a dispute?" — positive framing first

### Payment Confirmed screen
- M-Pesa amount: large display, Electric Mint, Inter Black
- Deduction breakdown shown every time — never hide it
- Pay statement PDF download always available
- Rating prompt follows payment — not before

### Ratings
- Aggregate only — individual ratings never shown
- Minimum 3 ratings before aggregate displays
- Workers rate employers, employers rate workers
- Rating screen appears after payment is confirmed and released

---

## 11. Decisions Register

All locked product, technical, and design decisions. Check this before proposing anything that might override a prior decision.

| # | Decision | Session | Status |
|---|---|---|---|
| D-01 | Brand name: Klokd | Founding | LOCKED |
| D-02 | Domain: klokd.co.ke | Founding | LOCKED |
| D-03 | Handle: @klokdKE (NOT @klokKE) | Founding | LOCKED |
| D-04 | Logomark: K | Founding | SUPERSEDED on web by D-35 (K stays as favicon / app icon) |
| D-05 | Two-shell identity: Worker = ink dark, Employer = mist light | Design session | SUPERSEDED by D-33 (24 Jun 2026) |
| D-06 | Primary CTA: Electric Mint → Volt gradient | Design session | SUPERSEDED by D-34 (24 Jun 2026) |
| D-07 | No white text on Electric Mint | Design session | LOCKED |
| D-08 | Typeface: Inter throughout | Design session | LOCKED |
| D-09 | M-Pesa Native — firm-wide defining characteristic | Founding | LOCKED |
| D-10 | Kirimon never appears in user-facing copy | Founding | LOCKED |
| D-11 | Manual matching at MVP — no algorithm | Architecture session | LOCKED |
| D-12 | Escrow: STK Push on confirmation, auto-release at 4 hours | Architecture session | LOCKED — mechanism now via Kipkiren Pay (D-32); 4h auto-release unchanged |
| D-13 | GPS: geo_hash only, raw coordinates never persisted | Architecture session | LOCKED |
| D-14 | GPS clock-in radius: 500m | Architecture session | LOCKED |
| D-15 | Payment Service isolated from Shift Service | Architecture session | LOCKED |
| D-16 | Compliance Engine as discrete Layer 1 API service from Sprint 7 | Architecture session | LOCKED |
| D-17 | All statutory rates in config table, never hardcoded | Architecture session | LOCKED |
| D-18 | AHL toggle via config — currently OFF | Architecture session | LOCKED |
| D-19 | AWS af-south-1 for all data (residency requirement) | Architecture session | SUPERSEDED by D-32 (Supabase eu-west-1 per platform standard; Railway hosting) |
| D-20 | 7-year retention on payment records and contracts | Architecture session | LOCKED |
| D-21 | Privacy & Consent screen is Screen 2 of worker onboarding (GATES data collection) | Compliance session | LOCKED |
| D-22 | WIBA screen is Screen 3 of employer onboarding (GATES clock-in) | Compliance session | LOCKED |
| D-23 | WIBA Option A for MVP (employer-held policy) | Compliance session | PENDING SPRINT 2 CONFIRMATION |
| D-24 | EOR Portal is Year 2 — pending legal opinion | Architecture session | LOCKED |
| D-25 | Ratings: aggregate only, minimum 3 before display | Product session | LOCKED |
| D-26 | Section 37: alert at 20/25 days, hard block at 30 | Compliance session | LOCKED |
| D-27 | Show-up rate is the primary employer anxiety signal — sits under worker name on all cards | UX session | LOCKED |
| D-28 | Clock-Out Confirm: Release = gradient (easy), Dispute = ghost (friction) | UX session | LOCKED |
| D-29 | Android-first. iOS in Year 1 post-beta | Architecture session | LOCKED |
| D-30 | Pre-seed ask: KES 18M | Funding session | LOCKED |
| D-31 | Employer onboarding: stacked value prop cards (not carousel) | UX session | LOCKED |
| D-32 | KMV rails model: Klokd consumes Identiti (accounts, KYC, phone tokens), Todoku (SMS/OTP), Kipkiren Pay (escrow, payouts), Hakken (discovery), Helpan (agents). Klokd never holds Daraja / Africa's Talking / WhatsApp creds and never stores ID images (AD-K01/02/03). Hosting: Railway (API + web), Supabase eu-west-1 | v3 rails, Jun 2026 | LOCKED |
| D-33 | One dark design for every persona on web (landing, worker, employer, admin) — orbs + dot-grid background | Product surface day, 24 Jun 2026 | LOCKED |
| D-34 | Single accent: electric `#00E5A0`; volt only as the per-app identifier (FOR EMPLOYERS badges). Primary button gradient electric → `#0FBD83` | 24 Jun 2026 | LOCKED |
| D-35 | Web logo is the "Klokd" wordmark only; the K mark is the favicon / app icon | 08 Oct 2026 | LOCKED |
| D-36 | Website hosting: Railway service `klokd-web` (Expo web export served by Caddy, auto-deploys on `web-app/**` pushes); `klokd.co.ke` + `www` (301 → apex) via Cloudflare DNS, DNS-only | 08 Oct 2026 | LOCKED |
| D-37 | Public self-serve sign-in is gated behind early access (`EXPO_PUBLIC_SIGNIN_MODE=early-access`) until Todoku SMS delivery works; waitlist stored via `POST /api/v1/early-access` | 08 Oct 2026 | LOCKED until OQ-13 resolves |
| D-38 | Landing honesty rules: no partner logos, no invented metrics, no links to pages that don't exist; waitlist count shown only at ≥ 25; illustrations labelled as sample data | 08 Oct 2026 | LOCKED |
| D-39 | Landing hero visual = the looping "shift clock" (clock-in → pay counts up → payslip → sent to M-Pesa) | 08 Oct 2026 | LOCKED |
| D-40 | Visual style = refined glassmorphism over the existing orb background. Aurora gradient deferred to public launch (low-end Android performance, single-accent rule) | 08 Oct 2026 | LOCKED |
| D-41 | Klokd collects no M-Pesa number: payouts follow the SMS-verified sign-in number (Kipkiren Pay will hold the destination) | 08 Oct 2026 | LOCKED |
| D-42 | Hakken registration triggers: worker on IPRS KYC reaching tier ≥ 1; employer once a KRA PIN is on file (until then the business name may be a person's name); sweep catch-up every 5 min for anything missed | 08 Oct 2026 | LOCKED |
| D-43 | No Identiti HTTP webhooks for now. Before the real-money pilot: synchronous account-status checks at shift confirmation and payout. If platform-wide events are needed, prefer Identiti's Kafka option | 08 Oct 2026 | LOCKED |
| D-44 | Legal pages name the operating company as "Klokd" (exact registered form pending — OQ-11) | 08 Oct 2026 | PROVISIONAL |
| D-45 | Posting a shift requires business verification on the server: KRA PIN on file **and** a current (unexpired) WIBA policy. Web employers verify at `#/employer/verify` | 09 Oct 2026 | LOCKED |
| D-46 | Attendance follows the Uber model: worker taps **"I've arrived"** (500 m geofence, GPS accuracy ≤ 150 m, time window from 60 min before start, WIBA + ID verified) → enters the employer's **4-digit start PIN** (the Uber trip PIN) → shift ACTIVE. Arrival and start are separate events. No location tracking before, during or after — location is read only at arrive and clock-out. Supersedes the single "clock-in" button | 09 Oct 2026 | LOCKED |
| D-47 | Start PIN is issued when the employer picks a worker, shown only to the employer, locks after 5 wrong tries. Employer may start the shift without the PIN only with a reason (GPS failed · PIN locked · phone issue · other + note); it never bypasses WIBA / ID gates and is flagged for Klokd review | 09 Oct 2026 | LOCKED |
| D-48 | Attendance is an append-only ledger (`attendance_events`, DB triggers block UPDATE/DELETE); server time only; geohash + distance stored, never raw coordinates. Integrity signals (fake-GPS app, early clock-out, clock-out away from venue, old app without PIN, late start) **flag, never block** | 09 Oct 2026 | LOCKED |
| D-49 | Clock-out records location but never blocks. It creates the shift settlement (gross, statutory deductions, net, 4 % Klokd fee on top for the employer) with a 4-hour approve-or-report window, then auto-approves. A dispute pauses it | 09 Oct 2026 | LOCKED |
| D-50 | No-show watcher (every minute): late warning to worker + employer at start + 10 min, no-show at + 20 min; employer chooses wait · replace (shift reopens, earlier applicants return to the pick list, no-show worker excluded) · cancel. Thresholds are env config | 09 Oct 2026 | LOCKED |
| D-51 | Ops "override watch": an employer is flagged when they have ≥ 3 PIN overrides in 30 days **and** overrides are ≥ 50 % of their shift starts (audit log entry on crossing). Admin review queue clears or escalates every flagged event | 09 Oct 2026 | LOCKED |
| D-52 | Realtime for now = polling (employer shift page 15 s, dashboard feed 20 s) plus in-app notifications. WebSocket/SSE push deferred until there is real volume | 09 Oct 2026 | PROVISIONAL |

---

## 12. Open Questions

These are unresolved as of the pack date. Any session that resolves one must update the Decisions Register and remove the item from this list.

| # | Question | Blocks | Priority |
|---|---|---|---|
| OQ-01 | Legal opinion: Is Klokd a marketplace intermediary, bears employer-like obligations, or hybrid? | EOR portal architecture · Compliance Engine scope | P0 |
| OQ-02 | WIBA Option A or B confirmed? (Employer-held vs Klokd per-shift cover) | Sprint 6 clock-in gate design | P0 |
| OQ-03 | AHL enforceability — is the levy currently active and enforceable? | Sprint 7 Compliance Engine toggle setting | P1 |
| OQ-04 | Escrow / CBK position — is holding employer funds pending a CBK licensing requirement? | Sprint 16 Payment Service architecture | P1 |
| OQ-05 | Escrow language: does "escrow" require CBK licensing? If so, what alternative language? | All in-app copy referencing escrow | P1 |
| OQ-06 | Who is the second developer? What is their start date? | Sprint 3 kickoff | P1 |
| OQ-07 | Who is Ivy? (Referenced as interview lead and DPIA co-owner) | Phase 0 validation work | P1 |
| OQ-08 | WIBA Option B insurance partner — which insurer? What is the commercial arrangement? | Sprint 7+ (Option B design if selected) | P2 |
| OQ-09 | Section 37 advice: Does a 30-day block fully satisfy the legal obligation or is further action required? | Sprint 5 S37 implementation | P2 |
| OQ-10 | Rate intelligence data source — how will the KES [min]–[max] strip in Post a Shift be populated initially? | Sprint 13 Post a Shift screen | P2 |
| OQ-11 | Exact registered company name as on the certificate (e.g. "Klokd Limited")? | Terms + Privacy wording (D-44) | P1 |
| OQ-12 | `OTP_SANDBOX_ECHO=true` on the production API returns OTP codes to any caller (account takeover). Turn off when OQ-13 resolves, or sooner if the demo apps can lose sign-in | Any real users | P0 |
| OQ-13 | Todoku reports SMS / voice / WhatsApp channels unavailable — real OTPs can't reach phones | Re-opening public sign-in (D-37) | P0 |
| OQ-14 | Rotate the API secrets exposed in the 08 Oct session (Hakken, Helpan, Identiti app secrets; JWT secrets) | Security hygiene | P1 |
| OQ-15 | Identiti's Supabase project (`tjqpyblyoslyoplmnlua`) free tier auto-paused 3× (22 May, 18 Jul, 08 Oct) — move to a paid plan | All sign-ups (account creation fails while paused) | P0 |
| OQ-16 | Helpan rail returned 500 on every write (25 Jul) — fixed? | Any Helpan feature work | P2 |
| OQ-17 | Hakken `klokd` app still `provisioning` — Silvia to flip to `active` | Formal Hakken go-live | P2 |
| OQ-18 | Two `_dmarc` TXT records on klokd.co.ke (`p=reject` and `p=none`) — keep one | Email deliverability | P2 |
| OQ-19 | Push notifications don't reach phones: `notification.service` sends Expo push to the *user id*, not a device push token, and no app registers tokens. Arrival / late / no-show alerts are stored in-app only until fixed | Realtime alerts to employers away from the dashboard | P1 |
| OQ-20 | Attendance-event retention period (proposed 12 months, then aggregate) — needs counsel + ODPC position | DPA compliance | P2 |

### 12a. Pending until Kipkiren Pay is live

Everything up to "pay approved" is built (D-49). These steps need the payment rail and are **not** done:

| # | Pending work | Where it plugs in |
|---|---|---|
| KP-1 | **Fund escrow at worker selection** — STK push to the employer for shift pay + 4 % fee; shift stays unconfirmed until the hold is funded | `paymentService.initiateEscrow` (written, never called from the confirm flow) |
| KP-2 | **Escrow-funded gate at arrive / start** — refuse `ESCROW_NOT_FUNDED`, notify the employer | `attendanceService.complianceGates` |
| KP-3 | **Payout sweep** — pay every `APPROVED` settlement: call `paymentService.disbursePayment`, mark the settlement `PAID`, shift → `PAID`, notify the worker with the M-Pesa receipt | `attendanceService.autoApproveDue` (comment marks the hook) |
| KP-4 | **Payout step-up OTP** for payouts above KES 20,000 (`/payments/:id/step-up` endpoint referenced, not built) | `payment.service.ts` |
| KP-5 | **Refund to employer** on cancelled / no-show shifts with a funded hold | `paymentService.refundEscrow` from `resolveNoShow('cancel')` |
| KP-6 | **Reconcile `Payment` with `ShiftSettlement`** — `disbursePayment` recomputes deductions; switch it to read the approved settlement so the paid amount equals what the employer approved | `payment.service.ts` |
| KP-7 | Real escrow meter + "Spent this week" on the employer dashboard (currently labelled SAMPLE / em-dash) | `EmployerDashboard.tsx` |
| KP-8 | Worker Pay tab: real payouts + payslip download | worker app / web `pay` tab |

---

## 13. Assets Produced

All deliverables produced to date, with their status.

| Asset | Format | Status | Location / Notes |
|---|---|---|---|
| Brand guide | React TSX (interactive, 8 tabs) | Produced | Session — upload if needed |
| Worker onboarding mockups | HTML | Produced | 5 screens — Welcome through M-Pesa Setup |
| Employer onboarding mockups | HTML | Produced | 4 screens — Welcome through M-Pesa Setup |
| Worker + Employer screen mockups | HTML | Produced | 3 screens each (Home, Shift Detail, Payment Confirmed; Dashboard, Post a Shift, Select Worker) |
| Compliance advisory | Markdown (12 sections) | Produced | Session — upload if needed |
| Architecture advisory | Session content | Produced | Three-layer model — see Section 3 of this pack |
| MVP Specification | Markdown | Produced | klokd_mvp_spec.md |
| MVP Specification | PDF | Produced | klokd_mvp_spec.pdf |
| Sprint Backlog | Interactive HTML artifact | Produced | klokd_sprint_backlog.html |
| Reboot Pack | Markdown (this document) | Produced | klokd_reboot_pack_v1.md (v1.1, 08 Oct 2026) |
| Public website | Expo web (`web-app/`) | **LIVE** | https://klokd.co.ke — landing (shift-clock hero, glassmorphism), early-access form, Terms, Privacy |
| Early-access waitlist | API + DB table | **LIVE** | `POST /api/v1/early-access` (public), `GET /api/v1/early-access` (admin), `GET /api/v1/early-access/count` |
| Worker + employer apps | Expo Android APKs + OTA | **LIVE (investor builds)** | EAS `kmv209`; OTA on `preview` branch (latest worker update 08 Oct: payout step) |
| Privacy Policy + Terms | Web pages | **LIVE** | klokd.co.ke/#/privacy · #/terms (company name per D-44) |

### Assets Still Required
- Investor pitch deck (8–10 slides)
- Financial model (KES — Year 1–3 projections)
- Postman collection (Sprint 3+)
- Prisma schema file (Sprint 3+)
- Worker and Employer app full screen sets (Sprints 8–15)
- WhatsApp notification templates
- Counsel review of Privacy Policy + Terms (drafts are live)
- Employment contract template (for Contract Service PDF generation)

---

## 14. Infrastructure

*As of 08 Oct 2026. Details and history in `RECAP.md`.*

| Item | Status | Notes |
|---|---|---|
| Domain: klokd.co.ke | **LIVE** | Cloudflare DNS (DNS-only CNAMEs) → Railway `klokd-web`; Let's Encrypt certificate to Jan 2027; `www` 301 → apex |
| Website (`web-app/`) | **LIVE** | Railway `klokd-web` (project `happy-smile`), Dockerfile + Caddy, auto-deploys on `web-app/**` |
| API (`octopus-api/`) | **LIVE** | Railway `klokd` → https://klokd-production.up.railway.app, auto-deploys on push to `main`; SQLite on a Railway volume (backups still to set up) |
| GitHub repository | **LIVE** | `iamkn1ght/klokd` (moved from `thhvvv/klokd`), branch `main` |
| Supabase (Klokd) | **LIVE** | `nbtpkmjovgbwgwefsdjn`, eu-west-1 — document storage |
| Identiti (accounts / KYC) | **LIVE** | `klokd_sandbox`; outage 08 Oct (Supabase pause) resolved same day — see OQ-15 |
| Todoku (SMS / OTP) | DEGRADED | Rail up, but SMS / voice / WhatsApp channels unavailable — OQ-13 |
| Hakken (discovery) | **LIVE** | Registration wiring fixed 08 Oct (D-42); app still `provisioning` — OQ-17 |
| Helpan AI (agents) | PROVISIONED, UNUSED | API routes built; no app calls them; rail write errors as of Jul — OQ-16 |
| Kipkiren Pay (escrow / payouts) | HELD | Not ready upstream (KP-1-Ops) |
| Mobile builds | **LIVE (investor)** | EAS `kmv209`, OTA `preview`; iOS via Expo Go (no Apple Developer account yet) |
| Daraja / Africa's Talking / WhatsApp API | NOT USED | Replaced by rails (D-32) |
| ODPC registration | Open | Before real users (counsel to scope) |
| Company registration | Done (name per D-44) | Confirm exact form — OQ-11 |
| KRA PIN / NSSF / SHIF employer registration | Open | Before real wages are paid |

---

## 15. Revenue Model

| Stream | Rate | Timing | Notes |
|---|---|---|---|
| Platform fee | 4% per completed shift | Deducted from escrow at auto-release | Primary revenue — MVP |
| Employer subscriptions | TBD | Year 1 | Power users — re-hire features |
| Per-shift WIBA micro-insurance | TBD — distribution margin | MVP+ | Requires insurance distribution agreement |
| Compliance-as-a-service (EOR) | 12–18% of gross wages | Year 2 | 3.75× revenue per employer vs marketplace fee |
| Labour Market Intelligence API | TBD | Year 3 | Analytics Event Log is the foundation |

### Revenue Case for EOR (informational)
At 40 shifts/month × KES 1,800 gross per shift:
- Marketplace only: KES 2,880/month per employer (4%)
- EOR at 15%: KES 10,800/month per employer
- EOR is 3.75× the revenue at the same shift volume

---

## 16. Contacts & Team

| Role | Name | Notes |
|---|---|---|
| Founder & CPO | Chamia Mutuku | He/him · Kirimon Market Ventures |
| Developer | Cornelius | Builds + deploys; holds Railway / EAS access; receives rail secrets |
| Rails operator | Silvia | Identiti, Todoku, Hakken, Kipkiren Pay provisioning + escalations |
| Designer (part-time) | — | From Sprint 11 |
| Interview Lead / DPIA | Ivy | Referenced — confirm role and surname |
| Legal counsel | TBC | Kenyan labour firm — Sprint 1 P0 engagement |
| WIBA insurer partner | TBC | Option B dependency |

---

## 17. Session Rules

1. **Read this pack before any output.** Do not produce code, copy, or design until this document has been read in the session.
2. **LOCKED decisions are not open for debate.** If a locked decision is in conflict with a new request, flag it explicitly. Do not silently override.
3. **Handle is @klokdKE — always check.** The most common error is writing @klokKE. It is wrong every time.
4. **Kirimon never appears in user-facing copy.** Footer attribution at opacity 0.18 only.
5. **EOR portal is Year 2.** Do not design, mock, or estimate it until the legal opinion is received.
6. **Compliance Engine is discrete.** Never embed statutory calculation logic in shift flow code.
7. **All statutory rates in config.** Never hardcode PAYE bands, NSSF ceilings, SHIF percentages, or AHL rates.
8. **AHL is off.** Do not calculate or display AHL deductions until the toggle is set on by Chamia.
9. **Privacy & Consent screen is Screen 2 of worker onboarding.** It must appear before any biometric or location data is requested. It cannot be moved or merged.
10. **WIBA screen is Screen 3 of employer onboarding.** It must appear before the employer can post their first shift.
11. **Update this pack at end of session.** New decisions → Section 11. Resolved questions → remove from Section 12. New assets → Section 13.

---

## 18. Next Session Starting Point

Current status as of Pack v1.2 (09 Oct 2026):

**Completed this session (09 Oct 2026) — not yet pushed (awaiting go-ahead; pushing `main` deploys the API):**
- Web employer flows: business verification (KRA PIN + WIBA), Post a Shift, shift detail with applicants + Select worker (D-45)
- Security: applicants list only visible to the shift's employer; disputes only fileable by the shift's two parties; shift detail hides the PIN and the worker's surname
- Minimum-wage gate was never enforced (case mismatch `Waiter` vs `waiter`) — fixed
- Attendance v1, Uber model (D-46 – D-52): arrive → PIN → start, employer override with reason, clock-out with location, settlement + 4 h window + auto-approve, no-show watcher with wait / replace / cancel, employer live panel + dashboard activity feed, admin Attendance tab (review queue + override watch), worker app check-in + active-shift screens wired to the real API (needs an OTA)
- Migration `20261009090000_attendance_v1` (ALTER TABLE only on `shifts`; new `attendance_events`, `attendance_reviews`, `shift_settlements`)

**Next actions (in priority order):**
1. Push to `main` (API + web deploy) and publish the worker-app OTA (`eas update --branch preview`)
2. Get Todoku SMS working (OQ-13), then turn off `OTP_SANDBOX_ECHO` (OQ-12) and re-open web sign-in
3. Move Identiti's Supabase to a paid plan (OQ-15); rotate exposed secrets (OQ-14)
4. Fix push delivery (OQ-19) — register Expo push tokens in both apps, send to tokens
5. Kipkiren Pay pending list (§12a) as soon as the rail is live
6. Web — worker: ID verification, Shift Detail + contract acceptance
7. Replace the remaining web "coming soon" tabs (Team, Me; Pay waits on Kipkiren Pay)
8. Mobile: finish the EAS `kmv209 → mumbus` transfer; Play Store submission
9. SEO foundation: pre-rendered public pages + sitemap
10. Housekeeping: fix stale tests (`payment.test.ts` Daraja import, e2e payment release); SQLite backups

**Blocked on business / legal (not code):** Kipkiren Pay production + M-Pesa B2C, ODPC registration, WIBA cover, counsel review of Terms / Privacy, escrow licensing position (OQ-04/05).

---

*Klokd · Reboot Pack v1.2 · 09 October 2026 (v1.1 · 08 Oct 2026 · v1.0 · March 2026)*
*A Kirimon Market Ventures Company · klokd.co.ke · @klokdKE*
*Update this document at the end of every session. Version control in filename.*
