# Hakken Integration Reference

**Authored:** Chamia Mutuku (CEO · KMV) · canonical for Klokd + Lunch Drop Hakken consumers.
**Mirror:** `C:\Projects\lunch drop\docs\HAKKEN_INTEGRATION_REFERENCE.md` (identical copy).
**Status:** Source-of-truth for the wire contract during the Hakken pilot. Self-contained — no need to read the Hakken repo if you stay within this.

---

## 1. Environments

| Environment | Base URL | Status |
|---|---|---|
| Production | `https://hakken-production.up.railway.app` | Live; awaiting secrets |
| Staging | TBA (pilot kickoff) | Provisioned with allocation |
| Local | `http://localhost:3000` | `npm run dev` against `.env` |

---

## 2. Auth — interim header pair (this is what main accepts today)

Every protected route requires THREE headers:

```
Authorization:        Bearer <identiti-customer-JWT>
X-Hakken-App-Key:     <your app_slug: klokd or lunch_drop>
X-Hakken-App-Secret:  <hmac_secret delivered by Silvia at registration>
```

- `Authorization` carries an Identiti-issued RS256 JWT (`iss = $IDENTITI_JWT_ISSUER`, `aud = hakken`, `sub = user_uuid`). Hakken verifies against Identiti's JWKS.
- `X-Hakken-App-Key` is your `app_slug` (`klokd` or `lunch_drop`).
- `X-Hakken-App-Secret` is your per-app secret. Constant-time compared at `src/plugins/appContext.ts`.

**Future:** the full signed-request scheme (`Authorization: Hakken-HMAC-SHA256 t=…,v1=…`) lands post-pilot (HK-9 swap). Build your client surface to match KMV-guide HMAC for consistency, but the wire mode during pilot is the header pair above.

---

## 3. Tracing + idempotency

Optional but strongly recommended on every protected POST:

```
traceparent:        00-<32-hex-trace-id>-<16-hex-span-id>-01
Idempotency-Key:    <opaque-key, 1..200 chars>
```

- `traceparent` (W3C) propagates to `audit_log` rows, `event_outbox` rows, and the outbound Todoku envelope.
- `Idempotency-Key` (HK-10) — replay with the same body returns the cached envelope (original status preserved); replay with different body returns `409 IDEMPOTENCY_KEY_CONFLICT`. Honored on `/v1/entities` + `/v1/broadcasts`. Recommended values: your internal `shift_id`, `external_ref`, or a UUID minted per business operation.

---

## 4. §10.7 regulatory containment — banned keys

Any payload whose JSON contains a banned key — anywhere, any depth, case-insensitive — is rejected with `422 REGULATORY_CONTAINMENT_VIOLATION` **before** schema validation.

```
amount, currency, funds, credit, yield, float, transfer, disburse, debit,
refund, withdraw, deposit, money, balance, settlement, commission, ledger,
kes_amount, usd_amount, monetary_value, source_payment*
```

\* `source_payment` carved out for `/v1/entities/` and `/v1/tiers` only.

**Approved alternatives:**

- Klokd pay rate → `pay_rate_kes: 800` (integer, minor units)
- LD price → `price_range_kes: [200, 350]` (array of integers)
- Tier reference → `tier_slug: 'boosted'` (never `monetary_value`)

---

## 5. PII wall

Rejected with `400 PII_DETECTED`:

- Kenyan MSISDN (any form: `+254…`, `254…`, `07…`, `01…`)
- Email addresses
- Two-word capitalised name patterns
- Literal field names `name`, `full_name`, `first_name`, `last_name` on any non-empty value

Use opaque IDs: `publisher_id`, `worker_id`, `shift_id`, `kitchen_id`. Never raw human-readable PII in any payload.

---

## 6. Endpoints

### 6.1 POST /v1/entities — register an entity

Request shape (both verticals):

```json
{
  "entity_type": "kitchen|venue|employer|worker|cooperative|fulfilment_provider",
  "display_name": "string, 1..300 chars",
  "role_flags": ["publisher" | "consumer" | "employer" | "worker" | "both"],
  "geo": { "lat": -1.2841, "lng": 36.8225 },
  "geo_label": "CBD",
  "metadata": { "...": "vertical-specific" },
  "external_ref": "your-internal-id (recommended; enables 409-on-duplicate dedup)"
}
```

