# Klokd — MVP Specification, Definition of Done & Sprint Backlog
## Product B · Casual Labour Marketplace · v1.0 · March 2026

**Prepared by:** Chamia Mutuku, Co-Founder & CPO · Kirimon Market Ventures
**Classification:** Confidential · Internal Use Only
**Status:** Living Document — update as Phase 0 progresses

---

## 1. Executive Summary

Klokd is a two-sided M-Pesa Native mobile platform connecting verified casual workers with businesses in hospitality, health, and retail. Workers find shifts near them in seconds. Employers post in under 2 minutes. M-Pesa pays workers within 30 minutes of clock-out. Every shift generates a compliant employment contract. The Compliance Engine enforces WIBA, minimum wage, Section 37 thresholds, and statutory deduction calculations automatically.

**Platform identity:** Klokd is a platform company, not an app. The Worker App and Employer App are Layer 2 clients. The Layer 1 API is the business — callable by any future authenticated client including the Year 2 EOR portal.

**Beachhead:** Nairobi hospitality sector. 50 employers, 200 workers at controlled beta.

---

## 2. Architecture Overview

### Three-layer model

**Layer 1 — Core Platform API (Node.js / Express 5 / TypeScript)**
All business logic lives here. REST API. Multi-tenant from day one (`tenant_id` on all tables). Event-driven shift lifecycle via `ShiftEventLog`. Hosted on AWS af-south-1 (Cape Town). PostgreSQL on RDS. S3 for documents. Services:
- Shift Service
- Payment Service (isolated from shift state — a failed payment never corrupts a shift)
- Compliance Engine (PAYE, NSSF, SHIF, WIBA, Section 37, minimum wage)
- Contract Service (auto-generated per-shift employment contracts)
- Identity Service (ID verification, biometric selfie, ODPC-compliant data handling)
- Notification Service (FCM primary, WhatsApp Business API fallback at 5 min)
- Webhook Service (HMAC-SHA256, retry logic, delivery log — Layer 3 integration point)
- Analytics Event Log (geo_hash not raw GPS, no raw PII, foundation for Year 3 LMI API)

**Layer 2 — Products**
- Worker App (React Native, Android-first)
- Employer App (React Native, Android-first)
- Admin Portal (React web)
- EOR Portal — Year 2, pending legal opinion on employment classification

**Layer 3 — Ecosystem**
- Safaricom Daraja B2C (M-Pesa wage disbursement)
- Per-shift WIBA micro-insurance partner (MVP+ revenue stream)
- KRA/iTax (PAYE remittance)
- Enterprise HR API (Year 2, webhook-based)

### Key architectural decisions (locked)

| Decision | Detail |
|---|---|
| REST API for MVP | GraphQL deferred to Year 2 |
| Multi-tenant schema | `tenant_id` on all tables from Sprint 4 |
| Event-driven shift lifecycle | ShiftEventLog: posted → matched → confirmed → active → completed → disputed → paid |
| Payment decoupled from shift | PaymentService has zero direct dependency on ShiftService |
| Compliance Engine as discrete service | All statutory rates in config, never hardcoded |
| AHL toggle via config | On/off without code deployment (legal status unresolved) |
| Analytics: geo_hash not GPS | DPA 2019 data minimisation compliance |
| AWS af-south-1 | Kenyan data residency requirement |
| Manual matching at MVP | No algorithm — filtered list by proximity, rating, availability |
| GPS clock-in, 500m radius | Offline queue for 3G/low connectivity |
| Escrow model | Employer funds held from confirmation, auto-release 4 hours post clock-out if no dispute |
| Android-first | Worker persona device reality |

---

## 3. MVP Scope

### In scope — Beta (May/June 2026)

**Worker App**
1. Onboarding: Welcome carousel → Privacy & Consent → Verify ID (National ID front/back + selfie) → Skills & Certifications → M-Pesa Setup (5 screens)
2. Home: Stats card (show-up rate, rating, shifts) + available shift feed (proximity-sorted)
3. Shift Detail: Full shift info, employer profile, payment guarantee, contract preview, Accept/Decline
4. Contract Acknowledgement: Auto-generated contract display, explicit acceptance
5. Active Shift — Clock In: GPS radius ring (500m), offline queue indicator
6. Active Shift — In Progress: Timer, employer contact, Clock Out CTA
7. Payment Confirmed: M-Pesa celebration, deduction breakdown, rating prompt, pay statement download
8. Shifts Tab: Upcoming / Active / History with per-shift deduction summary
9. Pay Tab: Monthly aggregation — gross, PAYE, NSSF, SHIF, AHL (if active), net to M-Pesa
10. Profile/Me Tab: Portable reputation, skills on file, Privacy & Data panel (data subject rights)
11. Dispute Flow: Initiate, describe, photo evidence, submit, status tracking

**Employer App**
1. Onboarding: Welcome → Business Verify (KRA PIN) → WIBA & Insurance → M-Pesa Setup (4 screens)
2. Dashboard: Confirmed/pending shift status, Post a Shift CTA
3. Post a Shift: Role / date / time / rate (minimum wage gate + rate intelligence) + Section 37 alert
4. Select Worker: Ranked cards by proximity + rating, show-up rate prominent
5. Active Shift — Monitoring: Worker clocked in, elapsed timer, dispute button
6. Active Shift — Clock-Out Confirm: Confirm hours, release payment or dispute, 4-hour auto-release countdown
7. Shifts Tab: All shifts — completed, active, pending, disputed
8. Team Tab: Saved workers (favourites), one-tap re-hire, blocked workers
9. Pay/Billing Tab: Escrow balance, per-shift spend, transaction history
10. Rating Screen: Post-shift worker rating (1–5 stars + optional text)
11. Dispute Flow: No-show, incomplete shift, conduct issue, evidence upload, status tracking

**Admin Portal**
1. Compliance Configuration: Statutory rate toggles (AHL on/off, PAYE bands, NSSF ceilings, SHIF %) with audit trail
2. Data Subject Request Management: Request log, response tracking, 72-hour ODPC notification workflow
3. Breach Response Panel: Detection log, ODPC notification timer, pre-filled template, status tracking
4. Monthly Compliance Dashboard: PAYE aggregations, NSSF/SHIF summaries, KRA iTax export

**Compliance Engine (Layer 1 — S7-04)**
- `POST /compliance/calculate` — PAYE, NSSF, SHIF, AHL per shift and monthly aggregate
- `GET /compliance/wiba/:shiftId` — Hard gate before clock-in (confirmed or blocked)
- `GET /compliance/section37/:workerEmployerPair` — Alert at threshold approach
- `POST /compliance/minwage/validate` — Block shift posting below applicable minimum
- `POST /compliance/contract/generate` — Auto-generate Employment Act s.9-compliant contract

### Out of scope — MVP (deferred)

