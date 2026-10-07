# Operator Request — Hakken entity schemas + Klokd integration timing reconciliation

**To:** Silvia Mumbua (CTO · Kipkiren Teknolojia · Hakken rail operator)
**From:** Klokd engineering · Chamia Mutuku (CEO · Klokd Workplace Solutions Ltd) · authored 9 June 2026
**Authority:** Klokd Rails Integration Advisory v1.0 §2.4 (Hakken per-rail — v1 pilot scope, two-sided discovery) + Sprint Backlog Delta v1.1 Part C (S5-NEW-01 + S8-NEW-01) + Part G #5 (Hakken entity schema)
**Status:** 🟡 BLOCKED on operator action — **OI-05** of 9 open items · sequenced AFTER Identiti / KP / Todoku (Hakken consumes `account_uuid` and shift-state references from those upstream surfaces)
**Estimated operator effort:** ~1 hour (schema confirmation) + 1 reconciliation call (Hakken HK-8 timing — see §0)
**External lead time:** none

---

## 0. The reconciliation question first (before §1 schema work)

**There's a timing contradiction worth reconciling before Klokd Sprint 5 starts.**

- **Hakken-rail side:** HK-7 closed 3 June 2026 already shipped **`klokd_two_sided_v1` plugin** (dual-pass workers + shifts). HK-8 PARTIAL (12/20 pts shipped) — remaining 8 pts blocked on **OD-9 Klokd dev resource**.
- **Klokd advisory side (June 2026):** "Hakken is not Phase 1 infrastructure for Klokd. The MVP shift feed (`GET /shifts/available`) is built as a Klokd-internal endpoint in Sprint 4 and remains so through Phase 3. Hakken integration is scoped for Phase 3 (Worker App MVP, Sprint 8+)."

**Two interpretations — Silvia decides:**