**Klokd typical:**

```json
{
  "entity_type": "employer",
  "display_name": "Sarova Stanley Front of House",
  "role_flags": ["publisher", "employer"],
  "geo": { "lat": -1.2841, "lng": 36.8225 },
  "metadata": { "sector": "hospitality", "shift_types": ["lunch", "dinner"] },
  "external_ref": "klokd:emp:42"
}
```

```json
{
  "entity_type": "worker",
  "display_name": "<opaque worker label, NOT real name>",
  "role_flags": ["worker"],
  "geo": { "lat": -1.2841, "lng": 36.8225 },
  "metadata": {
    "sector": "hospitality",
    "certifications": ["food_handling"],
    "kyc_tier": 1
  },
  "external_ref": "klokd:worker:<worker_account_uuid>"
}
```

**LD typical:**

```json
{
  "entity_type": "kitchen",
  "display_name": "Mama Wanjiku's Kitchen — Westlands",
  "role_flags": ["publisher"],
  "geo": { "lat": -1.264, "lng": 36.8078 },
  "geo_label": "Westlands",
  "metadata": {
    "cuisine_tags": ["local", "kenyan", "swahili"],
    "fulfilment_paths": ["pickup", "delivery_2km"],
    "price_range_kes": [200, 350]
  },
  "external_ref": "ld:kitchen:42"
}
```

**Response:** `201 Created` envelope with full entity record + server-side `entity_id` (UUID).

**Side effect:** emits `hakken.entity.created` to Todoku.

### 6.2 POST /v1/broadcasts — publish a broadcast

Common envelope:

```json
{
  "publisher_id": "<entity_id from §6.1>",
  "broadcast_type": "<vertical-specific>",
  "payload": { "...": "vertical-specific, ≤64 KB" },
  "geo": { "lat": -1.2841, "lng": 36.8225 },
  "geo_label": "CBD",
  "consent_scope": "single_app | cross_app_optional | cross_app_required",
  "ttl_at": "ISO-8601 future timestamp, within 7 days"
}
```

**Allowed `broadcast_type` by vertical:**

| Vertical | broadcast_type | Outbox event mapped to |
|---|---|---|
| `klokd` | `shift_open` | `hakken.shift_opening` |
| `klokd` | `shift_filled` | (no outbox event) |
| `klokd` | `availability` | (no outbox event) |
| `lunch_drop` | `lunch_ready` | `hakken.fresh_arrivals` |
| `lunch_drop` | `special` | `hakken.fresh_arrivals` |
| `lunch_drop` | `restock` | `hakken.basket_auto_refill` |

**Klokd `shift_open` payload typical:**

```json
{
  "shift_id": "klokd:shift:7711",
  "role": "server",
  "shift_start_at": "2026-06-12T11:00:00Z",
  "shift_end_at":   "2026-06-12T17:00:00Z",
  "pay_rate_kes":   800,
  "certifications_required": ["food_handling"],
  "sector": "hospitality",
  "headcount": 3
}
```

**LD `lunch_ready` payload typical:**

```json
{
  "shift_id": "ld:lunch:1",
  "headline": "Githeri + sukuma — fresh batch out",
  "items": [
    { "name": "Githeri", "tags": ["local", "vegetarian"], "price_range_kes": [180, 250] },
    { "name": "Sukuma + ugali", "tags": ["local"], "price_range_kes": [200, 280] }
  ],
  "fulfilment_paths": ["pickup", "delivery_2km"],
  "estimated_servings": 40,
  "available_until_at": "2026-06-12T14:00:00Z"
}
```

**LD `restock` payload typical:**

```json
{
  "restock_id": "ld:restock:1",
  "item_name": "Sukuma + ugali",
  "estimated_servings": 12,
  "available_until_at": "2026-06-12T15:30:00Z"
}
```

**Response:** `201 Created` envelope. `indexed_at: null` initially; broadcast is searchable within ~5s once the indexer worker stamps it.

### 6.3 POST /v1/ranking/query — discovery query

**LD (one-sided, consumer-facing):**