| Feature | Rationale |
|---|---|
| Algorithm-based matching | Manual matching sufficient at 50/200 beta cohort |
| GraphQL API | REST sufficient; GraphQL adds complexity before partner demand |
| EOR Portal | Pending legal opinion on employment classification |
| Enterprise HR API | Layer 3, Year 2 |
| Per-shift micro-WIBA | Requires insurance distribution agreement; Option A (employer-held policy) for MVP |
| Labour Market Intelligence API | Year 3 revenue stream |
| Pan-Africa white-label | Year 4+ |
| iOS app | Android-first; iOS in Year 1 post-beta |
| Product A (HR management) | Deferred indefinitely; Product B only |
| AHL deductions | Config-off pending legal opinion on enforceability |
| MFI micro-loan integration | Year 2 |

---

## 4. Definition of Done

### Story-level DoD (applies to every user story)

A story is Done when ALL of the following are true:

- [ ] All acceptance criteria pass
- [ ] Unit tests written and passing (coverage ≥ 80% for service layer)
- [ ] Integration test written and passing
- [ ] No TypeScript errors (`tsc --noEmit` clean)
- [ ] ESLint passes with zero warnings
- [ ] API endpoint documented (if applicable)
- [ ] Error states handled — no unhandled promise rejections
- [ ] Mobile screens reviewed at 360px and 390px viewport widths
- [ ] Accessibility: touch targets ≥ 44px, sufficient colour contrast
- [ ] Sensitive data (National ID, M-Pesa number, GPS) handled per DPA 2019 requirements
- [ ] Story status updated to Done in Trello

### Sprint-level DoD

A sprint is Done when ALL of the following are true:

- [ ] All committed stories meet story-level DoD
- [ ] Sprint review conducted — both founders present
- [ ] All API endpoints deployed to staging environment
- [ ] Staging smoke test passing (Postman collection executed)
- [ ] No P0 or P1 bugs open
- [ ] Sprint retrospective completed, action items logged
- [ ] Reboot Pack updated with any new decisions
- [ ] Risk register reviewed — any triggered risks escalated

### Phase-level DoD

A phase is Done when ALL of the following are true:

- [ ] All sprints in phase meet sprint-level DoD
- [ ] Phase deliverables demonstrated to at least one external stakeholder
- [ ] Legal/compliance dependencies for next phase confirmed (e.g. WIBA option confirmed before Phase 3)
- [ ] Infrastructure costs reviewed against budget
- [ ] Investor update prepared and sent if phase is a major milestone

### MVP DoD (Beta-ready)

The MVP is Beta-ready when ALL of the following are true:

- [ ] All Phase 0–7 sprints meet sprint-level DoD
- [ ] 50 employers onboarded and using the Employer App
- [ ] 200 workers verified and active on the Worker App
- [ ] End-to-end shift flow tested: post → match → clock-in → clock-out → M-Pesa payment → rating
- [ ] Compliance Engine: WIBA hard gate confirmed blocking clock-in on uncovered shifts
- [ ] Compliance Engine: Minimum wage gate confirmed blocking below-minimum shift postings
- [ ] Compliance Engine: Section 37 alert triggering correctly at threshold
- [ ] Payment: Daraja B2C production keys active, test disbursement to real M-Pesa number successful
- [ ] Escrow: Auto-release confirmed firing at 4 hours post clock-out
- [ ] Dispute: At least one end-to-end dispute resolved in test
- [ ] DPA compliance: ODPC registered (both Data Controller and Data Processor)
- [ ] DPA compliance: Privacy Policy published on platform
- [ ] DPA compliance: DPAs executed with AWS, Safaricom, WhatsApp Business, Africa's Talking
- [ ] Data residency: All data confirmed in AWS af-south-1 only
- [ ] Security: TLS 1.2 minimum on all endpoints, ID documents encrypted at rest in S3
- [ ] Performance: API P95 response time < 500ms under 80 concurrent users
- [ ] Load test: Sustained 80 concurrent users for 30 minutes with no errors
- [ ] Legal opinion received and incorporated into compliance architecture
- [ ] KRA PIN obtained, PAYE filing setup on iTax
- [ ] NSSF registration complete
- [ ] SHIF registration complete (SHA)

---

## 5. Sprint Backlog

**Sprint format:** 2 weeks · Team: Chamia (CPO/PO) + 2 developers (to confirm) + part-time designer (from Sprint 11)
**Story point scale:** XS=1, S=2, M=3, L=5, XL=8
**Total sprints:** 23 · Total duration: 46 weeks

---

### PHASE 0 — VALIDATION & LEGAL FOUNDATION
**Objective:** Confirm market, secure legal opinion, stand up infrastructure, recruit beta cohort.
**Exit criteria:** Legal opinion received · 20 employer + 30 worker interviews complete · All P0 compliance actions initiated

---

#### Sprint 1 — Weeks 1–2

**Objectives:** Legal counsel engaged · Infrastructure stood up · Investor outreach initiated · Interview scripts live

| ID | Story | Points | AC |
|---|---|---|---|
| S1-01 | As Chamia, I need a Kenyan labour law firm engaged so that legal opinion on PAYE/NSSF/WIBA/entity classification is obtained | 2 | SoW signed · Briefing session complete · Opinion deadline agreed (end of Week 4) |
| S1-02 | As the team, we need AWS environments so that development can begin | 3 | Dev / staging / production accounts created in af-south-1 · RDS PostgreSQL instances provisioned · S3 buckets created with encryption at rest |
| S1-03 | As Chamia, I need Daraja B2C sandbox integration complete so that payment flows can be tested | 3 | Sandbox credentials active · B2C initiation call succeeds · All failure scenarios documented (insufficient funds, invalid number, timeout) |
| S1-04 | As Chamia, I need Safaricom production access application submitted so that we can pay workers at beta | 1 | Application submitted · Reference number filed |
| S1-05 | As Ivy, I need employer interview scripts finalised so that Phase 0 validation can begin | 2 | Script covers: current staffing pain points, WhatsApp reliance, payment timing, willingness to pay 4% · Pilot-tested with 1 contact |
| S1-06 | As Ivy, I need worker interview scripts finalised so that worker-side validation can begin | 2 | Script covers: income reliability, ID concerns, M-Pesa trust, shift discovery, competing platforms |
| S1-07 | As Chamia, I need the investor pack confirmed final and Wave 1 outreach sent so that pre-seed conversations begin | 2 | Pack reviewed · 10+ investors contacted (Savannah Fund, Kepple, Safaricom Spark Fund priority) |
| S1-08 | As the team, we need ODPC registration applications submitted so that data collection is legally permitted | 2 | Data Controller application submitted · Data Processor application submitted · Reference numbers filed |
| S1-09 | As Chamia, I need KRA PIN application submitted so that PAYE filing capability exists | 1 | Application submitted · Reference number filed |
| S1-10 | As Chamia, I need BRS company registration submitted so that the legal entity is formalised | 1 | Application submitted · Certificate expected within 7 days |

**Sprint 1 total:** 19 points

---

#### Sprint 2 — Weeks 3–4

**Objectives:** 20 employer + 30 worker interviews complete · Legal opinion received · Daraja production in process · ODPC confirmed

