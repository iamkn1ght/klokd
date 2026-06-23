import crypto from 'crypto';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import {
  assertNoBannedKeysOrPii,
  type HakkenCreateEntityRequest,
  type HakkenEntity,
  type HakkenPatchEntityRequest,
  type HakkenCreateBroadcastRequest,
  type HakkenBroadcast,
} from './hakken.dto';

// Klokd v3 — Hakken rail client (Phase 1 only — entity registration + broadcasts)
// Aligned to docs/HAKKEN_INTEGRATION_REFERENCE.md (Chamia, 22 Jun) §2 (auth), §3
// (tracing + idempotency), §6 (endpoints), §8 (error codes).
//
// PILOT AUTH (this is what main accepts today; HMAC mode is post-pilot HK-9):
//   Authorization:        Bearer <identiti-customer-JWT>
//   X-Hakken-App-Key:     klokd
//   X-Hakken-App-Secret:  <HAKKEN_APP_SECRET>
//
// Klokd's Identiti integration mints phone tokens today; it does NOT yet mint
// customer JWTs with audience=hakken. That's the second hard blocker on this
// integration (see KMV_RAILS_INTEGRATION_GUIDE.md / playbook §8). For now the
// caller passes the JWT in to each call; an `IdentiJwtSource` abstraction is
// reserved for when issuance lands so the client surface doesn't change later.
//
// NON-BLOCKING failure mode: see ShiftService/AuthService callers — they catch
// + log + retry; Klokd's upstream flow completes regardless of Hakken outcome.

interface HakkenEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: { code: string; message: string; detail?: unknown; field?: string };
  meta?: { request_id?: string; timestamp?: string };
}

function generateTraceparent(): string {
  const traceId = crypto.randomBytes(16).toString('hex');
  const spanId = crypto.randomBytes(8).toString('hex');
  return `00-${traceId}-${spanId}-01`;
}

class HakkenRailClient {
  private get baseUrl(): string {
    return config.hakken.baseUrl;
  }

  private get appKey(): string {
    return config.hakken.appKey;
  }

  private get appSecret(): string {
    return config.hakken.appSecret;
  }

  private assertConfigured(): void {
    if (!this.baseUrl || !this.appKey || !this.appSecret) {
      throw new AppError(
        503,
        'RAIL_CONFIG_INCOMPLETE: hakken (set HAKKEN_API_BASE, HAKKEN_APP_KEY, HAKKEN_APP_SECRET)'
      );
    }
  }