```json
{
  "vertical": "lunch_drop",
  "user_uuid": "<jwt sub>",
  "user_role": "consumer",
  "query_type": "one_sided",
  "query": {
    "geo": { "lat": -1.264, "lng": 36.8078 },
    "radius_m": 2000,
    "filters": {
      "entity_type": "kitchen",
      "cuisine_tags": ["local"],
      "price_range_kes_max": 500
    },
    "intent": "lunch_ready"
  },
  "options": { "limit": 20, "include_explanation": true }
}
```

**Plugin:** `lunch_drop_v1@v1`. Weights (Spec §6.3):

```
recency        0.25     distance       0.20     filter_match  0.15
tx_signal      0.20     tier           0.10     verification  0.05
eta_band       0.05     (Itafika; 0 until that integration lands)
```

**Klokd (two-sided — pass via `user_role`):**

```json
// Pass 1: workers for an employer's shift (consumer-side)
{
  "vertical": "klokd",
  "user_uuid": "<jwt sub>",
  "user_role": "consumer",
  "query_type": "two_sided",
  "query": {
    "geo": { "lat": -1.2841, "lng": 36.8225 },
    "radius_m": 10000,
    "filters": {
      "role_flag": "worker",
      "certifications": ["food_handling"],
      "pay_rate_kes_min": 500,
      "sector": "hospitality"
    },
    "intent": "shift_open",
    "shift_id": "klokd:shift:7711",
    "shift_window": {
      "start": "2026-06-12T11:00:00Z",
      "end":   "2026-06-12T17:00:00Z"
    }
  },
  "options": { "limit": 25 }
}
```

```json
// Pass 2: shifts for a worker (publisher-side / worker-facing)
{
  "vertical": "klokd",
  "user_uuid": "<jwt sub>",
  "user_role": "publisher",
  "query_type": "two_sided",
  "query": {
    "geo": { "lat": -1.29, "lng": 36.82 },
    "radius_m": 10000,
    "filters": {
      "certifications": ["food_handling"],
      "pay_rate_kes_min": 500,
      "sector": "hospitality"
    }
  }
}
```

**Plugin:** `klokd_two_sided_v1@v1`.
**Pass-1 weights:** `skill 0.25 + pay_rate 0.20 + employer_reliability 0.20 + commute 0.15 + sector 0.10 + tier 0.05 + verification 0.05`.
**Pass-2 weights:** `skill 0.30 + availability 0.20 + commute 0.15 + worker_reliability 0.15 + recency 0.10 + tier 0.05 + verification 0.05`.

**Response shape:**

```json
{
  "ok": true,
  "data": {
    "results": [
      {
        "entity_id": "uuid",
        "broadcast_id": "uuid | null",
        "score": 0.71,
        "verification": "verified",
        "tier_weight": 1.0,
        "distance_m": 850.4,
        "features": [
          { "feature": "skill_match", "contribution": 0.25 },
          { "feature": "pay_rate_match", "contribution": 0.20 }
        ],
        "payload": { "...": "..." }
      }
    ],
    "ranking_metadata": {
      "model_version": "lunch_drop_v1@v1 | klokd_two_sided_v1@v1",
      "latency_ms": 38,
      "fallback_active": false,
      "cache_hit": false,
      "call_id": "uuid",
      "h3_cell": "8744c1c70ffffff",
      "consent_scope_applied": "cross_app_optional"
    }
  },
  "meta": { "request_id": "..." }
}
```

`fallback_active: true` means the plugin threw or exceeded its 50ms budget; the default scorer ran. Soft signal; do not block UI.