| ID | Story | Points | AC |
|---|---|---|---|
| S2-01 | As Ivy, I need 20 employer in-person interviews completed so that demand is validated | 5 | 20 interviews complete in Nairobi hospitality · Findings documented · At least 10 express willingness to use platform |
| S2-02 | As Ivy, I need 30 worker in-person interviews completed so that supply-side is validated | 5 | 30 interviews complete · Findings documented · At least 20 express willingness to join platform |
| S2-03 | As Chamia, I need the legal opinion received and reviewed so that compliance architecture is confirmed | 3 | Written opinion received · PAYE/NSSF/WIBA positions confirmed · AHL enforceability status confirmed · EOR classification confirmed |
| S2-04 | As Chamia, I need WIBA coverage option selected so that clock-in gate architecture is finalised | 2 | Option A (employer-held policy) confirmed for MVP · WIBA declaration flow designed · Insurance partner scoped for Option B |
| S2-05 | As the team, I need the base database schema designed so that Sprint 3 build can begin | 3 | ERD reviewed and approved · Tables: users, workers, employers, shifts, shift_events, contracts, payments, compliance_records, audit_log · tenant_id on all tables |
| S2-06 | As Chamia, I need the AHL enforceability status confirmed so that the Compliance Engine toggle is correctly configured | 2 | Legal counsel confirms current status · Toggle set appropriately in config · Decision documented in Reboot Pack |
| S2-07 | As the team, I need minimum wage schedules obtained for hospitality, health, and retail so that the validation gate can be built | 2 | Current schedules obtained from Ministry of Labour · Staged in config table (not hardcoded) · Update mechanism documented |

**Sprint 2 total:** 22 points

---

### PHASE 1 — CORE PLATFORM API
**Objective:** All Layer 1 services scaffolded and tested. Database schema live. Authentication working.
**Exit criteria:** Postman collection for all core endpoints passing on staging · No P0 bugs

---

#### Sprint 3 — Weeks 5–6

**Objectives:** Authentication · Identity Service · Database live

| ID | Story | Points | AC |
|---|---|---|---|
| S3-01 | As a developer, I need the project scaffold complete so that the team can begin parallel development | 3 | Express 5/TypeScript monorepo · ESLint + Prettier configured · Jest configured · GitHub repo with branch protection · CI/CD pipeline (GitHub Actions → AWS staging) |
| S3-02 | As a user, I need to register and authenticate so that I can access the platform securely | 5 | JWT auth with refresh tokens · Role-based: worker, employer, admin · Phone number + OTP via Africa's Talking · OTP expires in 5 minutes · Rate limiting: 3 attempts per 10 minutes |
| S3-03 | As a worker, I need to submit my National ID for verification so that employers trust me | 5 | `POST /identity/verify/id` — accepts front/back images · Images encrypted and stored in S3 (af-south-1) · Verification status: pending/approved/rejected · Selfie liveness check API called · National ID number hashed in DB (not stored in plaintext) |
| S3-04 | As the platform, I need an audit log on all sensitive operations so that DPA compliance is maintained | 3 | `audit_log` table: user_id, action, timestamp, ip_hash · Covers: identity submission, payment initiation, data access, admin config changes · Log is append-only (no deletes) |
| S3-05 | As a developer, I need the ShiftEventLog implemented so that all shift state transitions are tracked | 3 | `shift_events` table: shift_id, from_state, to_state, actor_id, timestamp, metadata · All transitions emit to ShiftEventLog · Foundation for compliance, webhooks, analytics |

**Sprint 3 total:** 19 points

---

#### Sprint 4 — Weeks 7–8

**Objectives:** Shift Service · Employer posting flow · Worker profile

| ID | Story | Points | AC |
|---|---|---|---|
| S4-01 | As an employer, I need to create a shift so that workers can apply | 5 | `POST /shifts` — role, date, start/end time, rate, location (lat/lng), description · Validates: role is in approved list, date is future, rate > 0 · Returns shift_id · Status: posted |
| S4-02 | As the platform, I need minimum wage validation on shift creation so that illegal shifts are blocked | 3 | Rate compared against config table entry for sector + location · Below minimum: 422 response with minimum wage value and sector · At or above minimum: shift created normally |
| S4-03 | As a worker, I need to complete my profile so that employers can evaluate me | 3 | `PUT /workers/profile` — skills (array), certifications (file refs), availability (days/times) · Profile completeness score calculated · Incomplete profiles cannot apply for shifts |
| S4-04 | As an employer, I need to complete my business profile so that workers trust me | 3 | `PUT /employers/profile` — business name, KRA PIN, contact, WIBA policy reference + insurer + expiry · WIBA fields mandatory before first shift can be posted |
| S4-05 | As a worker, I need to see available shifts near me so that I can find work today | 5 | `GET /shifts/available` — filter by lat/lng radius (default 5km), role, date · Returns shifts sorted by distance ascending · Each shift includes employer rating, shift count, distance |
| S4-06 | As a worker, I need to apply for a shift so that the employer can select me | 2 | `POST /shifts/:id/apply` · Worker must be verified (identity status = approved) · Worker cannot apply if already confirmed on overlapping shift · Application status: pending |

**Sprint 4 total:** 21 points

---

#### Sprint 5 — Weeks 9–10

**Objectives:** Worker matching · Employer selection · Shift confirmation

| ID | Story | Points | AC |
|---|---|---|---|
| S5-01 | As an employer, I need to see matched workers for my shift so that I can select the best candidate | 5 | `GET /shifts/:id/applicants` — returns workers sorted by: distance ASC, rating DESC, show-up rate DESC · Each worker card: name (first + last initial), show-up rate, rating (if ≥ 3 shifts), distance, skills, certifications |
| S5-02 | As an employer, I need to select a worker so that the shift is confirmed | 3 | `POST /shifts/:id/confirm` — worker_id required · Shift status: confirmed · Worker notified (FCM + WhatsApp fallback) · Other applicants notified shift is filled · ShiftEventLog: posted → confirmed |
| S5-03 | As a worker, I need to accept a confirmed shift so that both sides are committed | 3 | `POST /shifts/:id/accept` · Worker status on shift: accepted · Employer notified · Contract generation triggered (Contract Service) · ShiftEventLog: confirmed → accepted |
| S5-04 | As the platform, I need escrow funding initiated on shift confirmation so that payment is guaranteed | 5 | `POST /payments/escrow/fund` called on shift confirmation · Employer M-Pesa STK Push initiated for shift amount + 4% fee · Funds held in platform escrow record · Shift blocked from clock-in until escrow confirmed funded |
| S5-05 | As a worker or employer, I need a Section 37 alert when a worker-employer pairing approaches the 1-month threshold so that automatic contract conversion is prevented | 3 | `GET /compliance/section37/:workerId/:employerId` · Counts consecutive calendar days of engagement · Alert at 20 days: warning returned in shift confirmation response · Alert at 25 days: hard warning, requires explicit acknowledgement to proceed · At 30 days: shift confirmation blocked |

**Sprint 5 total:** 19 points

---

#### Sprint 6 — Weeks 11–12

