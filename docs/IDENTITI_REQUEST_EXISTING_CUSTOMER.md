# Identiti request: let an app re-link a customer it created

**From:** Klokd (octopus-api) · **Date:** 13 October 2026 · **Priority:** P0, returning users can't sign in

## Problem

`POST /v1/customers` refuses a phone number that already has an account with `400 validation_phone_already_registered`, and the response doesn't say which account. There is no lookup by phone.

That's fine the first time. But if an app loses its own record of the link between a number and an `account_uuid`, it can never recover it. That happens after a database migration or reset, or when a write half-completes. Every returning person who signs up again is then locked out.

Klokd hit this on 13 Oct 2026: octopus-api moved to a new database, and people Klokd had registered with Identiti can no longer sign in.

## Requested change

When the phone already belongs to an account **that the calling app created** (`origin_app_id` = the caller's `app_id`), return that account instead of an error:

- `200 OK` (not `201`)
- the same body as a create: `account_uuid`, `state`, `tier`, `created_at`
- plus `"existing": true`
- audit action `customer.create.matched_existing`; no `ACCOUNT_CREATED` event

If the account was created by **a different app**, keep today's `400 validation_phone_already_registered` unchanged. An app can recover only its own customers, so no app can use this to find out whether a number is registered elsewhere. Identiti's privacy model stays as it is.

The same rule makes retries safe: an app that times out after a successful create can call again and get the same account.

## Implementation sketch (about 25 lines)

1. `repositories/types.ts`: `findByPhoneHash` returns `{ accountUuid, originAppId }`. Update both repositories:
   - Postgres: join `phone_records → platform_accounts` and select `origin_app_id`.
   - Memory: return the stored `originAppId`.

   Existing callers (`auth.ts`, `phoneChange.ts`) only read `accountUuid`, so they're unaffected.
2. `routes/customers.ts`, in the `phone_collision` branch, before returning 400:

   ```ts
   const existing = await deps.customersRepo.findByPhoneHash(phoneHash);
   if (existing && existing.originAppId === appId) {
     const row = await deps.customersRepo.findById(existing.accountUuid);
     if (row) {
       await deps.auditLogger.append({ appId, actorType: 'app', actorId: appId,
         action: 'customer.create.matched_existing', resourceType: 'platform_account',
         resourceId: row.id, requestId: rid, traceparent: request.traceparent,
         outcome: 'success', detail: { app_correlation: data.app_correlation } });
       return reply.code(200).send(successResponse({
         account_uuid: row.id, state: row.state, tier: row.tier,
         created_at: row.createdAt.toISOString(), existing: true }, rid));
     }
   }
   ```
3. Tests:
   - same app, same phone → 200 with the original `account_uuid`;
   - different app → still 400;
   - no `ACCOUNT_CREATED` event on the match.

## Klokd side

No change is needed. octopus-api already reads `account_uuid` from the create response and links it. Until this ships, the Klokd app tells affected people to contact support.