### 6.4 List + fetch + revoke (auxiliary)

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/v1/entities/:id` | app | Fetch by id within your app scope |
| PATCH | `/v1/entities/:id` | app | Mutable: `display_name`, `geo`, `geo_label`, `role_flags`, `metadata`, `status` |
| GET | `/v1/entities` | app | Filters: `entity_type`, `role_flag`, `verification`, `status`, `geo=lat,lng,radius_m`, `cursor`, `limit` |
| GET | `/v1/broadcasts/:id` | app | Fetch by id |
| DELETE | `/v1/broadcasts/:id` | app | Soft-revoke. Audited. Only the publishing app can revoke. |
| GET | `/v1/broadcasts` | app | Filters: `publisher_id`, `broadcast_type`, `status`, `geo`, `cursor`, `limit` |
| GET | `/v1/health` | none | LB liveness. Page on this. |
| GET | `/v1/health/deep` | none | Per-component state (HK-10). Page on `status === 'unavailable'`. |
| GET | `/v1/admin/observability` | admin | Operator KPI snapshot (HK-10). Not for app consumption. |

---

## 7. Outbox events (what shows up in Todoku)

Subscribe via your existing Todoku rail client. Each event carries `traceparent`, `business_op_id`, `request_id` for correlation. Idempotent on `X-Idempotency-Key = event_id`.

| Trigger | Event type | Payload keys |
|---|---|---|
| POST `/v1/entities` success | `hakken.entity.created` | `app_slug`, `entity_id`, `vertical`, `entity_type`, `role_flags`, `geo`, `external_ref` |
| PATCH `/v1/entities/:id` (non-deactivation) | `hakken.entity.updated` | `app_slug`, `entity_id`, `fields_changed`, `status` |
| PATCH `/v1/entities/:id` → `retired`/`suspended` | `hakken.entity.deactivated` | `app_slug`, `entity_id`, `status` |
| POST `/v1/broadcasts` klokd `shift_open` | `hakken.shift_opening` | `app_slug`, `broadcast_id`, `publisher_id`, `shift_id`, `sector`, `pay_rate_kes`, `ttl_at` |
| POST `/v1/broadcasts` LD `lunch_ready`/`special` | `hakken.fresh_arrivals` | `app_slug`, `broadcast_id`, `publisher_id`, `vertical`, `ttl_at` |
| POST `/v1/broadcasts` LD `restock` | `hakken.basket_auto_refill` | `app_slug`, `broadcast_id`, `publisher_id`, `vertical`, `ttl_at` |
| Tier assignment | `hakken.tier_changed` | `app_slug`, `entity_id`, `tier_slug`, `ranking_weight` |
| Identiti consent webhook | `hakken.consent_scope_changed` | `user_uuid`, `source` |

---

## 8. Error code table

| Status | Code | Trigger |
|---|---|---|
| 401 | `AUTH_JWT_MISSING` | Authorization missing or not `Bearer …` |
| 401 | `AUTH_JWT_INVALID` | Signature, structure, or `aud=hakken` mismatch |
| 401 | `AUTH_JWT_EXPIRED` | `exp` past |
| 401 | `AUTH_JWT_AUDIENCE` | `aud` claim does not include `hakken` |
| 401 | `AUTH_JWT_REVOKED` | `jti` revoked by Identiti |
| 401 | `APP_AUTH_MISSING` | Missing `X-Hakken-App-Key` or `X-Hakken-App-Secret` |
| 401 | `APP_AUTH_INVALID` | Unknown slug or secret mismatch |
| 403 | `APP_SUSPENDED` | App row `status` is `suspended` / `retired` |
| 400 | `PII_DETECTED` | Phone/email/name in payload |
| 422 | `REGULATORY_CONTAINMENT_VIOLATION` | Banned key — see §4 |
| 400 | `PAYLOAD_TOO_LARGE` | Broadcast payload > 64 KB |
| 422 | `TTL_PAST` | `ttl_at ≤ now` |
| 422 | `TTL_TOO_FAR` | `ttl_at > now + 168h` |
| 400 | `GEO_OUT_OF_REGION` | Outside Kenya bbox (lat/lng swapped?) |
| 400 | `GEO_INVALID` | Malformed lat/lng |
| 404 | `ENTITY_NOT_FOUND` / `BROADCAST_NOT_FOUND` / `PUBLISHER_NOT_FOUND` | Standard not-founds |
| 403 | `VERTICAL_NOT_AUTHORIZED` | Calling app's vertical ≠ request vertical |
| 403 | `ROLE_FLAG_MISMATCH` | Klokd two-sided rule (publisher role vs broadcast_type) |
| 403 | `PUBLISHER_NOT_ACTIVE` | Publisher entity `status` ≠ `active` |
| 409 | `ENTITY_EXISTS` | Duplicate `external_ref` within app |
| 409 | `IDEMPOTENCY_KEY_CONFLICT` | Same `Idempotency-Key` with different body hash |
| 409 | `IDEMPOTENCY_KEY_IN_FLIGHT` | Earlier request with same key still in flight |
| 400 | `IDEMPOTENCY_KEY_INVALID` | `Idempotency-Key` not 1..200 chars |
| 400 | `CURSOR_INVALID` | Pagination cursor malformed |

---

## 9. Quickstart smoke (curl)

**LD kitchen + lunch publish:**

```bash
BASE=https://hakken-production.up.railway.app
JWT=...
KEY=lunch_drop
SECRET=...
TRACE="00-$(openssl rand -hex 16)-$(openssl rand -hex 8)-01"