**Objectives:** GPS clock-in · Notifications · Clock-out · Dispute initiation

| ID | Story | Points | AC |
|---|---|---|---|
| S6-01 | As a worker, I need to clock in via GPS so that the platform confirms I am at the venue | 5 | `POST /shifts/:id/clockin` — requires lat/lng · Validates: within 500m of shift location · If outside radius: 422 with distance and venue address · Offline: request queued in local storage, replayed when connectivity restored · WIBA gate called before clock-in is permitted · GPS coordinates hashed (geo_hash) before storage — raw coordinates not persisted |
| S6-02 | As the platform, I need WIBA confirmation before every clock-in so that legal liability is managed | 3 | `GET /compliance/wiba/:shiftId` called by clock-in endpoint · WIBA confirmed: proceed · WIBA not confirmed (policy expired, not declared, or not verified): 403 with reason · Reason surfaced to both worker and employer apps |
| S6-03 | As a worker, I need to clock out so that payment is triggered | 3 | `POST /shifts/:id/clockout` · Records clock-out timestamp · Shift status: completed · Employer notified for confirmation · ShiftEventLog: active → completed · Auto-release timer started (4 hours) |
| S6-04 | As the platform, I need FCM push notifications with WhatsApp fallback so that users are always reached | 5 | FCM primary: shift matched, shift reminder (1hr before), payment sent, rating received, dispute update · WhatsApp Business API fallback: if push not acknowledged in 5 minutes · WhatsApp templates: plain language, no jargon, bilingual (Swahili/English where appropriate) · All notification events logged in notification_log |
| S6-05 | As a worker or employer, I need to initiate a dispute so that shift issues are formally recorded | 3 | `POST /disputes` — shift_id, type (no-show/incomplete/conduct/payment), description, optional photo evidence · Dispute status: open · Auto-release timer paused on dispute creation · Both parties notified · Admin notified for manual resolution |

**Sprint 6 total:** 19 points

---

### PHASE 2 — COMPLIANCE ENGINE & CONTRACTS
**Objective:** All statutory compliance logic live as discrete Layer 1 services. Clean API surface callable by all future Layer 2 clients including the Year 2 EOR portal.
**Exit criteria:** All compliance endpoints tested · WIBA gate integration tested · Minimum wage gate integration tested · Contract generation producing Employment Act s.9-compliant output

---

#### Sprint 7 — Weeks 13–14

**Objectives:** Compliance Engine · Contract Service · Webhook Service · Analytics Event Log

| ID | Story | Points | AC |
|---|---|---|---|
| S7-01 | As the Compliance Engine, I need to calculate PAYE per shift and monthly aggregate so that deduction obligations are met | 5 | `POST /compliance/calculate/paye` — accepts gross_amount, month_aggregate · Applies 2025/2026 bands from config · Returns: taxable_income, paye_deduction, net_pay · Personal relief (KES 2,400/month) applied · All rates in config table (never hardcoded) |
| S7-02 | As the Compliance Engine, I need to calculate NSSF Tier I and Tier II contributions so that social insurance obligations are met | 3 | Monthly aggregation across all shifts per worker · Tier I: 6% up to KES 480 each party · Tier II: 6% on KES 8,001–72,000 band · Ceiling enforced — no over-deduction · Returns: tier_i_deduction, tier_ii_deduction, employer_contribution |
| S7-03 | As the Compliance Engine, I need to calculate SHIF contributions so that social health insurance obligations are met | 3 | 2.75% of gross monthly earnings · Minimum KES 300/month enforced · Monthly aggregation across shifts · Returns: shif_deduction, month_gross |
| S7-04 | As the Compliance Engine, I need an AHL toggle so that the levy can be switched on/off without a code deployment | 2 | `ahl_enabled` in compliance_config table · When disabled: AHL calculations return zero with reason: "AHL suspended — see compliance advisory" · When enabled: 1.5% employee + 1.5% employer · Toggle change writes to audit_log with actor_id and timestamp |
| S7-05 | As the Compliance Engine, I need to validate minimum wages so that illegal shifts are blocked at posting | 2 | `POST /compliance/minwage/validate` — accepts sector, location, proposed_rate · Returns: valid (true/false), minimum_wage, sector, source · Minimum wage data in config table, updatable without code deployment |
| S7-06 | As the Contract Service, I need to auto-generate an Employment Act s.9-compliant contract per shift so that the written contract obligation is met | 5 | `POST /contracts/generate` — shift_id triggers contract creation · Contract includes: employer full name + address, worker full name, nature of work, place of work, date, rate, hours, WIBA coverage confirmation · Stored as PDF in S3 (7-year retention enforced) · Worker and employer digital acceptance recorded with timestamp · Contract URL returned for in-app display |
| S7-07 | As the platform, I need a Webhook Service so that Layer 3 partners can receive real-time shift events | 3 | `WebhookSubscription` model: endpoint_url, event_types (array), secret · HMAC-SHA256 signing on all payloads · Retry logic: 3 attempts, exponential backoff · `WebhookDeliveryLog`: delivery status, response code, timestamp · Events: shift.confirmed, shift.completed, payment.disbursed, dispute.opened |
| S7-08 | As the platform, I need an Analytics Event Log so that Labour Market Intelligence data is captured from day one | 2 | All platform events logged: event_type, geo_hash (not raw GPS), tenant_id, timestamp · No raw PII in event log · Retention: indefinite (aggregated, anonymised) · Foundation for Year 3 LMI API |
| S7-09 | As the platform, I need a NITA levy calculation so that the KES 50/employee/month obligation is met | 1 | `nita_levy` in compliance calculation response · KES 50 per worker per month · Monthly aggregation enforced (not per-shift) |

**Sprint 7 total:** 26 points

---

### PHASE 3 — WORKER APP MVP
**Objective:** Complete Worker App from onboarding through payment confirmation. Android-first. Design system applied from brand guide.
**Exit criteria:** End-to-end worker flow tested on physical Android device · All 5 onboarding screens complete · Shift acceptance, clock-in, clock-out, payment all working on staging

---

#### Sprint 8 — Weeks 15–16

**Objectives:** Worker onboarding — all 5 screens

