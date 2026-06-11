# Operator Request — Helpan AI rail registration for Klokd

**To:** Helpan AI rail operator (Silvia Mumbua or the Helpan AI rail Claude session)
**From:** Klokd · Chamia Mutuku (CEO · Klokd Workplace Solutions Ltd)
**Authority:** KMV_RAILS_INTEGRATION_GUIDE.md §7 (live on Railway, verified 2026-05-22)
**Status:** 🟢 Klokd-side scaffolding code-complete (commit pending). Awaiting credentials + agent admission confirmation.

---

## What Klokd has already built

See commit history on `iamkn1ght/klokd` main branch:

- `src/modules/rails/helpan.dto.ts` — full DTO surface (authorities, dispatch, briefings, events, webhook payloads)
- `src/modules/rails/helpan.client.ts` — HMAC-SHA256 base64 client, `/v1/*` endpoints, envelope unwrap, `/validate` exempted from idempotency-key per §7.3
- `src/modules/rails/webhook.routes.ts` — Helpan webhook handler with the unique canonical `{TIMESTAMP}\n{PATH}\n{SHA256_HEX(body)}` (no method, no content type)
- `src/modules/agent/agent.routes.ts` — Klokd consuming-app routes: `POST /api/v1/agents/authorities` (issue), `GET /authorities` (list), `DELETE /authorities/:jti` (revoke), `POST /briefings` (create); plus `publishShiftToHelpan()` helper for shift event ingest
- `src/modules/agent/agent-dispatch.routes.ts` — Klokd-as-target-rail at `POST /api/v1/agents/dispatch/klokd.write.shift_signup`, validates inbound HMAC + Delegated Authority JWT per §A.11
- `prisma/migrations/20260611120000_helpan_agent_runtime/` — adds `delegated_authorities`, `agent_briefings`, `agent_actions` tables

All HMAC-SHA256-base64, all `/v1/*` paths, all `{ok, data, meta}` envelope unwrap. Same pattern as Identiti / Todoku / KP integrations Klokd already shipped.

## The four env values Klokd needs

```
HELPAN_API_BASE       = <deployed Railway URL — verify via GET <base>/v1/health returns {"ok":true}>
HELPAN_APP_ID         = klokd                  # LITERAL app slug; NOT klokd_sandbox per guide §7.1
HELPAN_APP_SECRET     = <hex-64 from app_credentials provisioning>
HELPAN_WEBHOOK_SECRET = <hex-64; shared HELPAN_WEBHOOK_HMAC_SECRET>
```

**URL trap:** do not paste a Railway dashboard URL with `<Railway URL>` placeholder. Identiti burned 30 min on this and Klokd's other integrations now validate health endpoints before proceeding.

## Confirm provisioning

Per guide §7.1:

- [ ] Klokd row in `app_credentials` with scopes: `helpan:authorities:issue`, `helpan:authority:validate`, `helpan:authorities:revoke`, `helpan:actions:dispatch`, `helpan:actions:read`
- [ ] `helpan-klokd-v1` agent in `agents` table with safety_policy + admission audit entry (per guide §7.11, this agent is pre-admitted)
- [ ] Klokd's 3 catalogue scopes registered: `klokd.write.shift_pay`, `klokd.write.shift_signup`, `klokd.read.worker_reputation`
- [ ] `HELPAN_WEBHOOK_URL_KLOKD` configured on rail side to `https://klokd-production.up.railway.app/api/v1/webhooks/rails/helpan`
- [ ] Klokd's target-rail dispatch URL configured on rail side: `HELPAN_KLOKD_URL=https://klokd-production.up.railway.app/api/v1/agents/dispatch`

## Wire format Klokd assumed — confirm or correct

Klokd's implementation follows the guide §7 verbatim. Any deltas from these should be flagged before Klokd does first live smoke:

| Klokd assumed | Confirm? |
|---|---|
| `Authorization: Helpan-HMAC-SHA256 app_id=klokd, signature=<base64>` | ✓ guide §7.3 |
| `x-helpan-timestamp` (lowercase) | ✓ guide §7.3 case-insensitive |
| `X-Idempotency-Key` on all writes EXCEPT `/validate` (exempt) | ✓ guide §7.3 |
| `Traceparent: 00-<32 hex>-<16 hex>-01` auto-generated when absent | ✓ guide §7.3 |
| `X-Delegated-Authority` JWT on dispatch | ✓ guide §7.7 |
| Webhook canonical = `{TIMESTAMP}\n{PATH}\n{SHA256_HEX(body)}` (NOT 5-line) | ✓ guide §7.13 |
| Webhook headers `X-Helpan-Webhook-Signature`, `X-Helpan-Webhook-Timestamp` | ✓ guide §7.13 |
| Customer JWT briefings — `Authorization: Bearer <jwt>` + `X-App-Id: klokd` | ✓ guide §7.5 |
| Agent ID `helpan-klokd-v1` (kebab-case, NOT `agt_<ULID>`) | ✓ guide §7.11 |
| Scope IDs exact-match `target_operation` (no resolver) | ✓ guide §7.16.1 |
| `app_id=klokd` literal, NOT `klokd_sandbox` | ✓ guide §7.1 — **this is the wire-format trap unique to Helpan**; all other rails use `_sandbox` suffix |

## Open Klokd-side questions for the operator

1. **Customer JWT briefings flow.** Klokd's current `POST /api/v1/agents/briefings` forwards the worker's Klokd-issued JWT, but Helpan's `customerJwtPlugin` validates against Identiti's JWKS. Klokd needs Identiti to either (a) accept Klokd-issued JWTs that wrap Identiti's `account_uuid` as `sub`, or (b) provide a "mint customer JWT for downstream consumption" endpoint. Without this, briefings creation will 401 at Helpan. **Defer if non-trivial — Klokd can poll Helpan's `/v1/events/ingest` matched_briefings response inline instead for v1.**

2. **`klokd.shift_offer` event type registration.** Confirm this event_type is recognised by the matcher engine. Klokd will publish via `POST /v1/events/ingest` whenever a new shift is posted (Sprint 5 wire-up, will happen alongside Hakken integration).

3. **Klokd as target rail.** Confirm Helpan can forward dispatches to `POST https://klokd-production.up.railway.app/api/v1/agents/dispatch/klokd.write.shift_signup` (only operation Klokd hosts as target rail at v1). Klokd's handler does the §A.11 dance: verifies Helpan's HMAC, decodes the X-Delegated-Authority JWT for `jti`, calls back to `POST /v1/authorities/{jti}/validate`, then executes the shift signup.

4. **Test phone whitelist for agent dispatches.** Same `+254700000005`/`+254700000006` from Identiti? Or a dedicated Helpan test set?

## What Klokd commits to on its side

- Capture `token` on `POST /v1/authorities` 201 response — never returned again, persisted encrypted in `delegated_authorities.authority_jwt`
- Per §A.11: when target-rail receives dispatch, audit log carries `actor.type='agent'`, `actor.agent_id` from validate, `actor.delegated_authority_jti`, `initiated_by`, `traceparent` verbatim, `business_op_id` verbatim
- Cardinal rule preservation: no Daraja/AT/WhatsApp creds; all SMS via Todoku; all payments via PaymentRail
- Idempotency keys (UUIDv4) on every write except `/validate`

---

*Klokd is ready to smoke against `<HELPAN_API_BASE>` the moment credentials land. Same handover quality as Identiti + Todoku + KP — paste the four env values + confirm the wire-format table above + flag any item in §Open Questions, and Klokd will run the smoke script and report back.*
