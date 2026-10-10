# octopus-api — Technical Specification

**The shared backend for Kirimon Market Ventures apps** · Klokd · LunchDrop · future Kirimon products
Version: 10 October 2026 · Status: live in production (Klokd module)

> `octopus-api` is Kirimon's one backend for every product. The body is a shared **platform core**: accounts, identity, messaging, payments, notifications, privacy, staff tools and the connections to the KMV rails. Each product is an **arm**: a module that adds only that product's own business logic. One service, many arms.
>
> **Klokd** (verified hospitality shifts, Nairobi) is the first arm and is live. **LunchDrop** is next. Further Kirimon apps plug in the same way: they get sign-in, KYC, M-Pesa, SMS/WhatsApp, push and DPA compliance on day one, without building any of it again.

---

## Contents

0. [Platform model: core and arms](#0-platform-model-core-and-arms)
1. [Overview](#1-overview)
2. [Architecture](#2-architecture)
3. [Deployment and environments](#3-deployment-and-environments)
4. [Conventions](#4-conventions)
5. [Authentication and roles](#5-authentication-and-roles)
6. [Klokd arm: core lifecycles](#6-klokd-arm-core-lifecycles)
7. [API reference](#7-api-reference)
8. [Background jobs](#8-background-jobs)
9. [Data model](#9-data-model)
10. [Partner rails](#10-partner-rails)
11. [Compliance engine](#11-compliance-engine)
12. [Configuration](#12-configuration)
13. [Security and privacy](#13-security-and-privacy)
14. [Testing and local development](#14-testing-and-local-development)
15. [Known gaps](#15-known-gaps)
16. [Roadmap to multi-product](#16-roadmap-to-multi-product)

---

## 0. Platform model: core and arms

### What the core gives every Kirimon app

| Capability | Core service | Backed by |
|---|---|---|
| Phone sign-in, sessions, roles | `auth` | Identiti accounts + one-time codes |
| Identity / KYC (IPRS), KYC tiers, step-up for risky actions | `identity` | Identiti |
| SMS and WhatsApp messages from approved templates | `messaging` | Todoku |
| In-app inbox, push with SMS/WhatsApp fallback | `notification` | Expo Push + Todoku |
| Escrow holds, payouts, refunds, idempotency, reconciliation | `payment` | Kipkiren Pay (M-Pesa) |
| Discovery broadcast (publish things nearby to users) | `hakken` | Hakken |
| AI agents acting on a user's behalf with delegated authority | `agent` | Helpan AI |
| Ratings, disputes, case decisions | `rating`, `dispute` | — |
| DPA 2019: consent, export, correction/deletion requests, erasure, breach log, 7-year retention | `privacy` | — |
| Audit log, staff sign-in, staff console APIs, rail health | `admin`, `audit` | — |
| Webhook intake (HMAC-verified), rate limits, errors, validation | platform | — |

### What an arm adds

Only the product's own domain: its records, its life cycle, its rules and its screens' endpoints. Examples:

| Arm | Domain it owns | Uses from core |
|---|---|---|
| **Klokd** (live) | Shifts, applications, check-in with start PIN, settlements, Kenyan employment law (PAYE/NSSF/SHIF, minimum wage, Section 37, WIBA, s.9 contracts) | All of it |
| **LunchDrop** (next) | Its own catalogue / orders / delivery flow and rules | Sign-in, KYC, M-Pesa payments and refunds, SMS/WhatsApp, push, ratings, disputes, privacy, staff console |
| Future Kirimon apps | Their domain | Whatever they need from the core |

### Rules every arm follows

1. **Tenant and product scoped.** Every record carries `tenant_id` and a `product` key (`klokd`, `lunchdrop`, …). A token issued for one product can't act in another.
2. **One person, one Kirimon identity.** A phone number maps to one Identiti account across all products, with a separate role per product (a Klokd worker can also be a LunchDrop customer).
3. **Arms talk to rails only through the core.** No arm calls Identiti, Todoku or Kipkiren Pay directly; it calls the core services, which handle signing, idempotency, retries and audit.
4. **Arms don't import each other.** Shared needs move into the core.
5. **Mounted under its own path:** `/api/v1/<product>/…` for product endpoints; `/api/v1/…` for core endpoints.
6. **Same conventions** (§4): response envelope, error codes, money in whole KES, server time in UTC.

### Where it stands today

The core capabilities above are **built and running in production**, but they currently live in one codebase alongside the Klokd arm, with Klokd naming in places (service name, health output, tenant `klokd-ke-default`, Klokd routes mounted at the root). Sections 1–15 describe the system as it runs now. §16 is the plan to separate core from arm so LunchDrop can be plugged in.

---

## 1. Overview

| | |
|---|---|
| Base URL (production) | `https://klokd-production.up.railway.app/api/v1` (to move to a neutral Kirimon domain, §16) |
| Health check | `GET /health` → `{ status: "ok", service: "klokd-api" }` |
| Products live | Klokd: `web-app` (klokd.co.ke), `worker-app` (Expo), `employer-app` (Expo) |
| Products planned | LunchDrop, other Kirimon apps |
| Users | Per product. Klokd: workers, employers, Kirimon staff (admin) |
| Tenancy | Single tenant today (`klokd-ke-default`); every table carries `tenant_id` |

What the Klokd arm does, end to end (the first product on the platform):

1. People sign in with their phone (Identiti account + one-time code via Todoku).
2. Workers verify their National ID (IPRS lookup through Identiti); businesses verify a KRA PIN and declare a WIBA policy.
3. Businesses post shifts; verified workers nearby apply; the business picks one; the worker confirms (accepting the s.9 contract).
4. On the day: the worker checks in at the venue (geofence), enters the business's start PIN, works, clocks out.
5. Pay is calculated with statutory deductions, approved by the business (or automatically after 4 hours), and paid to M-Pesa through Kipkiren Pay.
6. Ratings, disputes, notifications, staff operations and data-protection rights sit around that flow.

---

## 2. Architecture

```
 Klokd apps ─────┐          ┌──────────── octopus-api ────────────┐       ┌─ Identiti     (identity, KYC, OTP, step-up)
 LunchDrop apps ─┼─ HTTPS ─▶│  arms:  klokd │ lunchdrop │ …       │       ├─ Todoku       (SMS / WhatsApp)
 Future apps ────┘          │  ─────────────────────────────────  │──────▶├─ Kipkiren Pay (escrow, payouts)
                            │  core:  auth · identity · messaging │       ├─ Hakken       (discovery broadcast)
                            │  payment · notification · privacy   │       └─ Helpan AI    (agent runtime)
                            │  rating · dispute · admin · audit   │
                            └───────────┬──────────────┬──────────┘
                                 Database (Prisma)   Expo Push
```

Today only the Klokd arm exists, and the core and arm share one codebase (§16).

| Layer | Choice |
|---|---|
| Runtime | Node.js 22, TypeScript |
| HTTP | Express (async handlers; errors go to `errorHandler`) |
| Validation | zod on every request body/query |
| Database | SQLite via Prisma ORM; one file on a Railway volume (`DATABASE_URL=file:…`) |
| Migrations | Prisma migrations in `prisma/migrations`, applied on boot (`prisma migrate deploy`, fallback `db push`) |
| Middleware | helmet, cors (all origins), JSON body (10 MB), morgan logs, per-IP rate limiter |
| Push | Expo Push API (direct) |
| Tests | Jest + supertest (mocked Prisma) |

Source layout (`src/`):

| Path | Responsibility |
|---|---|
| `app.ts` / `server.ts` / `start.ts` | Express app, route mounting, background jobs, boot + migrations |
| `config/` | Environment configuration, Prisma client |
| `middleware/` | `authenticate`, `authorize`, `rateLimiter`, `errorHandler` (`AppError`) |
| `modules/auth` | OTP sign-in, staff sign-in, refresh, `/me` |
| `modules/identity` | Worker/employer profiles, IPRS verification, WIBA, uploads |
| `modules/shift` | Shift posting, feed, applications, selection, lifecycle |
| `modules/attendance` | Arrive → PIN → start → clock-out, settlements, no-show watcher, review queue |
| `modules/contract` | Employment Act s.9 written particulars |
| `modules/payment` | Escrow, payouts, step-up, pay statements, reconciliation |
| `modules/compliance` | PAYE / NSSF / SHIF / AHL / NITA, minimum wage, Section 37, WIBA checks |
| `modules/dispute`, `modules/rating` | Disputes, ratings |
| `modules/notification` | In-app inbox, Expo push, Todoku fallback |
| `modules/me`, `modules/employer` | Per-person and per-business views (profile, earnings, billing, team) |
| `modules/admin` | Staff console: stats, audit, users, verification, DPA, breach, rail health, security |
| `modules/hakken`, `modules/rails` | Partner rail clients, webhooks, Hakken publishing + sweep |
| `modules/agent` | Helpan delegated authorities, briefings, agent dispatch |
| `modules/early-access` | Waitlist |
| `modules/demo` | Rail demonstration routes (see §15) |

---

## 3. Deployment and environments

| | |
|---|---|
| Host | Railway, project `happy-smile`, service `klokd` (root `/octopus-api`), volume `klokd-volume` |
| Build | `Dockerfile` (node:22-slim, `prisma generate`, `tsc`) → `node dist/start.js` |
| Deploys | Automatic on push to `main` |
| Boot | `start.ts` runs `prisma migrate deploy`, then starts the server, the attendance watcher and the Hakken sweep |
| Health | Railway health check on `/health` (300 s timeout) |
| Repo | GitHub `iamkn1ght/klokd` (moved from `thhvvv/klokd`; old URL redirects) |

Migrations so far: `init`, `rails_v3`, `user_account_uuid`, `helpan_agent_runtime`, `hakken_entity_ids`, `early_access`, `attendance_v1`, `real_surfaces`. All since `attendance_v1` are additive (`ALTER TABLE … ADD COLUMN`, new tables) so deploys never rebuild existing tables.

---

## 4. Conventions

**Response envelope**

```json
{ "success": true, "data": { … } }
{ "success": false, "error": "Human-readable message", "code": "MACHINE_CODE" }
{ "success": false, "error": "Validation failed", "details": [{ "field": "pin", "message": "The PIN is 4 digits" }] }
```

- `error` is written for end users and is safe to show.
- `code` is present when a client should branch on it.
- Validation errors are HTTP 422 with `details`.

**Status codes:** 200/201 success · 401 not signed in / bad credentials · 403 role or compliance refusal · 404 not found **or not yours** (ownership failures deliberately look like "not found") · 409 wrong state / duplicate · 422 validation or business rule · 423 PIN locked · 503 partner service not live.

**Machine codes in use:** `OUT_OF_GEOFENCE`, `LOW_ACCURACY`, `OUTSIDE_TIME_WINDOW`, `LOCATION_REQUIRED`, `WIBA_REQUIRED`, `KYC_TIER_INSUFFICIENT`, `ESCROW_NOT_FUNDED`, `WRONG_PIN`, `PIN_LOCKED`, `NOT_ARRIVED`, `INVALID_STATE`, `DISPUTED`, `PAYMENT_RAIL_NOT_LIVE`, plus Identiti codes passed through.

**Time:** all timestamps are ISO-8601 UTC from the server clock. Clients display in `Africa/Nairobi`. Device time is never trusted.

**Money:** whole Kenyan shillings (`Int`), field names end in `Kes`.

**Phone numbers:** accepted as `07…`, `254…` or `+254…`; stored normalised (`+254…`).

---

## 5. Authentication and roles

Roles: `WORKER`, `EMPLOYER`, `ADMIN`. One role per phone number; the stored role is authoritative (a worker number can't become an employer by choosing "I hire workers").

**Tokens:** `Authorization: Bearer <JWT>`. Access token (HS256) lasts `JWT_EXPIRY` (default 15 min); refresh token (opaque UUID, stored) lasts `JWT_REFRESH_EXPIRY` (default 7 days). `authenticate` verifies the JWT; `authorize(...roles)` checks the role.

### Worker / employer sign-in

1. `POST /auth/otp/request { phone, profile? }` — first time for a number, `profile` is required (`nameFirst`, `nameLast`, `dpaConsent: true`, `kycConsent: true`) because Identiti creates the customer. Returns `challengeId` (and `sandboxOtp` while `OTP_SANDBOX_ECHO=true`).
2. `POST /auth/otp/verify { phone, challengeId, code, role }` — first success activates the account, stamps the role and creates the worker/employer profile. Returns `accessToken`, `refreshToken`, `isNewUser`, `role`.

### Staff sign-in

- `POST /auth/staff/login { phone, accessKey }` — phone must be in `ADMIN_PHONES`; key must equal `ADMIN_ACCESS_KEY` (≥ 24 chars, timing-safe compare). Rate limit 5 per 15 min.
- OTP can grant `ADMIN` only when codes are **not** echoed (`OTP_SANDBOX_ECHO` and `RAIL_FALLBACK_LOCAL` off) and the number is on `ADMIN_PHONES`.

### Session

`GET /auth/me` (role, profile name, verification) · `POST /auth/refresh { refreshToken }` · `POST /auth/logout { refreshToken }`.

---

## 6. Klokd arm: core lifecycles

> Everything in this section is Klokd-specific. A LunchDrop arm would define its own life cycle here, reusing the core's payment, messaging and dispute services.

### 6.1 Shift states

```
POSTED ──pick──▶ CONFIRMED ──worker accepts──▶ ACCEPTED ──start (PIN/override)──▶ ACTIVE ──clock-out──▶ COMPLETED ──payout──▶ PAID
   │                 │  ▲                          │                                                     │
   │                 │  └── decline / replace ─────┤ (back to POSTED)                                    └──dispute──▶ DISPUTED
   └──cancel──▶ CANCELLED ◀──cancel / no-show cancel┘
```

| From | Allowed to |
|---|---|
| POSTED | CONFIRMED, CANCELLED |
| CONFIRMED | ACCEPTED, POSTED, CANCELLED |
| ACCEPTED | ACTIVE, POSTED, CANCELLED |
| ACTIVE | COMPLETED |
| COMPLETED | DISPUTED, PAID |
| DISPUTED | PAID, COMPLETED |

Every transition writes a `shift_events` row.

### 6.2 Posting gates

A shift is accepted only if: the employer has a KRA PIN **and** a current (unexpired) WIBA policy; pay ≥ the minimum wage for the role in Nairobi (role matched case-insensitively); start is in the future; end is after start.

### 6.3 Selection

`POST /shifts/:id/confirm` (or a re-hire offer via `inviteWorkerId` on post):
- worker must be ID-verified; Section 37 check (warn/acknowledge/block);
- issues a 4-digit start PIN; other applicants are declined and notified; Hakken broadcast revoked;
- generates the s.9 contract (employer acceptance = selection);
- if Kipkiren Pay is live: creates the escrow hold (pay + 4% fee).

Re-hire offers go only to workers who have finished a shift for that employer and are never broadcast.

### 6.4 Attendance (Uber model)

| Step | Endpoint | Rules |
|---|---|---|
| Arrive | `POST /attendance/shifts/:id/arrive` | Shift `ACCEPTED`; from 60 min before start to end; ID verified; WIBA current; funded hold if payments live; location required; GPS accuracy ≤ 150 m; within 500 m of venue. Mock-location flagged, not blocked. |
| Start | `POST /attendance/shifts/:id/start { pin }` | Must have arrived; 5 wrong PINs lock it (`PIN_LOCKED`). Late start (>10 min) flagged. |
| Start (fallback) | `POST /attendance/shifts/:id/employer-start { reason, note? }` | Employer only; reasons `GPS_FAILED`, `PIN_LOCKED`, `WORKER_PHONE_ISSUE`, `OTHER` (note required). Compliance gates still apply. Flagged `EMPLOYER_OVERRIDE`. |
| Clock-out | `POST /attendance/shifts/:id/clock-out { lat?, lng?, accuracy? }` | Never blocked by location. Flags: `CLOCKOUT_OUTSIDE_GEOFENCE`, `EARLY_CLOCKOUT` (< 75% of booked time), `NO_LOCATION`. Creates the settlement. |

Every step is an append-only `attendance_events` row (SQLite triggers reject UPDATE/DELETE). Location is stored only as geohash + distance + accuracy; raw coordinates are never stored.

Legacy `POST /shifts/:id/clockin` / `clockout` remain for old app builds (arrive + start in one step, flagged `NO_PIN_LEGACY_APP`).

### 6.5 Pay (settlement)

At clock-out a `shift_settlements` row is created:

- gross = shift rate (pay is per shift); statutory deductions from the compliance engine; net to worker;
- platform fee = 4% of gross, paid by the employer on top (`employerTotalKes = gross + fee`);
- `approveBy` = clock-out + 4 hours.

| Status | Meaning |
|---|---|
| AWAITING_APPROVAL | Employer can approve or report a problem |
| APPROVED | Approved by the employer, staff, or automatically at `approveBy`; waiting for payout |
| DISPUTED | A dispute paused it |
| PAID | Kipkiren Pay confirmed the payout |
| VOID | Dispute decided "no pay; refund employer" |

### 6.6 No-show watcher

Every 60 s, for `CONFIRMED`/`ACCEPTED` shifts with no arrival: at start + 10 min a late warning (worker reminded, employer told); at start + 20 min a `NO_SHOW` event (flagged). The employer then chooses **wait**, **replace** (shift back to `POSTED`, earlier applicants restored, no-show worker excluded) or **cancel**. Holds are refunded on replace/cancel.

### 6.7 Disputes

Filed by either party on the shift (one per shift). Admin decisions: `release_payment` (pay as calculated), `partial_payment` (new gross; deductions recalculated), `reverse_escrow` (no pay; hold refunded; shift cancelled). Both parties are notified.

---

## 7. API reference

Each group is marked **core** (reusable by every Kirimon app) or **Klokd arm** (Klokd-only). Paths are shown as they are mounted today; after the split (§16) Klokd routes move under `/api/v1/klokd/…`.

All paths are under `/api/v1`. **Auth** column: `—` public · `any` any signed-in user · role names.

### Auth — `/auth` · **core**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/otp/request` | — | Start sign-in; returns `challengeId` (rate limit 3/10 min) |
| POST | `/auth/otp/verify` | — | Finish sign-in; returns tokens (3/10 min) |
| POST | `/auth/staff/login` | — | Staff sign-in with access key (5/15 min) |
| GET | `/auth/me` | any | Current account (role, name, verification) |
| POST | `/auth/refresh` | — | New access token from refresh token |
| POST | `/auth/logout` | — | Revoke refresh token |

### Me — `/me` (the signed-in person) · **core** (worker/earnings views are Klokd)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/me/worker` | WORKER | Profile, verification, skills, consent, reputation, this month's earnings |
| PUT | `/me/worker/skills` | WORKER | Replace skills (max 12) |
| POST | `/me/consent` | WORKER | `{ identity, location }` consent (audited) |
| GET | `/me/shifts` | WORKER | `offers`, `upcoming`, `applied`, `history`, `notPicked` |
| GET | `/me/earnings` | WORKER | Monthly totals + per-shift breakdown + payout state |
| GET | `/me/ratings/pending` | WORKER, EMPLOYER | Finished shifts (last 14 days) not yet rated |
| GET | `/me/notifications` | any | Inbox (50) + unread count |
| POST | `/me/notifications/read` | any | Mark all (or `ids`) read |
| POST | `/me/push-token` | any | Register an Expo push token `{ token, platform }` |
| GET | `/me/data` | any | Full personal data export (DPA access right) |
| GET | `/me/data-requests` | any | My correction/deletion requests |
| POST | `/me/data-requests` | any | `{ type: RECTIFICATION \| DELETION, details? }` |

### Identity — `/identity` · **core** (KYC) + Klokd (WIBA, KRA, skills)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| PUT | `/identity/workers/profile` | WORKER | Name, skills |
| POST | `/identity/workers/consent` | WORKER | Consent (onboarding) |
| POST | `/identity/workers/verify-id` | WORKER | IPRS check `{ nationalId, nameFirst, nameLast, dateOfBirth }` via Identiti |
| GET | `/identity/employers/profile` | EMPLOYER | Business, masked KRA PIN, WIBA status, `canPostShifts` |
| PUT | `/identity/employers/profile` | EMPLOYER | `{ businessName, kraPin, contactPerson? }` (KRA format `A123456789Z`) |
| POST | `/identity/employers/wiba` | EMPLOYER | `{ insurer, policyRef, policyExpiry }` |
| POST | `/identity/upload` | WORKER | Certificate upload (base64; no ID documents ever) |
| PATCH | `/identity/admin/workers/:workerId/verification` | ADMIN | Manual verification override (audited) |

### Shifts — `/shifts` · **Klokd arm**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/shifts` | EMPLOYER | Post a shift; optional `inviteWorkerId` (re-hire offer). Rate limit 20/h |
| GET | `/shifts/available?lat&lng&radiusKm&role&date` | WORKER | Open, future shifts near a point, with distance |
| GET | `/shifts/mine` | EMPLOYER | My shifts + application counts |
| GET | `/shifts/my/applications` | WORKER | My applications |
| POST | `/shifts/:id/apply` | WORKER | Apply (verified only; overlap check) |
| POST | `/shifts/:id/withdraw` | WORKER | Withdraw a pending application |
| GET | `/shifts/:id/applicants` | EMPLOYER (owner) | Pending applicants (last initial only) |
| POST | `/shifts/:id/confirm` | EMPLOYER (owner) | Pick a worker `{ workerId }` |
| POST | `/shifts/:id/accept` | WORKER (assigned) | Confirm the shift; accepts the contract |
| POST | `/shifts/:id/decline` | WORKER (assigned) | Decline a pick/offer; shift reopens |
| POST | `/shifts/:id/worker-cancel` | WORKER (assigned) | Cancel before arriving; shift reopens |
| POST | `/shifts/:id/cancel` | EMPLOYER (owner) | Cancel before start (refund if funded) |
| GET | `/shifts/:id/contract` | parties, ADMIN | s.9 written particulars |
| GET | `/shifts/:id` | any | Details (no PIN; worker surname initial only; `myApplication` for workers) |
| POST | `/shifts/:id/clockin` | WORKER | Legacy one-step clock-in |
| POST | `/shifts/:id/clockout` | WORKER | Legacy clock-out |

### Attendance — `/attendance` · **Klokd arm**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/attendance/shifts/:id/arrive` | WORKER | Check in `{ lat, lng, accuracy?, mocked? }` |
| POST | `/attendance/shifts/:id/start` | WORKER | Start with `{ pin }` |
| POST | `/attendance/shifts/:id/clock-out` | WORKER | Clock out (location optional) |
| POST | `/attendance/shifts/:id/employer-start` | EMPLOYER | Start without PIN `{ reason, note? }` |
| POST | `/attendance/shifts/:id/no-show` | EMPLOYER | `{ action: wait \| replace \| cancel }` |
| POST | `/attendance/shifts/:id/settlement/approve` | EMPLOYER | Approve pay |
| GET | `/attendance/shifts/:id` | WORKER, EMPLOYER | Role-shaped view (PIN for employer only), events, settlement |
| GET | `/attendance/feed` | EMPLOYER | Last 20 events across my shifts |
| GET | `/attendance/admin/flags?all=1` | ADMIN | Review queue of flagged events |
| POST | `/attendance/admin/events/:id/review` | ADMIN | `{ status: CLEARED \| ESCALATED, note? }` |
| GET | `/attendance/admin/overrides` | ADMIN | Override watch per employer |

### Employer — `/employer` · **Klokd arm**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/employer/overview` | EMPLOYER | Shifts this week, pay committed, spend, awaiting approval, show-up rate |
| GET | `/employer/billing` | EMPLOYER | Totals by stage + per-shift lines |
| GET | `/employer/billing.csv` | EMPLOYER | CSV export |
| GET | `/employer/team` | EMPLOYER | Workers who finished shifts here (for re-hire) |

### Payments — `/payments` · **core** (pay statements are Klokd)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/payments/release/:shiftId` | EMPLOYER | Approve + pay now (503 until Kipkiren Pay is live) |
| GET | `/payments/shift/:shiftId` | any | Payment for a shift |
| GET | `/payments/my` | WORKER | My payments |
| GET | `/payments/statement/:paymentId` | any | Pay statement PDF |
| GET | `/payments/monthly/:year/:month` | WORKER | Monthly statement |
| GET | `/payments/reconciliation/:year/:month` | ADMIN | Reconciliation report |
| POST | `/payments/:paymentId/step-up` | WORKER | Answer the large-payout OTP `{ code }` |
| POST | `/payments/retry/:paymentId` | ADMIN | Re-run a failed payout |

### Compliance — `/compliance` · **Klokd arm** (Kenyan employment law)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/compliance/calculate` | any | Deductions for an amount |
| GET | `/compliance/wiba/:shiftId` | any | WIBA status for a shift's employer |
| GET | `/compliance/section37/:workerId/:employerId` | any | Section 37 status |
| POST | `/compliance/minwage/validate` | any | Check a rate against the minimum wage |
| PUT | `/compliance/config/:key` | ADMIN | Change a rate (audited) |

### Disputes and ratings · **core**

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/disputes` | parties | `{ shiftId, type, description, evidenceKeys? }`; pauses pay |
| GET | `/disputes/shift/:shiftId` | any | Dispute for a shift |
| GET | `/disputes/admin/all` | ADMIN | All disputes, open first, with shift record |
| GET | `/disputes/admin/open` | ADMIN | Open disputes |
| PATCH | `/disputes/:id/review` | ADMIN | Mark under review |
| PATCH | `/disputes/:id/resolve` | ADMIN | `{ resolution, action, partialAmountKes? }` |
| POST | `/ratings` | parties | `{ shiftId, stars 1–5, comment? }`, once per side |

Dispute types: `NO_SHOW`, `INCOMPLETE_SHIFT`, `CONDUCT_ISSUE`, `PAYMENT_NOT_RECEIVED`, `UNSAFE_CONDITIONS`, `OTHER`.

### Admin — `/admin` (all `ADMIN`) · **core** (+ Klokd verification and statutory reports)

| Method | Path | Purpose |
|---|---|---|
| GET | `/admin/stats` | People, shifts, queues, money by stage, `paymentsLive` |
| GET | `/admin/audit?limit&before&q` | Audit log, searchable, paged |
| GET | `/admin/verification` | Unverified workers; employers missing KRA/WIBA |
| GET | `/admin/settlements?status` | Pay from approval to payout |
| GET | `/admin/workers?status&page&limit` | Workers |
| GET | `/admin/employers?page&limit` | Employers |
| PATCH | `/admin/users/:userId/status` | Deactivate / reactivate `{ isActive }` |
| GET | `/admin/data-requests` | DSR queue with 30-day due dates |
| PATCH | `/admin/data-requests/:id` | `{ status: DONE \| REJECTED, resolution }` (person notified) |
| GET | `/admin/dpa/access/:userId` | Full data export for a person |
| PATCH | `/admin/dpa/rectify/:userId` | Correct a field (audited) |
| DELETE | `/admin/dpa/erase/:userId` | Erase personal data (retains statutory records) |
| POST | `/admin/breach` · GET `/admin/breaches` | Breach log (72-hour ODPC window) |
| GET | `/admin/compliance/config` · `/admin/compliance/config/:key/history` | Rates + change history |
| GET | `/admin/statutory/:year/:month` · `…/csv` | Monthly statutory summary / KRA CSV |
| GET | `/admin/rails-health` | Partner probes with latency + Hakken backlog |
| GET | `/security/encryption-audit` · `/security/audit-log` · `/security/rate-limits` · `/security/owasp-check` | Security self-checks |

### Public

| Method | Path | Purpose |
|---|---|---|
| GET | `/rails/status` | Coarse partner status for status pages |
| POST | `/early-access` · GET `/early-access/count` | Join the waitlist / public count |
| GET | `/early-access` | ADMIN: list waitlist |

### Partner webhooks — `/webhooks/rails` (HMAC-verified, raw body) · **core**

| Path | Source | Handles |
|---|---|---|
| `/webhooks/rails/identiti` | Identiti | `PHONE_CHANGED`, `ACCOUNT_SUSPENDED`, KYC tier changes |
| `/webhooks/rails/todoku` | Todoku | Message delivery receipts |
| `/webhooks/rails/payment-rail` | Kipkiren Pay | `HOLD_RESERVED/RELEASED/REFUNDED`, `PAYOUT_COMPLETED/FAILED`, `WALLET_CREDITED` |
| `/webhooks/rails/helpan` | Helpan | Agent events |

### Agents — `/agents` (Helpan) · **core** (the `shift_signup` action is Klokd)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST/GET | `/agents/authorities` · DELETE `/agents/authorities/:jti` | WORKER | Delegated authority for the Klokd agent |
| POST | `/agents/briefings` | WORKER | Shift-hunting briefing |
| POST | `/agents/dispatch/klokd.write.shift_signup` | Helpan-signed | Agent applies to a shift on the worker's behalf |

### Demo — `/demo` (see §15)

`POST /demo/identiti/create-customer`, `GET /demo/identiti/tier/:uuid`, `POST /demo/identiti/step-up`, `POST /demo/identiti/phone-token`, `POST /demo/todoku/send`, `GET /demo/templates` — rail visualiser, **no authentication**.

---

## 8. Background jobs

| Job | Interval | Does |
|---|---|---|
| Attendance watcher | 60 s (`ATTENDANCE_WATCHER_INTERVAL_MS`) | Late warnings, no-shows, auto-approves settlements past `approveBy`, runs the payout sweep |
| Payout sweep | with the watcher | Pays approved settlements with a funded hold (only when Kipkiren Pay is configured) |
| Hakken deferral sweep | `HAKKEN_SWEEP_INTERVAL_MS` | Retries deferred Hakken publishes; registers missed workers/employers; broadcasts missed shifts |
| Todoku fallback | 5 min after a notification | WhatsApp/SMS if no push was accepted (in-process timer) |
| Rate-limit cleanup | 5 min | Drops expired limiter entries |

---

## 9. Data model

SQLite via Prisma (`prisma/schema.prisma`). Core tables:

| Model | Purpose / key fields |
|---|---|
| `User` | phone (unique), role, `accountUuid` (Identiti), `kycTier`, `isActive` |
| `RefreshToken` | refresh sessions |
| `Worker` | names, `verificationStatus`, skills (JSON), consent, `showUpRate`, rating aggregate, `hakkenEntityId` |
| `Employer` | business name, KRA PIN, contact, WIBA insurer/policy/expiry, rating, `hakkenEntityId` |
| `Shift` | role, times, `rateKes`, venue lat/lng + geohash, status, worker, start PIN + attempts, `arrivedAt`, clock-in/out (+ geohashes), `lateStage`, `directOffer`, Hakken broadcast id |
| `ShiftApplication` | worker ↔ shift, status (`PENDING/SELECTED/REJECTED/WITHDRAWN`) |
| `ShiftEvent` | state-transition log |
| `Contract` | s.9 text (`body`), employer/worker acceptance times, `retainUntil` |
| `AttendanceEvent` | append-only: type, method, server time, geohash, distance, accuracy, geofence result, flags, reason |
| `AttendanceReview` | admin decision on a flagged event |
| `ShiftSettlement` | pay due: minutes, gross, PAYE/NSSF/SHIF/AHL, net, fee, employer total, status, `approveBy`, approval, `paymentId` |
| `Escrow` | Kipkiren Pay hold (`stkPushRef` = hold id), status, amounts |
| `Payment` | payout: amounts, status, rail ref, M-Pesa ref, retries, step-up challenge, `retainUntil` (7 years) |
| `ComplianceConfig`, `MinimumWage` | statutory rates; minimum wage per sector/location |
| `Dispute`, `Rating` | disputes; ratings (`@@unique(shiftId, raterRole)`) |
| `Notification`, `PushToken`, `NotificationLog` | inbox; device tokens; Todoku receipts |
| `DataRequest` | DSR (rectification/deletion) with resolution |
| `AuditLog`, `AnalyticsEvent` | audit trail; analytics + breach records |
| `EarlyAccessRequest` | waitlist |
| `DelegatedAuthority`, `AgentBriefing`, `AgentAction` | Helpan agent runtime |
| `WebhookSubscription`, `WebhookDelivery` | outgoing webhook scaffolding |

Enums: `UserRole`, `VerificationStatus`, `ShiftStatus`, `ApplicationStatus`, `EscrowStatus`, `PaymentStatus`, `DisputeType`, `DisputeStatus`.

---

## 10. Partner rails

| Rail | Used for | Status (10 Oct 2026) | Klokd never… |
|---|---|---|---|
| **Identiti** | Customer accounts, OTP-backed sign-in, IPRS KYC, phone tokens, step-up OTP | Live (Supabase free tier pauses — needs paid plan) | stores ID numbers, ID images or biometrics |
| **Todoku** | OTP SMS, WhatsApp/SMS notifications (8 approved templates) | Up, but SMS channels unavailable → OTP echoed (`OTP_SANDBOX_ECHO`) | stores phone numbers for messaging |
| **Kipkiren Pay** | Escrow holds, payouts, refunds, wallets | **Not connected.** All Klokd-side code is built and activates when `PAYMENT_RAIL_API_BASE`, `_APP_ID`, `_APP_SECRET` are set | holds money or M-Pesa numbers |
| **Hakken** | Broadcasting open shifts; worker/employer entities | Client live; app awaiting operator activation | — |
| **Helpan AI** | Agent runtime (briefings, delegated sign-ups) | Configured per environment | — |

Rail clients live in `src/modules/rails/*.client.ts`, use HMAC-signed requests, and map errors to `AppError` with `railCode`.

---

## 11. Compliance engine (Klokd arm)

`complianceService` (`modules/compliance`), rates from `ComplianceConfig` (editable by staff, audited):

| Item | Rule |
|---|---|
| PAYE | Per shift, with monthly aggregate support |
| NSSF | Tier I and Tier II with ceilings |
| SHIF | 2.75% of gross, KES 300 minimum |
| Housing levy (AHL) | Config toggle |
| NITA | KES 50 per worker per month |
| Minimum wage | Per sector + location; checked when posting |
| Section 37 | Days worked with one employer: warn 20, acknowledge 25, block 30 |
| WIBA | Employer policy must exist and be current to post, arrive and start |

Statutory rates should be confirmed against the pending legal opinion (OQ-01).

---

## 12. Configuration

Environment variables (Railway service `klokd`):

| Group | Variables |
|---|---|
| Core | `DATABASE_URL`, `PORT`, `NODE_ENV` |
| Auth | `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_EXPIRY` (15m), `JWT_REFRESH_EXPIRY` (7d) |
| Staff | `ADMIN_PHONES` (comma-separated numbers), `ADMIN_ACCESS_KEY` (≥ 24 chars) |
| OTP | `OTP_SANDBOX_ECHO` (echo codes; turn off when SMS works), `RAIL_FALLBACK_LOCAL` (dev only) |
| Identiti | `IDENTITI_API_BASE` (or `IDENTITI_BASE_URL`), `IDENTITI_APP_ID`, `IDENTITI_APP_SECRET`, `IDENTITI_WEBHOOK_SECRET` |
| Todoku | `TODOKU_API_BASE` (or `TODOKU_BASE_URL`), `TODOKU_APP_ID`, `TODOKU_APP_SECRET`, `TODOKU_WEBHOOK_SECRET` |
| Kipkiren Pay | `PAYMENT_RAIL_API_BASE` (or `PAYMENT_RAIL_BASE_URL`), `PAYMENT_RAIL_APP_ID`, `PAYMENT_RAIL_APP_SECRET`, `PAYMENT_RAIL_WEBHOOK_SECRET`, `PAYOUT_STEP_UP_THRESHOLD_KES` (20000) |
| Hakken | `HAKKEN_API_BASE`, `HAKKEN_APP_KEY`, `HAKKEN_APP_SECRET`, `HAKKEN_JWT_AUDIENCE`, `HAKKEN_JWT_TTL_SECONDS`, `HAKKEN_SWEEP_*` |
| Helpan | `HELPAN_API_BASE`, `HELPAN_APP_ID`, `HELPAN_APP_SECRET`, `HELPAN_JWT_AUDIENCE`, `HELPAN_JWT_TTL_SECONDS`, `HELPAN_WEBHOOK_SECRET` |
| Storage | `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_STORAGE_BUCKET` (certificates, pay statements) |
| Push | `EXPO_PUSH_TOKEN` (optional Expo access token) |
| Platform | `GPS_CLOCK_IN_RADIUS_METERS` (500), `ESCROW_AUTO_RELEASE_HOURS` (4) |
| Attendance | `ATTENDANCE_ARRIVE_EARLY_MINUTES` (60), `ATTENDANCE_MAX_ACCURACY_METERS` (150), `ATTENDANCE_MAX_PIN_ATTEMPTS` (5), `ATTENDANCE_LATE_GRACE_MINUTES` (10), `ATTENDANCE_LATE_WARNING_MINUTES` (10), `ATTENDANCE_NO_SHOW_MINUTES` (20), `ATTENDANCE_EARLY_CLOCKOUT_RATIO` (0.75), `ATTENDANCE_OVERRIDE_ALERT_MIN` (3), `ATTENDANCE_OVERRIDE_ALERT_RATIO` (0.5), `ATTENDANCE_OVERRIDE_WINDOW_DAYS` (30), `ATTENDANCE_WATCHER_INTERVAL_MS` (60000) |

Fixed in code: platform fee 4%; ratings shown after 3 reviews; data retention 7 years.

---

## 13. Security and privacy

- **Ownership checks:** applicants, contracts, attendance, disputes and ratings are restricted to the shift's two parties (and staff). Failures return 404.
- **No raw location:** only geohash, distance and accuracy are stored, and only at arrive / start / clock-out.
- **No identity documents:** IPRS checks go through Identiti; certificate uploads only.
- **Start PIN** is visible only to the employer; never returned by `GET /shifts/:id`.
- **Append-only evidence:** `attendance_events` (DB triggers), `audit_logs`.
- **Audited actions:** consent, WIBA, KRA, verification overrides, settlement approvals, dispute decisions, DSR actions, staff logins, payout retries, override alerts.
- **Rate limits:** OTP 3/10 min, staff login 5/15 min, shift posting 20/h, apply 50/h, arrive 20/10 min, PIN 10/10 min.
- **Webhooks:** HMAC-verified on the raw body.
- **DPA 2019:** self-service export and correction/deletion requests; staff access/rectify/erase; breach log; 7-year retention for pay and contracts.

---

## 14. Testing and local development

```bash
cd octopus-api
npm install
cp .env.example .env            # set DATABASE_URL=file:./prisma/dev.db, JWT secrets
npx prisma migrate deploy
npm run dev                     # ts-node-dev on PORT (3000)
npm test                        # jest --forceExit (54 tests, 6 suites)
```

| Suite | Covers |
|---|---|
| `auth.test.ts` | OTP and session flows |
| `e2e.test.ts` | Post → apply → pick → arrive → PIN → clock-out → pay, geofence refusal, legacy clock-in |
| `compliance.test.ts` | Deductions, WIBA, minimum wage, Section 37 |
| `payment.test.ts` | Kipkiren Pay guards, reconciliation |
| `admin.test.ts` | Admin access and stats |
| `geoUtils.test.ts` | Distance, geohash |

Scripts in `scripts/`: rail smoke tests (`smoke-*.ts`), `verify-helpan-full.ts`, `seed-beta.ts` (local only). Load test: `tests/load/k6-load-test.js`.

---

## 15. Known gaps

| # | Gap | Impact | Fix |
|---|---|---|---|
| 1 | `/demo/*` routes have **no authentication** and call Identiti/Todoku | Anyone can create sandbox Identiti customers or trigger template sends | Remove, or require `ADMIN` |
| 2 | `authenticate` and `/auth/refresh` don't re-check `User.isActive` | A deactivated user keeps API access with existing tokens (refresh keeps working) | Check `isActive` on refresh and in `authenticate` (cached) |
| 3 | Single SQLite file, no backups | One volume loss = total data loss | Scheduled backups (or Postgres) before real users |
| 4 | Rate limiter and Todoku fallback timers are in memory | Reset on every deploy/restart; don't share across instances | Persisted store if scaled |
| 5 | Kipkiren Pay not connected | No money moves; approved pay queues | Add credentials (KP-9) |
| 6 | Todoku SMS unavailable; OTP echoed | Anyone can sign in as any number while echo is on | Turn off `OTP_SANDBOX_ECHO` when SMS works |
| 7 | Push needs app builds with `expo-notifications` | Alerts only in inboxes until then | Native builds |
| 8 | Offline check-in queue not built | Workers without signal can't check in | Device queue + server replay rules |
| 9 | Possible old seed-demo rows in production | Fake employers/shifts in data | Check admin Users; purge |
| 10 | `cors()` allows all origins | Acceptable for a public token API; tighten if cookies are ever used | Allowlist klokd.co.ke + app origins |

---

## 16. Roadmap to multi-product

Goal: LunchDrop and later Kirimon apps plug into octopus-api as arms, and nothing in the platform reads as Klokd-only.

| Step | Work | Outcome |
|---|---|---|
| 1. Own repository | Move `octopus-api/` to its own repo (history kept); point Railway at it | The platform lives apart from any one product |
| 2. Neutral identity | Rename the Railway service; neutral API domain (e.g. `api.kirimon.co.ke`); health reports `octopus-api`; rename tenant from `klokd-ke-default` | Nothing in the platform is branded Klokd; apps switch to the new URL |
| 3. Core / arm split | Reorganise `src/` into `core/` and `arms/klokd/`; move Klokd routes under `/api/v1/klokd/…` (keep old paths as aliases until old app builds expire) | Clear boundary; arms can't reach into each other |
| 4. Product scoping | Add `product` to users' roles, tokens, notifications, payments, audit; per-product roles (one phone, many products) | One Kirimon identity across apps; tokens scoped per product |
| 5. Per-product config | Per-product message templates (Todoku), fee rules, staff access, Hakken channels | Each app has its own settings on shared rails |
| 6. Production database | Move from one SQLite file to Postgres (Supabase), with backups | Safe for several products' data and load |
| 7. LunchDrop arm | Build LunchDrop's domain module on top of the core | Second product live on the platform |
| 8. Arm template | A documented starter arm (routes, models, tests) | New Kirimon apps start in days, not weeks |

Steps 1–2 are low-risk and can happen now. Steps 3–6 should be finished before LunchDrop's own work starts, so LunchDrop never inherits Klokd naming.

---

*Maintained alongside `klokd_reboot_pack_v1.md` (decisions D-01 – D-58) and `RECAP.md`. Update this file when routes, models, products or configuration change.*