| ID | Story | Points | AC |
|---|---|---|---|
| S8-01 | As Akinyi, I need a compelling Welcome screen so that I understand what Klokd offers before registering | 3 | 3-slide auto-advancing carousel (3.4s interval, manual dot nav) · Slides: "Verified once. Work everywhere." / "Shifts near you. Apply in seconds." / "Clock out. M-Pesa pays you." · Electric Mint/Volt gradient CTA: "Get started" · "Sign in" secondary link · Dark shell (ink background) |
| S8-02 | As Akinyi, I need a Privacy & Consent screen so that I know exactly what data is collected before I share anything | 5 | Lists: National ID (front/back), selfie, GPS (clock-in only), M-Pesa number, shift history · States: why collected, how long kept, who sees it · Employer visibility: name and rating only — not ID number or M-Pesa · Two explicit consent toggles: identity data + GPS (both required) · DPA 2019 explicit consent requirement met for biometric data · "By continuing, you agree to our Privacy Policy" with active link |
| S8-03 | As Akinyi, I need to verify my National ID so that employers trust me and I earn the Verified badge | 5 | Verified badge preview shown before upload starts · Three upload zones: National ID front, National ID back, selfie · Each zone: idle (dashed border) → uploaded (mint border, checkmark) · All three required before Continue is enabled · "We verify everyone so you're always working somewhere safe" framing · Images transmitted encrypted, stored in S3 with 3-year retention tag |
| S8-04 | As Akinyi, I need to select my skills and upload certifications so that I only see matching shifts | 3 | Role chips: Waiter, Barista, Chef, Cashier, Security, Cleaner, Receptionist, Bartender, + More · At least one chip required before Continue is enabled · Optional certificate upload: expandable section, PDF or photo, max 5MB · Certificates stored in S3, linked to worker profile |
| S8-05 | As Akinyi, I need to enter my M-Pesa number so that I get paid after every shift | 5 | Custom numpad (not system keyboard) · Phone number displays formatted in real time: 0722 400 500 · 30-minute guarantee messaging: "KES lands in your M-Pesa after every clock-out" · Number displayed in payment guarantee strip once confirmed · M-Pesa number encrypted at rest · "I'm ready to work" CTA active when 10 digits entered |

**Sprint 8 total:** 21 points

---

#### Sprint 9 — Weeks 17–18

**Objectives:** Home screen · Shift Detail · Contract acknowledgement · Accept/Decline

| ID | Story | Points | AC |
|---|---|---|---|
| S9-01 | As Akinyi, I need a Home screen that shows my stats and available shifts so that I can find work fast | 5 | Stats card: show-up rate %, rating (if ≥ 3 shifts), total shifts · Available shifts feed: sorted by proximity, each card shows role, venue, pay (electric mint), date/time pill, distance pill · Highlighted card: border active (mint), others subdued (progressive opacity) · Bottom nav: Home (active), Shifts, Pay, Me · Shift cards tappable → Shift Detail |
| S9-02 | As Akinyi, I need a Shift Detail screen so that I have all information before accepting | 5 | Full shift info: role, venue, date, time, distance, earnings (large, mint) · Employer section: name, shifts posted count, employer rating · Payment guarantee strip: "M-Pesa to [masked number] within 30 min of shift end" · Contract preview link · Accept shift (gradient CTA) · Decline (ghost, subdued) |
| S9-03 | As Akinyi, I need to review and acknowledge the employment contract before accepting a shift so that the contract obligation is met | 5 | Contract screen displays: role, employer name + address, my name + ID number (last 4 digits masked), date, hours, rate, WIBA coverage status · Explicit: "I agree to the terms of this engagement" with checkbox · Checkbox required before Accept is enabled · Acknowledgement timestamp recorded · "Save as PDF" action available |
| S9-04 | As Akinyi, I need to receive notifications when a shift is confirmed, one hour before it starts, and when I'm paid so that I never miss a shift or a payment | 3 | FCM: shift confirmed, 1hr reminder, payment sent, rating received · WhatsApp fallback template (if push not acknowledged in 5 min): "Klokd: [role] at [venue] confirmed for [date]. Show up by [time]. — Asante!" · All notifications received on staging test device |

**Sprint 9 total:** 18 points

---

#### Sprint 10 — Weeks 19–20

**Objectives:** Clock-In · Active Shift · Clock-Out · Payment Confirmed

| ID | Story | Points | AC |
|---|---|---|---|
| S10-01 | As Akinyi, I need a Clock-In screen so that I can confirm I've arrived at the venue | 8 | GPS radius ring animation: locating… → within 500m (green) → outside range (red with distance) · Large Clock In CTA — disabled until within range · Venue address displayed · WIBA status indicator: confirmed (green checkmark) or blocked (red with reason and contact employer link) · Offline state: "Low signal — request queued" with explanation · Clock-in time recorded, shift status: active |
| S10-02 | As Akinyi, I need an Active Shift screen so that I know my shift is live and I can clock out | 3 | Live elapsed timer (HH:MM:SS) · Role and venue displayed · Employer contact (WhatsApp link) · Clock Out CTA (prominent, requires confirmation tap: "Are you sure? KES [amount] will be released.") · Dispute button (small, visible but not prominent) |
| S10-03 | As Akinyi, I need a Payment Confirmed screen so that I know my money is on its way | 5 | Success state: gradient circle with checkmark · "Paid!" headline · KES amount (large, mint, Black weight) · "Sent to M-Pesa · [masked number]" · Deduction breakdown: gross, PAYE, NSSF, SHIF, net to M-Pesa · Pay statement download (PDF) · Rating prompt for employer (1–5 stars) · "See open shifts" CTA |

**Sprint 10 total:** 16 points

---

#### Sprint 11 — Weeks 21–22

**Objectives:** Shifts Tab · Pay Tab · Profile/Me Tab · Dispute Flow

| ID | Story | Points | AC |
|---|---|---|---|
| S11-01 | As Akinyi, I need a Shifts Tab so that I can see all my upcoming, active, and past shifts | 3 | Three sections: Upcoming / Active / History · History entry: date, role, venue, KES net, status pill · History is read-only — 7-year retention enforced (no delete option) · "Your payment history is kept for 7 years as required by Kenyan law" notice |
| S11-02 | As Akinyi, I need a Pay Tab showing monthly earnings and deductions so that I understand my take-home | 5 | "This month" summary card: shifts completed, total earned, total deducted, net received · Monthly aggregation: gross → PAYE → NSSF → SHIF → net · AHL line: shown as KES 0 with "(suspended)" if toggle off · Per-shift entries with M-Pesa transaction ID · Date range filter |
| S11-03 | As Akinyi, I need a Profile/Me Tab showing my portable reputation so that I can manage my career on Klokd | 3 | Show-up rate (large), rating (if ≥ 3 shifts), total shifts, badges · Skills on file, certifications, documents · Edit details · Privacy & Data panel: download my data, correct my information, delete my account, manage consent · All data subject rights exposed as real functional actions (not links to email) |
| S11-04 | As Akinyi, I need to raise a dispute so that issues are formally recorded and resolved | 3 | Dispute type: payment not received / shift cancelled without notice / unsafe conditions / other · Free text description · Optional photo evidence (max 3 images) · Submit → "Your dispute has been logged. Reference: [ID]. We'll respond within 24 hours." · Status tracking in Shifts Tab |

**Sprint 11 total:** 14 points

---

### PHASE 4 — EMPLOYER APP MVP
**Objective:** Complete Employer App from onboarding through shift completion. Light shell. WIBA capture in onboarding.
**Exit criteria:** End-to-end employer flow tested · WIBA onboarding screen complete · Minimum wage gate tested · Section 37 alert tested

---

#### Sprint 12 — Weeks 23–24

**Objectives:** Employer onboarding — all 4 screens