| (a) Defer Klokd-Hakken to Phase 3 (Sprint 8+ per advisory) | (b) Accelerate to unblock Hakken HK-8 |
|---|---|
| Klokd Sprint 5 (S5-NEW-01) ships **entity registration only** — non-blocking POST/PATCH to Hakken when shifts post/fill/expire. Klokd does NOT yet query Hakken for the shift feed. | Klokd brings Sprint 5 + 8 forward to unblock Hakken HK-8 finish. Klokd queries Hakken for `GET /shifts/available` immediately. |
| Hakken HK-8 closes its remaining 8 pts WITHOUT Klokd-side wiring (HK-8 PARTIAL becomes HK-8 CLOSED on Hakken's own timeline). The "OD-9 Klokd dev resource" blocker is interpreted as "we've documented + tested the plugin in HK-7; remaining 8 pts are docs/runbook/joint sign-off, not Klokd-side wiring". | Klokd dev resource is allocated to Hakken-integration work even though Klokd's product Sprint 8 isn't ready. |
| **Recommended.** Aligns with the advisory's explicit Phase 3 scoping. | Riskier — pulls Klokd dev forward of its own product roadmap. |

Please confirm before §1 work begins. The schema confirmation in §1 is needed either way; the **active query work** in §3 is gated on the answer to (a) vs (b).

---

## 1. The ask — confirm entity schemas (per advisory §2.4 + delta S5-NEW-01)

Klokd needs the canonical Hakken entity schemas for shift + worker registration. The advisory describes the surface in prose; the schema needs to be confirmed (field names, types, required vs optional, validation rules).

### 1.1 Shift entity (per advisory §2.4 + §3 surface 1)

Klokd will POST to register shift entities. Proposed fields (please confirm or correct):

```typescript
interface HakkenShiftEntity {
  shift_id: string;             // Klokd UUID — required
  account_uuid: string;         // Employer Identiti account_uuid — required
  role: string;                 // e.g. 'waiter', 'barista', 'cleaner' — required
  geo_hash: string;             // Klokd-side geo_hash (raw GPS NEVER passed per D-13) — required
  start_time: string;           // ISO 8601 — required
  end_time: string;             // ISO 8601 — required
  rate_kes_minor: number;       // KES minor units (e.g. 50000 = KES 500) — required
  employer_rating: number;      // 1–5 aggregate (≥3 ratings shown per reboot pack §10) — optional
  status: 'posted' | 'filled' | 'expired'; // — required
  posted_at: string;            // ISO 8601 — required
}
```

### 1.2 Worker entity (per advisory §2.4 + §3 surface 2)

Klokd will POST to register verified workers (KYC tier ≥ 1). Proposed fields (please confirm or correct):

```typescript
interface HakkenWorkerEntity {
  account_uuid: string;         // Identiti account_uuid — required
  geo_hash: string;             // Klokd-side geo_hash from rider home location — required
  specialisations: string[];    // e.g. ['waiter', 'barista', 'event_setup'] — required
  show_up_rate: number;         // 0–1 (e.g. 0.87 = 87% historical) — optional until ≥10 shifts
  rating: number;               // 1–5 aggregate (≥3 ratings shown) — optional
  availability_signal: 'available' | 'busy' | 'offline'; // — required
  kyc_tier: 1 | 2;              // ≥1 required for Hakken registration — required
}
```

### 1.3 Discovery query (Phase 3 / Sprint 8+ per AD-K09)

Klokd-side endpoints will query Hakken when shift feed migrates from internal to Hakken-backed (per advisory §4 phase 3):

```
GET /hakken/discovery/shifts
  ?requester_uuid=<worker_account_uuid>
  &geo_hash=<worker_location>
  &role_filter=<optional>
  &limit=20

GET /hakken/discovery/workers
  ?shift_id=<klokd_shift_id>
  &context=<applicants_for_shift|search>
```

Confirm exact field names, query param shape, and response envelope.

### 1.4 Critical: ShiftEventLog is the source of truth (per advisory §4)

> "Hakken is never the source of truth for shift status. ShiftEventLog is. A shift in Hakken's index may have been filled (status: confirmed) since it was last indexed. Klokd always cross-references Hakken results against its own ShiftEventLog before returning them to the worker."

Confirm Hakken doesn't enforce shift state — Klokd reserves the right to filter Hakken-returned results against its own ShiftEventLog.

---

## 2. Sprint 5 — entity registration (non-blocking)

Per delta S5-NEW-01:

- Klokd calls `POST /hakken/entities/shifts` on shift posted (Klokd-internal `POST /shifts`)
- Klokd calls `PATCH /hakken/entities/shifts/:id` on shift filled or expired
- Klokd calls `POST /hakken/entities/workers` on worker KYC tier ≥ 1 confirmed (KYC_TIER_CHANGED Identiti webhook)
- Klokd calls `PATCH /hakken/entities/workers/:id` on worker rating update, availability change
- **Non-blocking:** if Hakken call fails, the upstream Klokd flow still completes. Failure logged to `audit_log` (event_type=`hakken_entity_registration_failed`); retry via background job

Phase 1 (Sprint 5–7): `GET /shifts/available` remains Klokd-internal sort (S4-05 unchanged). Hakken is registered but not yet queried.

---

## 3. Sprint 8+ — discovery backing (Phase 3 per AD-K09)

Per delta S8-NEW-01:

- `GET /shifts/available` migrates from Klokd-internal sort to Hakken-backed discovery
- `GET /shifts/:id/applicants` migrates from Klokd-internal proximity/rating sort to Hakken worker ranking
- Klokd resolves full shift/worker data from own DB; cross-references Hakken ranking with own ShiftEventLog
- Klokd adds KMPDC badge (Health), compliance flags, shift-specific context to the Hakken-ranked list

---

## 4. Klokd-side commitments (informational)

| Item | Owner | Status |
|---|---|---|
| Hakken HMAC client wrapper (mirror Lunch Drop + Itafika identiti client pattern) | Klokd Sprint 5 | Built when OI-05 lands + this request's schema confirmation |
| Entity registration as background job (non-blocking) | Klokd Sprint 5 | Per S5-NEW-01 AC: shift post + worker verification flows complete even if Hakken down |
| Phase 3 swap of `GET /shifts/available` resolver from Klokd-internal to Hakken-backed | Klokd Sprint 8 | Per AD-K09 + S8-NEW-01 |
| Cross-reference Hakken results against Klokd ShiftEventLog | Klokd Sprint 8 | Per advisory §4 |
| `actor` + `initiated_by` claim propagation (§A.2) | Klokd Sprint 5 | Built into client at scaffold |
| `traceparent` + `business_op_id` (`shift_id` or `worker_account_uuid`) on audit rows | Klokd Sprint 5 | Built in at scaffold |

---

## 5. Env vars (after OI-05 lands + entity schemas confirmed)

| Env var | Value type | Notes |
|---|---|---|
| `HAKKEN_BASE_URL` | URL string | Sandbox first; eu-west-1 prod when wired. Klokd loads from env per AD-K06 pattern (mirror of payment-rail). |
| `HAKKEN_APP_ID` | UUID | App registration UUID. Suggest `klokd`. |
| `HAKKEN_APP_SECRET` | HEX HMAC-SHA-256 (64 chars) or per Hakken contract | Confirm encoding. |
| (no webhook secret expected at MVP — Hakken doesn't push to Klokd) | — | — |

---

## 6. Cross-reference

- Klokd advisory: [`chamia new docs/klokd_rails_integration_advisory.md`](./chamia%20new%20docs/klokd_rails_integration_advisory.md) §2.4 (Hakken v1 pilot scope — two-sided) + §4 (shift discovery flow, ShiftEventLog as source of truth)
- Klokd delta: [`chamia new docs/klokd_sprint_backlog_delta_silvia_v1.1.md`](./chamia%20new%20docs/klokd_sprint_backlog_delta_silvia_v1.1.md) S5-NEW-01 + S8-NEW-01 + Part F + Part G #5
- Klokd INSTRUCTION_PACK: [INSTRUCTION_PACK.md](./INSTRUCTION_PACK.md) §4 (cross-rail joints) + §6 AD-K09 + §9 (pre-flight OI-05) + §11 (Hakken contradiction)
- Hakken rail-side: `C:\Projects\hakken\` · `INSTRUCTION_PACK.md` · `RECAP.md` (current state HK-1..HK-7 closed + HK-8 PARTIAL · 134/194 pts) · `klokd_two_sided_v1` plugin shipped at HK-7 (commit `5caa622`)
- Cross-rail joint contract (already shipped on Hakken side): plugin manifest in `C:\Projects\hakken\src\modules\plugins\klokd_two_sided_v1/` (or similar — verify path)

---

*Operator Request 4/4 · Hakken entity schemas + integration timing reconciliation for Klokd · 9 June 2026 · Confidential · OI-05 · Sprint 5 + Sprint 8 blocker · Depends-on: OPERATOR_REQUEST_IDENTITI.md (`account_uuid` upstream)*