curl -sS -X POST "$BASE/v1/entities" \
  -H "Authorization: Bearer $JWT" \
  -H "X-Hakken-App-Key: $KEY" \
  -H "X-Hakken-App-Secret: $SECRET" \
  -H "traceparent: $TRACE" \
  -H "Idempotency-Key: ld:kitchen:42:register" \
  -H "content-type: application/json" \
  -d '{
        "entity_type": "kitchen",
        "display_name": "Mama Wanjiku — Westlands",
        "role_flags": ["publisher"],
        "geo": { "lat": -1.2640, "lng": 36.8078 },
        "metadata": { "cuisine_tags": ["local","kenyan"], "price_range_kes": [200, 350] },
        "external_ref": "ld:kitchen:42"
      }'
```

**Klokd shift publish (after employer registration):**

```bash
curl -sS -X POST "$BASE/v1/broadcasts" \
  -H "Authorization: Bearer $JWT" \
  -H "X-Hakken-App-Key: klokd" \
  -H "X-Hakken-App-Secret: $SECRET" \
  -H "traceparent: $TRACE" \
  -H "Idempotency-Key: klokd:shift:7711:publish" \
  -H "content-type: application/json" \
  -d '{
        "publisher_id": "<employer entity_id>",
        "broadcast_type": "shift_open",
        "payload": {
          "shift_id": "klokd:shift:7711",
          "role": "server",
          "shift_start_at": "2026-06-12T11:00:00Z",
          "shift_end_at":   "2026-06-12T17:00:00Z",
          "pay_rate_kes":   800,
          "certifications_required": ["food_handling"],
          "sector": "hospitality",
          "headcount": 3
        },
        "geo": { "lat": -1.2841, "lng": 36.8225 },
        "consent_scope": "cross_app_optional",
        "ttl_at": "2026-06-12T11:00:00Z"
      }'
```

---

## 10. Rail-side smokes (mirror their assertions)

- **Klokd path:** `c:\Projects\hakken\scripts\pilotSmoke.ts` — register employer → publish `shift_open` → assert audit + outbox + ranking `model_version`
- **LD path:** `c:\Projects\hakken\scripts\lunchDropSmoke.ts` — register kitchen → publish `lunch_ready` → assert audit + outbox + ranking `model_version`

If your `client.ts` exercises these in the same sequence and assertions, you have parity with what the rail thinks "integrated" means.

---

## 11. Known limits during pilot

- `ADMIN_API_TOKEN` not on Railway prod → admin endpoints (incl. `/v1/admin/observability`, `/v1/admin/tiers/:id`) 401.
- Identiti JWKS not live until HK-5 cutover → entity writes 401 against production until a real Identiti staging is reachable.
- `TODOKU_HMAC_SECRET` not on Railway prod → `event_outbox` accumulates; emitter logs `todoku_emitter_disabled`. Backlog drains automatically when the env var lands.
- `KP_ANALYTICS_HMAC_SECRET` not on Railway prod → `tx_signal_score` defaults to 0 in ranking (no reliability boost yet).
- Single ranking replica; in-memory cache (no `REDIS_URL`).

---

## 12. Contacts

| Topic | Owner |
|---|---|
| Pilot integration / scoping (Klokd) | Ivy Wanja (Klokd) + Chamia (KMV) |
| Pilot integration / scoping (LD) | LD PM + Chamia (KMV) |
| Auth + JWT + Identiti cutover | Silvia (CTO) |
| Sandbox HMAC secrets (`HAKKEN_APP_SECRET`) | Silvia (CTO) — both apps |
| Outbox / Todoku ingest | Hakken on-call (see runbook §5) |
| Plugin scoring / dialling | Hakken on-call |

**Bug reports:** file against INGEST Linear project with `hakken-pilot` label plus the failing `request_id` and `traceparent`.