| ID | Story | Points | AC |
|---|---|---|---|
| S12-01 | As The Brew Bistro manager, I need a Welcome screen so that I understand the Klokd value proposition immediately | 3 | "For Business" pill in header · "Your staff, sorted." headline · Three value prop cards: "Post in 2 minutes" / "Verified workers near you" / "Pay only on completion" · Light shell (mist background) · "Set up your account" gradient CTA |
| S12-02 | As The Brew Bistro manager, I need to verify my business so that I can post shifts and access escrow | 5 | Business name field · KRA PIN field (11-character validation) · Contact person name · Escrow explainer: 3-step inline card — "You pre-fund" → "Klokd holds" → "Worker paid" · Continue enabled when all fields validated · KRA PIN format validated (letter + 9 digits + letter) |
| S12-03 | As The Brew Bistro manager, I need to declare WIBA coverage so that my workers can legally clock in | 5 | WIBA policy reference number field · Insurer name field · Policy expiry date picker · "No policy?" → "Coming soon: Klokd per-shift cover" (primes Option B) · Continue enabled when all three WIBA fields completed · WIBA data stored and linked to employer profile · Validation: expiry must be future date |
| S12-04 | As The Brew Bistro manager, I need to set up M-Pesa payment so that workers can be paid from my account | 5 | Three payment methods: Paybill / Till Number / Personal M-Pesa · Radio selection — tap to switch · Account number displayed and editable per method · 3-step escrow visual: "You fund → Klokd holds → Worker paid" with connecting line · "Activate my account" CTA → success state: "You're live." · "4% per completed shift · No monthly fees · No lock-in" footer |

**Sprint 12 total:** 18 points

---

#### Sprint 13 — Weeks 25–26

**Objectives:** Dashboard · Post a Shift · Section 37 alert · Rate intelligence

| ID | Story | Points | AC |
|---|---|---|---|
| S13-01 | As The Brew Bistro manager, I need a Dashboard so that I see my staffing situation in one second | 3 | Shift status summary: confirmed (count), pending (count), completed (this week) · "Post a shift" gradient CTA (prominent) · Upcoming shifts list: role, time, worker name/rating if confirmed, status dot · Bottom nav: Home, Shifts, Pay, Team |
| S13-02 | As The Brew Bistro manager, I need to post a shift in under 2 minutes so that I can staff an urgent gap | 8 | Role selector chips: Waiter, Barista, Chef, Cashier, + More · Date: Today / Tomorrow / Date picker · Time: start / end time pickers · Rate: stepper (KES) + rate intelligence strip: "KES [min]–[max] for [role] in [area]" · Minimum wage gate: rate below minimum → CTA disabled, "Adjust to continue. Minimum for [role] in [location]: KES [amount]" · All fields required before "Find workers" CTA enabled |
| S13-03 | As The Brew Bistro manager, I need a Section 37 alert when a worker-employer pairing is near the threshold so that I avoid automatic contract conversion | 3 | Alert displayed inline during shift posting if a saved/recent worker is being considered · Yellow advisory card: "Akinyi K. has worked 22 of the last 28 days with you. More shifts may trigger a contract conversion obligation. Continue?" · At 25 days: "Continue" requires explicit acknowledgement · At 30 days: worker blocked for this employer; admin notified |
| S13-04 | As The Brew Bistro manager, I need to see matched workers so that I select the right person fast | 5 | Worker cards sorted: proximity ASC, rating DESC, show-up rate DESC · Each card: avatar (initials), name, shifts count, show-up rate (large, prominent — primary employer anxiety), rating, distance · Skills chips, certifications · Top card visually dominant (full opacity gradient CTA) · Others progressively subdued · "Select [name]" CTA triggers shift confirmation flow |

**Sprint 13 total:** 19 points

---

#### Sprint 14 — Weeks 27–28

**Objectives:** Active shift monitoring · Clock-out confirmation · Rating · Dispute

| ID | Story | Points | AC |
|---|---|---|---|
| S14-01 | As The Brew Bistro manager, I need an Active Shift monitoring screen so that I know the shift is live | 3 | Worker clocked in confirmation · Elapsed timer · Worker name, rating, contact link · Venue map pin · Dispute button (visible, bottom corner — not prominent) |
| S14-02 | As The Brew Bistro manager, I need to confirm the shift is complete so that payment is released | 5 | "Akinyi clocked out [duration] ago. Release KES [amount] or raise a dispute?" · Release Payment: gradient CTA (default, easy) · Raise Dispute: ghost button (intentional friction) · 4-hour auto-release countdown displayed · Payment release triggers Daraja B2C disbursement · ShiftEventLog: completed → paid |
| S14-03 | As The Brew Bistro manager, I need to rate the worker after the shift so that the reputation system is maintained | 3 | 1–5 star selector + optional short text · Appears after payment released · Submit → "Thank you. Rating submitted." · Rating visible on worker profile after 3 minimum (aggregate only) |
| S14-04 | As The Brew Bistro manager, I need to raise a dispute so that issues are formally recorded | 3 | Dispute type: no-show / incomplete shift / conduct issue / other · Description field · Photo evidence upload (max 3) · Submit → dispute reference logged · Auto-release paused · Admin notified |

**Sprint 14 total:** 14 points

---

#### Sprint 15 — Weeks 29–30

**Objectives:** Shifts Tab · Team Tab · Pay/Billing Tab

| ID | Story | Points | AC |
|---|---|---|---|
| S15-01 | As The Brew Bistro manager, I need a Shifts Tab so that I have a complete record of all shifts | 3 | All shifts: completed, active, pending, disputed · Filter by: role, date, worker, status · Each entry: role, date, worker name/rating, status pill, amount |
| S15-02 | As The Brew Bistro manager, I need a Team Tab so that I can re-hire reliable workers fast | 5 | Saved workers (favourites): one-tap re-hire initiates shift posting pre-filled with that worker · Blocked workers: cannot appear in match results · "Save" and "Block" actions on worker profile page · This is the key retention mechanic — employers who build a roster stay on platform |
| S15-03 | As The Brew Bistro manager, I need a Pay/Billing Tab so that I can track my platform spend | 3 | Escrow balance (current) · Total spend this month · Per-shift entries: role, date, worker, gross + 4% fee, M-Pesa confirmation number · Export to CSV |

**Sprint 15 total:** 11 points

---

### PHASE 5 — PAYMENT & ESCROW
**Objective:** Production-grade payment flow. Daraja B2C production keys active. Escrow auto-release tested end-to-end. Pay statement generation.
**Exit criteria:** Real KES disbursed to real M-Pesa number in production · Auto-release tested · Dispute pausing tested

---

#### Sprint 16 — Weeks 31–32

**Objectives:** Daraja B2C production integration · Escrow funding

