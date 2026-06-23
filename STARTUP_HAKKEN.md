# Startup Prompt — Klokd v3 ← Hakken integration (Phase 1)

> **Purpose:** Paste the fenced block below into a fresh Claude Code session opened at `C:\Projects\Klokd\` to bootstrap the Hakken consumer integration. Phase 1 only (entity registration + broadcast publishing). Phase 3 (ranking-query swap) is Sprint 8+ and out of scope here.

---

```
You are Claude Code working at C:\Projects\Klokd\.

This session: wire Klokd v3 into the Hakken discovery rail per the `klokd_two_sided_v1`
plugin (HK-7 shipped). Phase 1 only — entity registration + broadcast publishing as
non-blocking background jobs. Phase 3 ranking-query swap is Sprint 8+ and OUT of scope.

Klokd → Itafika is also OUT of scope for this session. No Klokd-Itafika joint exists in
any canonical doc. If asked to wire it, refuse and defer to Chamia (see playbook §3.3).

AUTHORITY DOCS (read in order):
1. docs/HAKKEN_ITAFIKA_INTEGRATION_PLAYBOOK.md (cross-cutting playbook; this is your map)
2. docs/HAKKEN_INTEGRATION_REFERENCE.md (canonical Hakken wire contract — Chamia 22 Jun)
3. INSTRUCTION_PACK.md (Klokd v3 build pack — Sprint 3 closed 10 Jun, 4 rails integrated)
4. OPERATOR_REQUEST_HAKKEN.md (OI-05 — entity schemas + HK-8 timing reconciliation)
5. chamia new docs/klokd_rails_integration_advisory.md §2.4 (Hakken v1 pilot scope — two-sided)
6. chamia new docs/klokd_sprint_backlog_delta_silvia_v1.1.md (S5-NEW-01 + S8-NEW-01 + Part F + G #5)
7. KMV_RAILS_INTEGRATION_GUIDE.md (your canonical HMAC + envelope + idempotency pattern)
8. C:\Projects\hakken\src\plugins-impl\klokdTwoSidedV1.ts (plugin impl — exact scoring weights)
9. C:\Projects\hakken\docs\pilots\klokd-integration.md (rail-side joint, §7 worked examples)
10. C:\Projects\hakken\scripts\pilotSmoke.ts (rail-side smoke — mirror its assertions)

LAST-KNOWN STATE (per master RECAP 23 Jun):
- Klokd v3 Sprint 3 CLOSED 10 Jun. 4 rails integrated (Identiti, Todoku, KP, Helpan).
  Hakken pending = THIS work. Last code commit 9572095 (22 Jun, EAS chore).
- Hakken HK-1..HK-7 closed + HK-8 PARTIAL (12/20) + HK-9 PARTIAL + HK-10 PARTIAL+.
  149/149 tests. Plugin klokd_two_sided_v1@v1 SHIPPED. HK-8 still blocked on OD-9
  (Klokd dev = you).
- Auth mode during pilot: 3-header pair (Authorization Bearer Identiti-JWT +
  X-Hakken-App-Key + X-Hakken-App-Secret). Full HMAC swap = HK-9 (post-pilot).

SCOPE (Phase 1 per advisory §2.4 + delta S5-NEW-01):

1. Scaffold src/rails/hakken/client.ts mirroring src/rails/payment-rail/client.ts shape.
   Three-header auth. Idempotency-Key header on every POST.
2. POST /v1/entities entity_type='employer' role_flags=['publisher','employer']
   on each KYC tier-≥1 employer (Identiti KYC_TIER_CHANGED webhook trigger).
   business_op_id = your internal employer_id. external_ref = "klokd:emp:<id>".
3. POST /v1/entities entity_type='worker' role_flags=['worker'] on KYC tier-≥1 worker.
   business_op_id = worker_account_uuid. external_ref = "klokd:worker:<uuid>".
4. PATCH /v1/entities/:id on worker rating + availability changes (no status field —
   status uses separate PATCH with status='retired' on offboarding).
5. POST /v1/broadcasts on each shift posted. Body envelope:
   {
     publisher_id: <CACHED entity_id UUID returned by POST /v1/entities for the employer
                    — NOT your internal employer_id; "klokd:emp:42" → 404 PUBLISHER_NOT_FOUND>,
     broadcast_type: "shift_open",
     payload: { shift_id, role, shift_start_at, shift_end_at, pay_rate_kes, ...},
     geo: { lat, lng },                  // numeric, privacy-safe per D-13
     consent_scope: "cross_app_optional", // REQUIRED — single_app | cross_app_optional | cross_app_required
     ttl_at: <ISO-8601, ≤ now + 168h>     // REQUIRED — e.g. = shift_end_at
   }
   Idempotency-Key = your shift_id. business_op_id propagates via traceparent + Idempotency-Key
   (NOT via the body). Hakken emits hakken.shift_opening to Todoku automatically.
6. DELETE /v1/broadcasts/:id on shift filled / cancelled (soft-revoke before TTL). Expired
   broadcasts are reaped by Hakken's own TTL sweeper — DELETE on an already-expired broadcast
   may 404, treat as success.
7. NON-BLOCKING failure mode — upstream Klokd flow completes; rail failure logged to
   your audit_log; retry via background job with exp backoff. Use shift_id /
   employer_id / worker_account_uuid as Idempotency-Key (deterministic per-business-op).

HARD RULES (from playbook §7):
- No emojis · No Co-Authored-By: Claude / Generated with Claude Code trailer · KES integer minor units.
- No raw GPS — wire field is geo: { lat: <number>, lng: <number> } NUMERIC (not a geo_hash
  field). Compute privacy-safe coordinates client-side per Hakken D-13 (H3-cell centroid
  or hash-derived lat/lng), and pass the result in the numeric geo field. Outside Kenya
  bbox → 400 GEO_OUT_OF_REGION; malformed lat/lng → 400 GEO_INVALID.
- §10.7 banned-key wall: pay_rate_kes is fine; amount / currency / funds / monetary_value /
  source_payment*  / etc → 422 REGULATORY_CONTAINMENT_VIOLATION at any depth.
  *source_payment carved out for /v1/entities and /v1/tiers only.
  Approved alternatives: pay_rate_kes: 800 · tier_slug: 'boosted'.
- §5 PII wall: no MSISDN (+254/254/07/01), no email, no two-word capitalised names,
  no field literal name/full_name/first_name/last_name. Use worker_id / shift_id / opaque labels.
- §A.11: traceparent + business_op_id (= shift_id or worker_account_uuid) on every audit row.
- Money Rule does NOT apply (Hakken doesn't touch money) — sub-agents OK for mass mechanical work.
- §6.4 cross-rail consistency: test count goes UP not down. typecheck + tests clean at end of day.

PRE-FLIGHT (run before opening source):
- pnpm typecheck && pnpm test → confirm green baseline
- curl https://hakken-production.up.railway.app/v1/health → 200
- HAKKEN_APP_SECRET for app_slug='klokd' delivered by Silvia → loaded in .env (gitignored)
- Identiti customer JWT minting works in this app AND the JWT carries aud=hakken
  (in addition to iss=$IDENTITI_JWT_ISSUER, sub=<user_uuid>). If your existing JWT
  is minted with aud=klokd, you must either mint a SECOND JWT for Hakken or extend
  the audience claim. Audience mismatch → 401 AUTH_JWT_AUDIENCE on every protected POST.

FIRST STEPS (3-day rhythm — playbook §6.1):
- Day 1: Authority doc pass → client.ts scaffold mirroring PaymentRailClient shape →
  4 unit tests:
    (a) three-header auth (Bearer JWT with aud=hakken + X-Hakken-App-Key + X-Hakken-App-Secret)
    (b) JWT injection (assert aud=hakken claim)
    (c) Idempotency-Key inclusion on POST
    (d) 409 taxonomy: retry IDEMPOTENCY_KEY_IN_FLIGHT (with backoff); surface
        IDEMPOTENCY_KEY_CONFLICT + ENTITY_EXISTS as terminal (no retry — would hot-loop).
- Day 2: Entity registration + broadcast publishing as background jobs.
  - Cache the entity_id (UUID) returned by POST /v1/entities, keyed by your internal
    employer_id / worker_account_uuid. You'll reuse it as publisher_id on broadcasts.
  - shift_open broadcasts: publisher_id=<cached entity_id UUID>, consent_scope (required),
    ttl_at (required, ≤ now + 168h, e.g. = shift_end_at).
  - DELETE for shift_filled / cancelled (soft-revoke); expired = 404, treat as success.
  - 6 unit tests + 1 integration smoke against sandbox.
- Day 3: scripts/smoke-hakken.ts mirroring C:\Projects\hakken\scripts\pilotSmoke.ts;
  §A.11 propagation test; banned-key wall test; document in docs/HAKKEN_INTEGRATION_RESULT.md;
  OPERATOR_REQUEST_HAKKEN.md follow-up if any gaps surfaced.

HARD BLOCKERS (playbook §8):
- OD-9 Klokd dev allocation (= you).
- Identiti klokd_sandbox HMAC secret STILL not delivered to operator (14 days stale per
  master RECAP). Hakken integration requires Identiti customer JWT — block on this until
  Silvia delivers.
- Hakken HAKKEN_APP_SECRET for klokd from Silvia — pending out-of-band delivery.
- OPERATOR_REQUEST_HAKKEN.md §0 reconciliation answer from Silvia (Phase 3 vs accelerated
  timing) — not blocking Phase 1 but should land before Phase 3 work starts.

Confirm scope before significant changes. Treat "proceed" as full authorization.
```
