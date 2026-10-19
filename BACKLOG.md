# Klokd — Backlog

**As of 19 October 2026** · Kirimon Market Ventures
Covers the API (octopus-api), worker app, employer app and website (klokd.co.ke).

**Legend:** ✅ Done (live) · 🟡 Built, waiting on a partner/config · 🔨 In progress · ⬜ To do · ⛔ Blocked (not code)

---

## 1. Where we are

| Area | State |
|---|---|
| API (octopus-api) | ✅ Live: own repo (`iamkn1ght/octopus-api`), own Railway project, `https://octopus-api-production.up.railway.app`. Full shift loop, attendance, settlements, disputes, ratings, notifications, privacy, staff console, daily backups. 83/83 tests passing; load test passed (80 users, 30 min, 0 errors) |
| Website (klokd.co.ke) | ✅ Live. Landing, legal, early access, worker area, employer area, staff console — all on real data |
| Worker app | ✅ All screens on real data. Over-the-air updates via Expo (`preview`). No store build yet |
| Employer app | ✅ All screens on real data. Over-the-air updates via Expo (`preview`). No store build yet |
| Money | 🟡 Pay is calculated, approved and queued. Nothing pays out until Kipkiren Pay is connected |
| Messaging | ⛔ Todoku SMS/WhatsApp unavailable, so sign-in codes are shown on screen (sandbox echo) |
| Public launch | ⛔ Blocked on SMS, Kipkiren Pay, ODPC registration, WIBA cover, legal opinion |

---

## 2. Now — top priorities

| # | Item | Owner | Status |
|---|---|---|---|
| 1 | Staff access on the `octopus-api` service (`ADMIN_PHONES`, `ADMIN_ACCESS_KEY`) | You | ✅ |
| 2 | Rotate secrets exposed on 08 Oct (Hakken, Helpan, Identiti, JWT) (OQ-14) | You | ⬜ |
| 3 | Partner webhook URLs on `octopus-api-production.up.railway.app`: Todoku and Helpan updated; Identiti has no outgoing webhooks yet; Kipkiren Pay noted for provisioning. Delete the `klokd` forwarder after a few quiet days | You | ✅ / ⬜ |
| 4 | Confirm off-site backups land in Supabase Storage — see **Database backups** on the staff Overview | You + Eng | ⬜ |
| 5 | Identiti's Supabase on a paid plan — it has paused 3 times (OQ-15) | Silvia | ⛔ |
| 6 | **Delete the `klokd` forwarder service** (Railway `happy-smile`): volume deleted 19 Oct ✅. Check scheduled for 22 Oct 09:00 (claude.ai/code/routines/trig_017YR2MFuNkAbefFsVi1LXNp); delete the service if its HTTP Logs are quiet | You | ⬜ 22 Oct |
| 7 | Rotate the Helpan secrets pasted on 10 Oct: Supabase DB password, `IDENTITI_INTERNAL_HMAC_SECRET` (Helpan + Identiti together), `WEBHOOK_HMAC_SECRET` (same value into `HELPAN_WEBHOOK_SECRET` on octopus-api) | You | ⬜ |
| 8 | Sign in once on the website and each app against the new API (apps: reopen twice to load the update) | You | ⬜ |
| 9 | **Push + publish the 19 Oct work**: octopus-api (7 commits; deploy applies 3 migrations), klokd repo (website redeploys; worker + employer OTA on `preview`) | You → Eng | ⬜ Waiting for your go |
| 10 | Check production for old seed-demo rows (OQ-21) — staff console → Users, phones `+25472000000…` / `+25471000000…` | You | ⬜ |
| 11 | Privacy Policy §6 says "encrypted at rest" — not true of the SQLite file until the Postgres move (OQ-22) | You + counsel | ⬜ |

---

## 3. API (octopus-api)