| ID | Story | Points | AC |
|---|---|---|---|
| S16-01 | As the Payment Service, I need Daraja B2C production integration so that real M-Pesa payments can be disbursed | 8 | Production consumer key and secret configured · `B2CPayment` model: shift_id, worker_mpesa, amount, fee, status, daraja_reference · All states handled: Success, Failed, Timeout · Failed: retry once after 60s, then alert admin · Timeout: treat as failed · All transactions logged with Daraja reference |
| S16-02 | As the Payment Service, I need escrow funding via STK Push so that employer funds are held before shift begins | 5 | STK Push initiated on shift confirmation · Employer receives M-Pesa prompt · Funding confirmed: escrow_status = funded · Funding declined or timeout: shift reverts to posted, employer notified · Escrow record: shift_id, employer_id, amount, fee, status, funded_at |
| S16-03 | As the Payment Service, I need deductions calculated and applied before disbursement so that the worker receives the correct net amount | 5 | Compliance Engine called before disbursement · PAYE, NSSF, SHIF deducted from gross · Deduction record created per shift · Net amount = gross - sum(deductions) · Worker receives net via Daraja B2C · Deduction breakdown stored for Pay Tab display |

**Sprint 16 total:** 18 points

---

#### Sprint 17 — Weeks 33–34

**Objectives:** Pay statement generation · 7-year retention · Disbursement confirmation

| ID | Story | Points | AC |
|---|---|---|---|
| S17-01 | As Akinyi, I need a pay statement after every shift so that the Employment Act pay statement obligation is met | 5 | PDF generated per shift: employer name, worker name, date, role, hours, gross, deductions itemised, net, M-Pesa transaction reference · Stored in S3 with 7-year retention tag · Downloadable from Payment Confirmed screen and Shifts Tab · Shareable via WhatsApp (pre-formatted share intent) |
| S17-02 | As the platform, I need 7-year payment record retention enforced so that KRA and Employment Act requirements are met | 3 | S3 object lifecycle policy: payment records + contracts → 7 years before deletion · Database records: payment entries have `retain_until` field set to created_at + 7 years · Delete account flow: profile data deleted, payment records retained with notice: "Your payment records are retained for 7 years as required by Kenyan law" |
| S17-03 | As the Payment Service, I need auto-release implemented so that workers are paid even when employers don't respond | 3 | 4-hour timer started on clock-out confirmation · Timer paused if dispute opened · Timer resumes if dispute closed without action · At timer expiry: Daraja B2C disbursement initiated automatically · Employer notified: "Payment of KES [amount] auto-released to Akinyi K. after 4 hours." |

**Sprint 17 total:** 11 points

---

#### Sprint 18 — Weeks 35–36

**Objectives:** Payment failure handling · Dispute resolution · Reconciliation

| ID | Story | Points | AC |
|---|---|---|---|
| S18-01 | As the Payment Service, I need payment failure handling so that workers are never left unpaid | 5 | Failure types: Daraja timeout, insufficient employer funds, network error · All failures: admin immediately notified · Worker notified: "Payment delayed — we're resolving this now" · Retry mechanism: 3 attempts, 60s interval · Manual release available via Admin Portal after 3 failures |
| S18-02 | As the Admin, I need a dispute resolution workflow so that disputes are resolved fairly and quickly | 5 | Admin sees: dispute details, both parties' accounts, evidence, shift history · Resolution options: release payment, partial payment, reverse escrow, escalate · Resolution logged with admin_id, reason, timestamp · Both parties notified of resolution |
| S18-03 | As the platform, I need a monthly payment reconciliation so that platform fees are correctly accounted | 3 | Monthly reconciliation job (1st of month) · Total disbursed, total fees collected, total PAYE deducted, net platform revenue · Reconciliation report available in Admin Portal |

**Sprint 18 total:** 13 points

---

### PHASE 6 — ADMIN PORTAL & COMPLIANCE OPERATIONS
**Objective:** Admin Portal operational. Compliance configuration live. Data subject rights workflow implemented. Breach response documented and tooled.
**Exit criteria:** All statutory rate toggles tested · Data subject request workflow tested end-to-end · ODPC notification template verified

---

#### Sprint 19 — Weeks 37–38

**Objectives:** Admin Portal — Compliance Configuration · Monthly dashboards

| ID | Story | Points | AC |
|---|---|---|---|
| S19-01 | As Chamia, I need a Compliance Configuration panel so that statutory rates can be updated without code deployment | 5 | Toggles: AHL on/off, PAYE band configuration, NSSF ceilings, SHIF percentage · Each change: requires confirmation dialog ("You are changing a statutory rate. This affects all active workers.") · Change logged in audit_log with actor_id, previous value, new value, timestamp · Read-only view for non-admin roles |
| S19-02 | As Chamia, I need a Monthly Compliance Dashboard so that I can prepare KRA/NSSF/SHIF remittances | 5 | PAYE aggregation: total taxable income, total PAYE deducted, due to KRA by 9th of following month · NSSF aggregation: Tier I and II per worker, employer contributions · SHIF aggregation: total per worker · Export: CSV formatted for KRA iTax Form P10 · Remittance deadlines displayed with countdown |
| S19-03 | As Chamia, I need a worker and employer management view so that I can manage the beta cohort | 3 | List of all workers: verification status, shift count, last active · List of all employers: WIBA status, shift count, outstanding disputes · Ability to manually approve/reject verification, flag profiles, suspend accounts |

**Sprint 19 total:** 13 points

---

#### Sprint 20 — Weeks 39–40

**Objectives:** Data Subject Rights workflow · Breach Response Panel

| ID | Story | Points | AC |
|---|---|---|---|
| S20-01 | As the platform, I need a Data Subject Request management workflow so that DPA 2019 response obligations are met | 5 | Request types: access, rectification, deletion, portability, restrict processing, object · Log: request_id, type, subject_id, submitted_at, assigned_to, status, resolved_at · Response tracking — admin dashboard flags overdue requests · Data export: generates ZIP of all personal data for the subject · Deletion: anonymises profile data, retains payment records with legal basis note |
| S20-02 | As the platform, I need a Breach Response Panel so that the 72-hour ODPC notification obligation is met | 5 | Breach declaration: type, affected subjects (count), data categories, cause · 72-hour countdown timer starts on declaration · ODPC notification template: pre-filled with platform details, incident summary fields · "Send to ODPC" action (formatted email or portal submission) · Worker/employer notification workflow: personalised notification templates · Breach log: immutable, date/time-stamped entries |
| S20-03 | As Akinyi, I need my data subject rights to work as real functional features so that my DPA rights are exercisable | 3 | "Download my data" → ZIP generated within 24 hours, link sent to M-Pesa-registered phone · "Correct my information" → update form, changes reviewed within 7 days · "Delete my account" → anonymisation triggered, confirmation with retention notice · "Manage consent" → toggle GPS consent, view current consent state |

**Sprint 20 total:** 13 points

---

#### Sprint 21 — Weeks 41–42

**Objectives:** Performance · Security · Monitoring