  /**
   * Customer-JWT injection point. Klokd's Identiti integration must mint a JWT
   * with `aud=hakken`, `sub=<account_uuid>`. Until that helper exists, the
   * caller is responsible for passing the JWT directly.
   */
  private async request<T>(args: {
    method: 'POST' | 'GET' | 'PATCH' | 'DELETE';
    path: string;
    body?: unknown;
    identityJwt: string;
    idempotencyKey?: string;
    traceparent?: string;
  }): Promise<T> {
    this.assertConfigured();

    const { method, path, body, identityJwt, idempotencyKey } = args;
    const traceparent = args.traceparent ?? generateTraceparent();
    const hasBody = body !== undefined && method !== 'GET' && method !== 'DELETE';
    const serialized = hasBody ? JSON.stringify(body) : undefined;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${identityJwt}`,
      'X-Hakken-App-Key': this.appKey,
      'X-Hakken-App-Secret': this.appSecret,
      traceparent,
    };
    if (hasBody) {
      headers['Content-Type'] = 'application/json';
    }
    if (idempotencyKey) {
      if (idempotencyKey.length < 1 || idempotencyKey.length > 200) {
        throw new AppError(400, `Hakken Idempotency-Key must be 1..200 chars (got ${idempotencyKey.length})`);
      }
      headers['Idempotency-Key'] = idempotencyKey;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: serialized,
    });

    const text = await res.text();
    let envelope: HakkenEnvelope<T> | null = null;
    try { envelope = text.length > 0 ? (JSON.parse(text) as HakkenEnvelope<T>) : null; } catch { /* opaque */ }

    if (!res.ok) {
      const code = envelope?.error?.code ?? 'unknown';
      const msg = envelope?.error?.message ?? `Hakken HTTP ${res.status}`;
      throw new AppError(res.status === 401 ? 401 : 502, `Hakken ${method} ${path} failed: ${code} — ${msg}`);
    }
    if (!envelope || envelope.ok === false || envelope.data === undefined) {
      throw new AppError(502, `Hakken ${method} ${path} returned invalid envelope`);
    }
    return envelope.data;
  }

  // ─── Entities ─────────────────────────────────────────

  async createEntity<M extends object>(
    identityJwt: string,
    req: HakkenCreateEntityRequest<M>,
    opts?: { idempotencyKey?: string; traceparent?: string }
  ): Promise<HakkenEntity<M>> {
    // Guard local — rail enforces too but failing here saves a round-trip.
    assertNoBannedKeysOrPii({ metadata: req.metadata, displayName: req.displayName }, 'createEntity');

    const raw = await this.request<{
      entity_id: string;
      app_slug: string;
      vertical: string;
      entity_type: HakkenEntity['entityType'];
      display_name: string;
      role_flags: HakkenEntity['roleFlags'];
      geo: HakkenEntity['geo'];
      geo_label?: string;
      status: HakkenEntity['status'];
      verification?: HakkenEntity['verification'];
      metadata: M;
      external_ref: string;
      created_at: string;
      updated_at: string;
    }>({
      method: 'POST',
      path: '/v1/entities',
      body: {
        entity_type: req.entityType,
        display_name: req.displayName,
        role_flags: req.roleFlags,
        geo: req.geo,
        geo_label: req.geoLabel,
        metadata: req.metadata,
        external_ref: req.externalRef,
      },
      identityJwt,
      idempotencyKey: opts?.idempotencyKey ?? req.externalRef,
      traceparent: opts?.traceparent,
    });

    return {
      entityId: raw.entity_id,
      appSlug: raw.app_slug,
      vertical: raw.vertical,
      entityType: raw.entity_type,
      displayName: raw.display_name,
      roleFlags: raw.role_flags,
      geo: raw.geo,
      geoLabel: raw.geo_label,
      status: raw.status,
      verification: raw.verification,
      metadata: raw.metadata,
      externalRef: raw.external_ref,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }

  async patchEntity(
    identityJwt: string,
    entityId: string,
    req: HakkenPatchEntityRequest,
    opts?: { traceparent?: string }
  ): Promise<HakkenEntity> {
    if (req.metadata) {
      assertNoBannedKeysOrPii({ metadata: req.metadata }, 'patchEntity');
    }
    const body: Record<string, unknown> = {};
    if (req.displayName !== undefined) body.display_name = req.displayName;
    if (req.geo) body.geo = req.geo;
    if (req.geoLabel !== undefined) body.geo_label = req.geoLabel;
    if (req.roleFlags) body.role_flags = req.roleFlags;
    if (req.metadata) body.metadata = req.metadata;
    if (req.status) body.status = req.status;

    const raw = await this.request<HakkenEntity & { entity_id: string; app_slug: string; entity_type: HakkenEntity['entityType']; display_name: string; role_flags: HakkenEntity['roleFlags']; geo_label?: string; external_ref: string; created_at: string; updated_at: string }>({
      method: 'PATCH',
      path: `/v1/entities/${encodeURIComponent(entityId)}`,
      body,
      identityJwt,
      traceparent: opts?.traceparent,
    });

    return {
      entityId: raw.entity_id,
      appSlug: raw.app_slug,
      vertical: raw.vertical,
      entityType: raw.entity_type,
      displayName: raw.display_name,
      roleFlags: raw.role_flags,
      geo: raw.geo,
      geoLabel: raw.geo_label,
      status: raw.status,
      verification: raw.verification,
      metadata: raw.metadata,
      externalRef: raw.external_ref,
      createdAt: raw.created_at,
      updatedAt: raw.updated_at,
    };
  }

  // ─── Broadcasts ───────────────────────────────────────

  async publishBroadcast<P extends object>(
    identityJwt: string,
    req: HakkenCreateBroadcastRequest<P>,
    // idempotencyKey REQUIRED — §3 says "honored on /v1/broadcasts" and the
    // playbook §6.1 mandates deterministic per-business-op keys. Without one,
    // transient-error retries can duplicate broadcasts.
    opts: { idempotencyKey: string; traceparent?: string }
  ): Promise<HakkenBroadcast<P>> {
    assertNoBannedKeysOrPii({ payload: req.payload }, 'publishBroadcast');

    const raw = await this.request<{
      broadcast_id: string;
      publisher_id: string;
      broadcast_type: string;
      payload: P;
      geo: HakkenBroadcast['geo'];
      geo_label?: string;
      consent_scope: HakkenBroadcast['consentScope'];
      ttl_at: string;
      indexed_at: string | null;
      status: HakkenBroadcast['status'];
      created_at: string;
    }>({
      method: 'POST',
      path: '/v1/broadcasts',
      body: {
        publisher_id: req.publisherId,
        broadcast_type: req.broadcastType,
        payload: req.payload,
        geo: req.geo,
        geo_label: req.geoLabel,
        consent_scope: req.consentScope,
        ttl_at: req.ttlAt,
      },
      identityJwt,
      idempotencyKey: opts.idempotencyKey,
      traceparent: opts.traceparent,
    });

    return {
      broadcastId: raw.broadcast_id,
      publisherId: raw.publisher_id,
      broadcastType: raw.broadcast_type,
      payload: raw.payload,
      geo: raw.geo,
      geoLabel: raw.geo_label,
      consentScope: raw.consent_scope,
      ttlAt: raw.ttl_at,
      indexedAt: raw.indexed_at,
      status: raw.status,
      createdAt: raw.created_at,
    };
  }

  async revokeBroadcast(identityJwt: string, broadcastId: string, opts?: { traceparent?: string }): Promise<void> {
    await this.request<{ status: string }>({
      method: 'DELETE',
      path: `/v1/broadcasts/${encodeURIComponent(broadcastId)}`,
      identityJwt,
      traceparent: opts?.traceparent,
    });
  }
}

export const hakkenRailClient = new HakkenRailClient();
