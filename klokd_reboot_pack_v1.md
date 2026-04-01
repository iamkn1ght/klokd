# Klokd — Reboot Pack v1.0
## Session Continuity Document · Kirimon Market Ventures

**Product:** Klokd — Casual Labour Marketplace (Product B)
**Pack version:** v1.0 · March 2026
**Prepared by:** Chamia Mutuku, Co-Founder & CPO
**Classification:** Confidential · Internal Use Only
**Rule:** Update this document at the end of every working session. Never start a session without reading it first.

---

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
| D-04 | Logomark: K | Founding | LOCKED |
| D-05 | Two-shell identity: Worker = ink dark, Employer = mist light | Design session | LOCKED |
| D-06 | Primary CTA: Electric Mint → Volt gradient | Design session | LOCKED |
| D-07 | No white text on Electric Mint | Design session | LOCKED |
| D-08 | Typeface: Inter throughout | Design session | LOCKED |
| D-09 | M-Pesa Native — firm-wide defining characteristic | Founding | LOCKED |
| D-10 | Kirimon never appears in user-facing copy | Founding | LOCKED |
| D-11 | Manual matching at MVP — no algorithm | Architecture session | LOCKED |
| D-12 | Escrow: STK Push on confirmation, auto-release at 4 hours | Architecture session | LOCKED |
| D-13 | GPS: geo_hash only, raw coordinates never persisted | Architecture session | LOCKED |
| D-14 | GPS clock-in radius: 500m | Architecture session | LOCKED |
| D-15 | Payment Service isolated from Shift Service | Architecture session | LOCKED |
| D-16 | Compliance Engine as discrete Layer 1 API service from Sprint 7 | Architecture session | LOCKED |
| D-17 | All statutory rates in config table, never hardcoded | Architecture session | LOCKED |
| D-18 | AHL toggle via config — currently OFF | Architecture session | LOCKED |
| D-19 | AWS af-south-1 for all data (residency requirement) | Architecture session | LOCKED |
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
| Reboot Pack | Markdown (this document) | Produced | klokd_reboot_pack_v1.md |

### Assets Still Required
- Beta landing page copy and design (klokd.co.ke is live via Cloudflare Pages)
- Investor pitch deck (8–10 slides)
- Financial model (KES — Year 1–3 projections)
- Postman collection (Sprint 3+)
- Prisma schema file (Sprint 3+)
- Worker and Employer app full screen sets (Sprints 8–15)
- WhatsApp notification templates
- Privacy Policy document
- Employment contract template (for Contract Service PDF generation)

---

## 14. Infrastructure

| Item | Status | Notes |
|---|---|---|
| Domain: klokd.co.ke | Live | Cloudflare Pages — beta landing page |
| AWS af-south-1 | Not provisioned | Sprint 1 deliverable |
| RDS PostgreSQL | Not provisioned | Sprint 1 deliverable |
| AWS S3 (af-south-1) | Not provisioned | Sprint 1 deliverable |
| GitHub repository | Not created | Sprint 3 deliverable |
| Railway (backend hosting) | Not provisioned | Sprint 3 deliverable |
| Daraja sandbox | Sprint 1 target | B2C integration required |
| Daraja production keys | Sprint 16 gate | Safaricom application Sprint 1 |
| Africa's Talking (OTP) | Not provisioned | Sprint 3 deliverable |
| FCM / Firebase | Not provisioned | Sprint 6 deliverable |
| WhatsApp Business API | Not provisioned | Sprint 6 deliverable |
| Cloudflare DNS | Active | klokd.co.ke routing |
| ODPC registration | Sprint 1 target | Data Controller + Processor |
| KRA PIN | Sprint 1 target | Required for PAYE setup |
| BRS registration | Sprint 1 target | Company registration |
| NSSF registration | Before beta | Employer registration required |
| SHIF/SHA registration | Before beta | Employer registration required |

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
| Developer TBC | — | Sprint 3 start required |
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

Current status as of Pack v1.0 (March 2026):

**Completed this session:**
- Architecture advisory (three-layer model) — decisions locked
- MVP specification — all 23 sprints, all 387 story points, all acceptance criteria
- Definition of Done (Story / Sprint / Phase / MVP levels)
- Compliance critical path
- Sprint Backlog — interactive HTML artifact
- MVP Spec — .md and .pdf deliverables
- Reboot Pack v1.0 — this document

**Next actions (in priority order):**
1. Engage Kenyan labour law firm — SoW and briefing (Sprint 1 P0)
2. Submit ODPC registration applications — Data Controller + Processor (Sprint 1 P0)
3. Submit KRA PIN application (Sprint 1 P0)
4. Submit BRS company registration (Sprint 1 P0)
5. Submit Safaricom Daraja production access application (Sprint 1)
6. Run employer interview script (20 interviews, Sprint 2)
7. Run worker interview script (30 interviews, Sprint 2)
8. Design Klokd investor pitch deck (8–10 slides, parallel to Phase 0)
9. Build Worker Consent screen (Screen 2 of onboarding — open in next design session)
10. Build Employer WIBA screen (Screen 3 of onboarding — open in next design session)

**Next build sessions suggested:**
- Worker App — remaining screens (Clock-In with GPS ring, Active Shift, Payment Confirmed)
- Employer App — remaining screens (Active monitoring, Clock-Out Confirm)
- Pitch deck — investor narrative, financial projections
- Database schema — ERD design for Sprint 2 review

---

*Klokd · Reboot Pack v1.0 · March 2026*
*A Kirimon Market Ventures Company · klokd.co.ke · @klokdKE*
*Update this document at the end of every session. Version control in filename.*