| ID | Story | Points | AC |
|---|---|---|---|
| S21-01 | As the platform, I need API response time monitoring so that performance issues are caught before they affect users | 3 | CloudWatch dashboards: P50, P95, P99 response times per endpoint · Alert: P95 > 500ms for 5 minutes → PagerDuty alert to developer on call · Alert: Error rate > 1% for 2 minutes → immediate alert |
| S21-02 | As the platform, I need all sensitive data encrypted so that DPA 2019 integrity requirements are met | 3 | National ID images: AES-256 encryption at rest in S3 · M-Pesa numbers: encrypted at application layer before DB storage · GPS data: geo_hash only — raw coordinates never persisted · TLS 1.2 minimum on all API endpoints · Certificate pinning in mobile apps |
| S21-03 | As the platform, I need rate limiting and input validation on all endpoints so that the platform is resistant to abuse | 3 | Rate limiting: authentication endpoints (3/10min), shift posting (20/hour per employer), shift application (50/hour per worker) · Input validation: all user-supplied strings sanitised · SQL injection: parameterised queries throughout (ORM enforced) · OWASP Top 10 checklist reviewed |

**Sprint 21 total:** 9 points

---

### PHASE 7 — BETA PREPARATION & GO-LIVE
**Objective:** 50 employers and 200 workers ready. End-to-end system tested. All compliance gates confirmed. Go-live checklist complete.
**Exit criteria:** MVP DoD checklist complete · Beta cohort onboarded · First live shift completed on platform

---

#### Sprint 22 — Weeks 43–44

**Objectives:** Integration testing · Load testing · Security audit · Beta cohort onboarding

| ID | Story | Points | AC |
|---|---|---|---|
| S22-01 | As the team, I need full end-to-end integration testing so that the core loop works without errors | 8 | Test: post shift → match → confirm → escrow funded → clock-in (WIBA confirmed) → clock-out → payment released → rating submitted · Test: WIBA blocked clock-in · Test: minimum wage blocked shift posting · Test: Section 37 alert at 20, 25, 30 day thresholds · Test: dispute flow pausing auto-release · All tests pass on staging with real Daraja sandbox calls |
| S22-02 | As the team, I need a load test so that performance at 80 concurrent users is confirmed | 5 | k6 load test: 80 concurrent users, 30 minutes sustained · P95 response time < 500ms on all core endpoints · Zero errors during 30-minute window · RDS connection pooling validated · Auto-scaling confirmed |
| S22-03 | As the team, I need the beta cohort of 50 employers and 200 workers onboarded so that the beta launch is ready | 5 | 50 employer accounts created, business verified, WIBA declared, M-Pesa configured · 200 worker accounts created, identity verified, skills set, M-Pesa configured · At least 10 shifts posted by employers before go-live day |

**Sprint 22 total:** 18 points

---

#### Sprint 23 — Weeks 45–46

**Objectives:** First live shift · Bug fixes · Investor update · Go-live

| ID | Story | Points | AC |
|---|---|---|---|
| S23-01 | As the team, I need a controlled first live shift completed so that the platform is confirmed live | 8 | First shift: known employer (The Brew Bistro or equivalent), known worker from beta cohort · Real KES disbursed to real M-Pesa number · All ShiftEventLog states confirmed · Pay statement generated · Admin notified at each step |
| S23-02 | As Chamia, I need a beta investor update prepared so that pre-seed round conversations advance | 3 | Update covers: beta cohort size, first shift completed, compliance architecture, compliance legal opinion status, next milestone (Week 8 beta: 20 shifts, Week 12 beta: 50 shifts) |
| S23-03 | As the team, I need all P0 and P1 bugs resolved before public beta so that the first impression is reliable | 5 | Zero P0 bugs · Zero P1 bugs · P2 bugs documented with resolution timeline |

**Sprint 23 total:** 16 points

---

## 6. Compliance Dependencies — Critical Path

The following compliance actions must complete before the sprint that depends on them. Missing these blocks development.

| Action | Owner | Deadline | Blocks |
|---|---|---|---|
| Legal opinion: PAYE/NSSF/WIBA/entity classification | Chamia | End of Sprint 1 (Week 2) | Everything |
| ODPC registration confirmed | Chamia | End of Sprint 2 (Week 4) | Sprint 8 (identity data collection) |
| KRA PIN obtained | Chamia | End of Sprint 1 (Week 2) | Sprint 19 (PAYE remittance) |
| WIBA option confirmed (A or B) | Ivy | End of Sprint 2 (Week 4) | Sprint 6 (clock-in gate) |
| AHL enforceability confirmed | Legal counsel | End of Sprint 2 (Week 4) | Sprint 7 (Compliance Engine) |
| Escrow model / CBK licensing position | Legal counsel | End of Sprint 2 (Week 4) | Sprint 16 (Payment Service) |
| Minimum wage schedules obtained | Developer | End of Phase 1 (Week 12) | Sprint 7 (min wage gate) |
| DPAs with AWS, Safaricom, WhatsApp, Africa's Talking | Chamia | Before beta (Sprint 22) | Go-live |
| Daraja production keys | Chamia | Before Sprint 16 | Payment Service |
| DPIA completed | Ivy + Legal | Before data collection (Sprint 8) | Worker onboarding |
| Privacy Policy published | Legal | Before beta | DPA compliance |

---

## 7. Technology Stack

| Layer | Technology |
|---|---|
| Mobile apps | React Native, Android-first, Expo (SDK pinned) |
| Backend framework | Express 5 / TypeScript |
| Runtime | Node.js 22 (Railway), Node.js 16 (local macOS Catalina) |
| Database | PostgreSQL (AWS RDS, af-south-1) |
| ORM | Prisma |
| File storage | AWS S3 (af-south-1, encryption at rest) |
| Authentication | JWT + refresh tokens, OTP via Africa's Talking |
| Push notifications | FCM (primary), WhatsApp Business API (fallback) |
| Payments | Safaricom Daraja B2C |
| Hosting | Railway (backend), AWS af-south-1 |
| DNS / Proxy | Cloudflare |
| Monitoring | CloudWatch, PagerDuty |
| CI/CD | GitHub Actions |
| Testing | Jest (unit/integration), k6 (load) |
| API testing | Postman |

---

## 8. Sprint Summary

| Phase | Sprints | Weeks | Points | Key deliverable |
|---|---|---|---|---|
| Phase 0 — Validation | S1–S2 | 1–4 | 41 | Legal opinion · 50 interviews · Infrastructure |
| Phase 1 — Core API | S3–S6 | 5–12 | 78 | Auth · Shift · Match · GPS · Notifications |
| Phase 2 — Compliance | S7 | 13–14 | 26 | Compliance Engine · Contracts · Webhooks |
| Phase 3 — Worker App | S8–S11 | 15–22 | 69 | Complete worker flow |
| Phase 4 — Employer App | S12–S15 | 23–30 | 62 | Complete employer flow |
| Phase 5 — Payment | S16–S18 | 31–36 | 42 | Daraja production · Escrow · Pay statements |
| Phase 6 — Admin | S19–S21 | 37–42 | 35 | Compliance config · DPA rights · Security |
| Phase 7 — Beta | S22–S23 | 43–46 | 34 | First live shift · Go-live |
| **TOTAL** | **23 sprints** | **46 weeks** | **387 points** | **Controlled beta launch** |

---

*A Kirimon Market Ventures company · klokd.co.ke · @klokdKE*
*Document version 1.0 · March 2026 · Living document — update as decisions are made*