| Feature | Status | Notes |
|---|---|---|
| Phone sign-in (Identiti + OTP), refresh, sign-out | ✅ | Codes echoed while SMS is down |
| Staff sign-in (phone + access key) | ✅ | Needs correct `ADMIN_PHONES` |
| Worker profile, consent, skills, ID check (IPRS via Identiti) | ✅ | |
| Employer profile, KRA PIN, WIBA declaration | ✅ | |
| Post shift (min-wage, KRA, WIBA gates), feed by distance, apply, withdraw | ✅ | |
| Pick worker, re-hire offers, accept / decline / cancel, reopen | ✅ | |
| s.9 contract generated at selection | ✅ | |
| Attendance: arrive (geofence) → start PIN → clock-out; employer override | ✅ | Append-only events, geohash only |
| No-show watcher (late warning, no-show, wait / replace / cancel) | ✅ | |
| Settlements: deductions, 4% fee, approve, auto-approve at 4 h | ✅ | |
| Review queue for flagged check-ins; employer override alerts | ✅ | |
| Disputes (file, review, decide → updates pay) and ratings | ✅ | |
| Notifications: inbox, Expo push, Todoku fallback | ✅ / 🟡 | Push needs native app builds |
| Escrow hold, funded-hold gate, payouts, step-up, refunds, retry | 🟡 | Activates with Kipkiren Pay credentials (KP-9) |
| Wallet creation at onboarding | 🟡 | Waiting on Kipkiren Pay (KP-10) |
| Hakken broadcast of open shifts | 🟡 | App still `provisioning` on Hakken's side (OQ-17) |
| Helpan agent (briefings, delegated sign-up) | 🟡 | Rail returned 500s (OQ-16) |
| DPA: export, correction/deletion requests, erase, breach log | ✅ | |
| Compliance config changes + history, statutory monthly report / CSV | ✅ API | Web screens to do (§6) |
| Offline check-in queue | ✅ 19 Oct | Replay once per tap; timed from the phone's monotonic clock; flagged for review (D-63) |
| Rate guide for Post a Shift | ✅ 19 Oct | Klokd's own postings, last 90 days, middle half; legal minimum (D-65) |
| Attendance-event retention job | 🟡 Built 19 Oct | Runs once `ATTENDANCE_RETENTION_MONTHS` is set (OQ-20) (D-64) |
| Formal OWASP / encryption review | ✅ 19 Oct | `SECURITY_REVIEW.md`: 13 fixed (incl. pay/dispute access leaks), 6 open (D-67) |
| Load test at 80 users / 30 min | ✅ 19 Oct | Local copy: 301,338 requests, 0 errors, p95 128 ms, p99 155 ms |

---

## 4. Worker app

| Screen / feature | Status |
|---|---|
| Welcome, sign-in (Identiti), consent, ID verification, skills | ✅ |
| Home (offers, upcoming, nearby shifts) | ✅ |
| Shift detail, apply, accept / decline, contract | ✅ |
| Check-in (GPS) → start PIN → active shift → clock-out | ✅ |
| Report a problem (dispute) | ✅ |
| Shifts tab, Pay tab (per-shift breakdown, payout state), step-up confirm | ✅ (payouts 🟡) |
| Profile / Me (data rights, sign out), notifications inbox | ✅ |
| M-Pesa setup | 🟡 Waits on Kipkiren Pay wallets |
| Store-build readiness: idempotency key on every write; check-in capture evidence (event id, monotonic stamps); PIN live-only | ✅ |
| Push notifications: registers after sign-in, banners while open, tap opens inbox | ✅ iPhone via Expo Go · Android needs an APK build + Firebase push key |
| Android APK (preview, installable without Play Store) | ✅ 13 Oct 2026 — shared with investor; gets OTA updates from the `preview` channel |
| Play Store / TestFlight builds | ⛔ Needs Google Play ($25) and Apple Developer ($99/yr) accounts |
| Offline check-in (saved without signal, sent later) | ✅ 19 Oct (OTA pending) |

## 5. Employer app

| Screen / feature | Status |
|---|---|
| Welcome, sign-in (real OTP + profile) | ✅ |
| Verify business (KRA PIN, WIBA) | ✅ |
| Dashboard (week, spend, awaiting approval, show-up rate) | ✅ |
| Post a shift (incl. re-hire offer), shifts list | ✅ |
| Shift detail: applicants, pick, start PIN, attendance, override, no-show actions, approve pay, rate, dispute | ✅ |
| Pay / billing | ✅ (funding 🟡) |
| Team (re-hire) | ✅ |
| Notifications inbox | ✅ |
| Fund a shift / payment method | 🟡 Waits on Kipkiren Pay |
| Idempotency key on every write (store-build readiness) | ✅ |
| Push notifications | ✅ iPhone via Expo Go · Android needs APK + Firebase key |
| Store builds | ⛔ Needs Google Play and Apple Developer accounts |
| Rate guide strip | ✅ 19 Oct (OTA pending) |

## 6. Website (klokd.co.ke)

