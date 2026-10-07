# Klokd — path to a real-money closed pilot (Tier 2 go-live)

**Date:** 18 Jul 2026
**Goal:** a small group of real workers doing real paid shifts, real M-Pesa payouts, real KYC.
**One-line truth:** Klokd's code is done. Everything below is an operator credential, an external approval, or company/legal paperwork — **none of it is code I can write.** Two of these have real lead times and must start *today*.

---

## The two long poles — START TODAY (nothing ships without these, and they take real time)

### LP-1. Klokd Workplace Solutions Ltd — registered legal entity
- **Why it blocks everything:** Kipkiren Pay cannot open a **corporate payment account** (`account_uuid`, tier_3) for a company that isn't legally registered. No corporate account → no escrow → no payouts → no pilot.
- **Owner:** You / Chamia (CHAMIA-ENTITY decision, still open in RECAP).
- **Lead time:** ~1–3 weeks in Kenya (registration + KRA PIN + bank).
- **Action today:** confirm registration status. If not registered, start it now — this is the gate under the gate.

### LP-2. Kipkiren Pay production + M-Pesa B2C live
- **Why it blocks everything:** real KES reaches workers only through KP's M-Pesa B2C (Klokd never touches Daraja directly — AD-K01). KP going *production* on M-Pesa is a **CBK / Safaricom approval gate** (RECAP OI-06), which is the scariest unknown timeline here.
- **Owner:** Kipkiren Pay ops (KP-1-Ops) + their CBK/Safaricom process.
- **Action today:** get a **real date** from KP for production M-Pesa, and ask the key question: *is there a limited-live option for a closed pilot* (capped volume, real payouts) so you're not waiting on full production approval?

> These two are the honest bottleneck. Get real dates on both this week or the pilot date is fiction.

---

## Operator items — escalate to Silvia / KP now (they gate, but are ~hours of their time)

| # | Item | Owner | Gates |
|---|---|---|---|
| OP-1 | KP deploy + creds (`PAYMENT_RAIL_API_BASE`, `PAYMENT_RAIL_APP_SECRET`) | KP-1-Ops | escrow + payout |
| OP-2 | Klokd KP corporate `account_uuid` (tier_3) via `onboard-account.ts` | KP (after LP-1) | escrow funding |
| OP-3 | **Identiti `POST /v1/customers` fixed** (currently 500ing — the outage we bridged with `RAIL_FALLBACK_LOCAL`) | Silvia | real KYC / real worker verification |
| OP-4 | Todoku **production** SMS OTP delivery confirmed | Silvia | real workers signing in (RECAP: prod likely unaffected — just confirm) |

---

## Klokd-owned — no external dependency, I do this week

| # | Item | State |
|---|---|---|
| K-1 | **Go-live runbook** — exact env-var flip sequence so creds→live is minutes, not a sprint | I write it |
| K-2 | Flip `RAIL_FALLBACK_LOCAL=false` on Railway (only *after* OP-3 lands — else real users get placeholder accounts) | 1-line, sequenced |
| K-3 | **Privacy Policy + Terms** pages — the app already links to them; they must actually exist for real users | I draft |
| K-4 | Verify payment spine end-to-end against KP **sandbox** the moment OP-1 creds land (escrow → clock-out → auto-release → M-Pesa receipt) | ready to run |
| K-5 | Confirm APKs/updates point at prod API (they already default to Railway) + OTA a build with `RAIL_FALLBACK_LOCAL` UI guard | minor |

---

## Legal / regulatory minimum for a CLOSED pilot — counsel confirms scope

Even a small real-money pilot touches real PII + real wages. Counsel decides what's mandatory vs deferrable at pilot scale, but flag now:

| # | Item | Note |
|---|---|---|
| L-1 | **ODPC registration** (data controller) | you process real National-ID-verified identities (via Identiti; Klokd never *stores* the ID — AD-K02) |
| L-2 | **WIBA** worker-injury cover | real workers on real shifts = real injury liability; arrange cover for pilot workers |
| L-3 | PAYE / NSSF / SHIF remittance path | the app *calculates* these (`paystatement.service`); someone must actually *remit* them for real wages |
| L-4 | Privacy Policy + Terms live (K-3) | consent copy already in the onboarding flow |

---

## Realistic sequence

1. **This week:** start LP-1 (company reg) + get KP's real M-Pesa date (LP-2). Escalate OP-1..4. I deliver K-1, K-3.
2. **When OP-1 + OP-3 land:** I run K-4 (payment spine vs KP sandbox), flip K-2, we test the full real loop in staging.
3. **When LP-1 + LP-2 land:** real corporate account + production M-Pesa → invite pilot workers → **live.**
4. Counsel signs off L-1..L-4 in parallel.

**The date you can actually commit to = max(company-reg date, KP-production-M-Pesa date).** Everything else fits inside those. Get those two dates and you have your launch date; without them, any date is a guess.

---

*Klokd code is not on the critical path and hasn't been for over a month. The pilot ships when the company is registered and KP's M-Pesa is live — start both clocks today.*