| Area | Status |
|---|---|
| Landing (honest copy), legal pages, early-access waitlist | ✅ |
| Fits phones, tablets and desktop (audited at 360 / 390 / 768 / 1280 px) | ✅ |
| Worker area: home, shifts, shift detail, pay, me | ✅ |
| Employer area: dashboard, shifts, attendance panel, verify, pay, team | ✅ |
| Staff console: overview, verification, attendance review, disputes, pay & payouts, privacy (DSR), audit, users | ✅ |
| Staff console: statutory rates — view, validated edit, reset to default, history | ✅ |
| Staff console: monthly statutory report (payouts + calculated at clock-out), CSV | ✅ |
| Staff console: breach log — report, 72-hour ODPC countdown, notified / contained / closed, notes | ✅ |
| Re-open public sign-in | ⛔ After SMS works and echo is off |
| SEO: pre-rendered `/`, `/terms`, `/privacy`, sitemap, robots | ✅ 19 Oct (deploy pending) |

---

## 7. Platform and infrastructure

| Item | Status |
|---|---|
| API on Railway, auto-deploy on push | ✅ |
| Website on Railway (Caddy), custom domain klokd.co.ke | ✅ |
| octopus-api in its own repo and Railway project; website and apps on the new address | ✅ |
| Previous address forwards to octopus-api (Railway `klokd` service); delete once partners have moved | ✅ / ⬜ |
| Database on the volume (absolute path), daily backups on volume + Supabase | ✅ |
| Account suspension enforced; per-caller rate limits; CORS allowlist; staff-only demo routes | ✅ |
| Postgres (Supabase) for production | 🟡 Prepared 19 Oct (`POSTGRES_MIGRATION.md`); needs a project + window (OQ-23) |
| Both apps on the `mumbus` Expo account (new projects; `preview` channel) | ✅ |
| One `_dmarc` record on klokd.co.ke (OQ-18) | ✅ 19 Oct (`p=reject`) |
| Core / Klokd-arm split for LunchDrop (see octopus-api `SPEC.md` §16) | ✅ Step 1, 19 Oct (four core→arm imports left) |

---

## 8. Partners (KMV rails)

| Rail | Klokd side | Partner side |
|---|---|---|
| Identiti | ✅ | ⛔ Supabase free tier pauses (OQ-15) |
| Todoku | ✅ | ⛔ SMS / voice / WhatsApp unavailable (OQ-13); webhook URL registration pending |
| Kipkiren Pay | 🟡 All code built (KP-1 – KP-8) | ⛔ Credentials + sandbox payout (KP-9), wallets (KP-10) |
| Hakken | ✅ | ⛔ Flip app to `active` (OQ-17) |
| Helpan | ✅ | ⛔ 500s on writes (OQ-16) |

When octopus-api moves address, partners must update webhook URLs.

---

## 9. Business, legal and compliance (not code)

| # | Item | Owner | Status |
|---|---|---|---|
| OQ-01 | Legal opinion: marketplace vs employer obligations | Chamia / counsel | ⛔ |
| OQ-02 | WIBA option A (employer-held) or B (Klokd per-shift) | Ivy | ⛔ |
| OQ-03 | AHL enforceability | Counsel | ⛔ |
| OQ-04/05 | Escrow / CBK licensing and wording | Counsel | ⛔ |
| — | ODPC registration (controller + processor) | Chamia | ⛔ |
| — | DPAs with processors; DPIA | Chamia / Ivy | ⛔ |
| — | Privacy Policy + Terms reviewed by counsel; registered company name (OQ-11) | Counsel | ⛔ |
| — | KRA PIN, PAYE, NSSF, SHIF registrations | Chamia | ⛔ |
| OQ-06 | Second developer | Chamia | ⛔ |
| OQ-20 | Attendance-event retention period | Counsel | ⛔ |

---

## 10. Beta-ready checklist

- [x] End-to-end loop in code: post → pick → check-in → PIN → clock-out → settlement → rating
- [x] WIBA gate, minimum-wage gate, Section 37 alerts (20 / 25 / 30 days)
- [x] Auto-approval of pay after 4 hours
- [ ] Real KES paid to a real M-Pesa number (Kipkiren Pay)
- [ ] Real SMS sign-in codes; echo off
- [ ] Push notifications on phones (store builds)
- [ ] Database persistence verified + backups
- [ ] ODPC registered; Privacy Policy published; DPAs signed
- [x] Load test: 80 users, 30 minutes, zero errors (local copy, 19 Oct)
- [ ] 50 employers + 200 workers onboarded

---

## Out of scope for MVP

Algorithmic matching · GraphQL · EOR portal · Enterprise HR API · per-shift micro-WIBA · labour-market intelligence API · AHL deductions (off pending legal) · MFI loans · pan-Africa white-label.

*Update this file with the reboot pack at the end of every session.*
