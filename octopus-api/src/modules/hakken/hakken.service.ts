import crypto from 'crypto';
import prisma from '../../config/database';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { logAudit } from '../../utils/auditLogger';
import { hakkenRailClient } from '../rails';
import type {
  KlokdEmployerEntityMetadata,
  KlokdWorkerEntityMetadata,
  KlokdShiftOpenPayload,
} from '../rails/hakken.dto';

// Klokd v3 — Hakken integration service (Sprint 5 / S5-NEW-01)
//
// Wraps the Hakken rail client with Klokd-domain trigger points:
//   - upsertEmployerEntity   (called on employer profile completion + KYC tier change)
//   - upsertWorkerEntity     (called on KYC tier change + rating update)
//   - publishShiftOpen       (called when ShiftService.createShift commits)
//   - revokeShiftBroadcast   (called on shift filled / expired / cancelled)
//   - retireEntity           (called on offboarding)
//
// CONTRACT (per playbook §6.1 + advisory §2.4):
//   1. NON-BLOCKING — every call wrapped in try/catch; upstream Klokd flow
//      completes regardless.
//   2. IDEMPOTENT — Idempotency-Key = deterministic per business operation
//      (employer_id / worker_account_uuid / shift_id) so retries collapse.
//   3. §A.11 propagation — EVERY audit row (success, deferred, error) carries
//      `traceparent` + `business_op_id` + a `resourceId` so (a) the trace can
//      be correlated end-to-end and (b) the deferral-replay sweep (D2) has a
//      concrete target to re-run. Stored in audit_log.metadata (+ resourceId
//      column); promote to indexed columns if §A.11 sign-off requires it.
//
// AUDIT ACTOR: audit_logs.actor_id is a required FK to users.id, so a literal
// 'system' actor violates the constraint (and its insert was previously being
// swallowed by the audit catch — the deferral trail never persisted). These
// rows are system-triggered background syncs with no human actor, so we
// attribute them to the AFFECTED user (employer/worker whose entity is being
// synced); the subject is still pinned precisely by resourceId + business_op_id.
//
// IDENTITI JWT GAP (the load-bearing blocker): Hakken requires
// Authorization: Bearer <Identiti RS256 JWT, aud=https://hakken.co.ke>. Klokd's
// Identiti client mints phone tokens (aud=todoku) only; the aud=hakken mint
// endpoint is pending Silvia (B1a). Until then getHakkenJwt() throws 503 and
// every trigger records a `deferred` audit row (now with a replay target).

async function getHakkenJwt(_accountUuid: string): Promise<string> {
  // PENDING Silvia confirmation of the Identiti customer-JWT issuance endpoint
  // for aud=hakken. Once available, this delegates to identityRailClient.
  // Note (Hakken 23 Jul): the audience is the URL `https://hakken.co.ke`
  // (HAKKEN_JWT_AUDIENCE), NOT the literal slug `hakken`.
  if (process.env.HAKKEN_IDENTITY_JWT_STUB && config.nodeEnv !== 'production') {
    return process.env.HAKKEN_IDENTITY_JWT_STUB;
  }
  throw new AppError(
    503,
    'HAKKEN_JWT_PENDING: Identiti customer-JWT issuance (aud=hakken) not yet wired. ' +
      'See OPERATOR_REQUEST_HAKKEN.md. Set HAKKEN_IDENTITY_JWT_STUB env for dev smoke.'
  );
}

/**
 * Cheap probe used by the D2 deferral sweep to decide whether replaying is
 * worthwhile at all. Returns false while the aud=hakken JWT is unavailable (the
 * systemic blocker), so the sweep can no-op instead of churning the backlog.
 */
export async function hakkenJwtAvailable(): Promise<boolean> {
  try {
    await getHakkenJwt('probe');
    return true;
  } catch {
    return false;
  }
}

// Operations that the deferral sweep knows how to replay, and the outcome
// suffixes it recognises on the audit action `hakken.<operation>.<outcome>`.
export const HAKKEN_REPLAYABLE_OPERATIONS = [
  'employer_register',
  'worker_register',
  'shift_publish',
  'shift_revoke',
  'entity_retire',
] as const;
export type HakkenReplayableOperation = (typeof HAKKEN_REPLAYABLE_OPERATIONS)[number];

type HakkenOutcome = 'success' | 'deferred' | 'error' | 'skipped';

export class HakkenIntegrationService {
  /** W3C traceparent (`00-<32hex>-<16hex>-01`) — one per business operation. */
  private newTrace(): string {
    const traceId = crypto.randomBytes(16).toString('hex');
    const spanId = crypto.randomBytes(8).toString('hex');
    return `00-${traceId}-${spanId}-01`;
  }

  /**
   * §A.11 audit row for a Hakken operation. Every outcome — success, deferred,
   * error, skipped — writes one, carrying `traceparent` + `business_op_id` so a
   * later sweep can replay deferrals against a concrete target and so
   * trace-propagation is measurable (rows-with-traceparent ÷ total).
   */
  private async audit(params: {
    actorId: string;
    operation: string;
    outcome: HakkenOutcome;
    resourceId?: string;
    businessOpId?: string;
    traceparent: string;
    detail?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await logAudit({
        tenantId: config.defaultTenantId,
        actorId: params.actorId,
        action: `hakken.${params.operation}.${params.outcome}`,
        resource: 'hakken_integration',
        resourceId: params.resourceId,
        metadata: {
          traceparent: params.traceparent,
          business_op_id: params.businessOpId ?? null,
          ...params.detail,
          at: new Date().toISOString(),
        },
      });
    } catch {
      // never let audit failure cascade into the upstream flow
    }
  }

  /**
   * Upsert a Klokd employer as a Hakken entity. Called on:
   *   - employer profile completion (post-WIBA)
   *   - KYC tier increase (tier ≥ 1)
   */
  async upsertEmployerEntity(employerId: string): Promise<void> {
    const traceparent = this.newTrace();
    const employer = await prisma.employer.findUnique({ where: { id: employerId } });
    if (!employer) return; // unknown id — nothing to sync or attribute an audit to
    const actorId = employer.userId;

    if (!employer.accountUuid) {
      await this.audit({
        actorId, operation: 'employer_register', outcome: 'skipped', resourceId: employer.id,
        businessOpId: employer.id, traceparent, detail: { reason: 'employer_has_no_account_uuid' },
      });
      return;
    }

    const businessOpId = employer.accountUuid;
    let jwt: string;
    try {
      jwt = await getHakkenJwt(employer.accountUuid);
    } catch (err) {
      await this.audit({
        actorId, operation: 'employer_register', outcome: 'deferred', resourceId: employer.id,
        businessOpId, traceparent, detail: { target: 'employer', reason: (err as Error).message },
      });
      return;
    }

    const externalRef = `klokd:emp:${employer.id}`;
    const metadata: KlokdEmployerEntityMetadata = { sector: 'hospitality' };

    try {
      if (employer.hakkenEntityId) {
        await hakkenRailClient.patchEntity(jwt, employer.hakkenEntityId, {
          displayName: employer.businessName,
          metadata: metadata as unknown as Record<string, unknown>,
        }, { traceparent });
      } else {
        const entity = await hakkenRailClient.createEntity<KlokdEmployerEntityMetadata>(
          jwt,
          {
            entityType: 'employer',
            displayName: employer.businessName,
            roleFlags: ['publisher', 'employer'],
            // No raw GPS on employer entities at v3 (locations come at shift-post time).
            // Nairobi CBD centroid placeholder — playbook §7 forbids raw GPS exfil.
            geo: { lat: -1.2841, lng: 36.8225 },
            geoLabel: 'CBD',
            metadata,
            externalRef,
          },
          { idempotencyKey: externalRef, traceparent }
        );
        await prisma.employer.update({
          where: { id: employer.id },
          data: { hakkenEntityId: entity.entityId },
        });
      }
      await this.audit({
        actorId, operation: 'employer_register', outcome: 'success', resourceId: employer.id,
        businessOpId, traceparent, detail: { target: 'employer', entityId: employer.hakkenEntityId ?? undefined },
      });
    } catch (err) {
      console.error('[HAKKEN] upsertEmployerEntity failed (non-fatal):', (err as Error).message);
      await this.audit({
        actorId, operation: 'employer_register', outcome: 'error', resourceId: employer.id,
        businessOpId, traceparent, detail: { target: 'employer', reason: (err as Error).message },
      });
    }
  }

  /**
   * Upsert a Klokd worker as a Hakken entity. Called on:
   *   - KYC tier ≥ 1 (unlocks shift applications)
   *   - rating aggregate update
   */
  async upsertWorkerEntity(workerId: string): Promise<void> {
    const traceparent = this.newTrace();
    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker) return; // unknown id — nothing to sync or attribute an audit to
    const actorId = worker.userId;

    if (!worker.accountUuid) {
      await this.audit({
        actorId, operation: 'worker_register', outcome: 'skipped', resourceId: worker.id,
        businessOpId: worker.id, traceparent, detail: { reason: 'worker_has_no_account_uuid' },
      });
      return;
    }

    const businessOpId = worker.accountUuid;
    let jwt: string;
    try {
      jwt = await getHakkenJwt(worker.accountUuid);
    } catch (err) {
      await this.audit({
        actorId, operation: 'worker_register', outcome: 'deferred', resourceId: worker.id,
        businessOpId, traceparent, detail: { target: 'worker', reason: (err as Error).message },
      });
      return;
    }

    const externalRef = `klokd:worker:${worker.accountUuid}`;
    const tier = Math.max(0, Math.min(3, worker.kycTier)) as 0 | 1 | 2 | 3;

    // §5 PII wall: Hakken rejects literal name fields. display_name MUST be opaque.
    // First 8 chars of accountUuid (post-acc_ prefix) as the public label.
    const opaqueLabel = `worker-${worker.accountUuid.replace(/^acc_/, '').slice(0, 8)}`;
    const metadata: KlokdWorkerEntityMetadata = { sector: 'hospitality', kyc_tier: tier };

    try {
      if (worker.hakkenEntityId) {
        await hakkenRailClient.patchEntity(jwt, worker.hakkenEntityId, {
          metadata: metadata as unknown as Record<string, unknown>,
        }, { traceparent });
      } else {
        const entity = await hakkenRailClient.createEntity<KlokdWorkerEntityMetadata>(
          jwt,
          {
            entityType: 'worker',
            displayName: opaqueLabel,
            roleFlags: ['worker'],
            // Worker location comes at clock-in via geoHash; entity-level geo is
            // the CBD centroid placeholder — never resolve home address to Hakken.
            geo: { lat: -1.2841, lng: 36.8225 },
            geoLabel: 'CBD',
            metadata,
            externalRef,
          },
          { idempotencyKey: externalRef, traceparent }
        );
        await prisma.worker.update({
          where: { id: worker.id },
          data: { hakkenEntityId: entity.entityId },
        });
      }
      await this.audit({
        actorId, operation: 'worker_register', outcome: 'success', resourceId: worker.id,
        businessOpId, traceparent, detail: { target: 'worker', kycTier: tier },
      });
    } catch (err) {
      console.error('[HAKKEN] upsertWorkerEntity failed (non-fatal):', (err as Error).message);
      await this.audit({
        actorId, operation: 'worker_register', outcome: 'error', resourceId: worker.id,
        businessOpId, traceparent, detail: { target: 'worker', reason: (err as Error).message },
      });
    }
  }

  /**
   * Publish a shift_open broadcast on Hakken. Called by ShiftService.createShift
   * after the shift row commits. Non-blocking.
   */
  async publishShiftOpen(shiftId: string): Promise<void> {
    const traceparent = this.newTrace();
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { employer: true },
    });
    if (!shift?.employer) return;
    const actorId = shift.employer.userId;

    if (!shift.employer.accountUuid) {
      await this.audit({
        actorId, operation: 'shift_publish', outcome: 'skipped', resourceId: shift.id,
        businessOpId: shift.id, traceparent, detail: { reason: 'employer_has_no_account_uuid' },
      });
      return;
    }
    if (!shift.employer.hakkenEntityId) {
      // Employer not yet registered with Hakken — the shift can't publish until
      // it is. Recorded so the sweep can retry once the employer entity lands.
      await this.audit({
        actorId, operation: 'shift_publish', outcome: 'skipped', resourceId: shift.id,
        businessOpId: shift.id, traceparent, detail: { reason: 'employer_not_registered_with_hakken' },
      });
      return;
    }

    let jwt: string;
    try {
      jwt = await getHakkenJwt(shift.employer.accountUuid);
    } catch (err) {
      await this.audit({
        actorId, operation: 'shift_publish', outcome: 'deferred', resourceId: shift.id,
        businessOpId: shift.id, traceparent, detail: { reason: (err as Error).message },
      });
      return;
    }

    const idempotencyKey = `klokd:shift:${shift.id}:publish`;
    const payload: KlokdShiftOpenPayload = {
      shift_id: `klokd:shift:${shift.id}`,
      role: shift.role,
      shift_start_at: shift.startTime.toISOString(),
      shift_end_at: shift.endTime.toISOString(),
      // pay_rate_kes is WHOLE KES (Hakken doesn't touch money; confirmed fbe1040).
      pay_rate_kes: shift.rateKes,
      sector: 'hospitality',
      headcount: 1,
    };

    // TTL = shift start, capped at now+168h (inclusive boundary; absolute-timestamp
    // math avoids float drift around TTL_TOO_FAR).
    const maxTtlMs = Date.now() + 168 * 3600_000 - 60_000;
    const ttlAtMs = Math.min(shift.startTime.getTime(), maxTtlMs);
    const ttlAt = new Date(ttlAtMs).toISOString();

    try {
      const broadcast = await hakkenRailClient.publishBroadcast<KlokdShiftOpenPayload>(
        jwt,
        {
          publisherId: shift.employer.hakkenEntityId,
          broadcastType: 'shift_open',
          payload,
          geo: { lat: shift.locationLat, lng: shift.locationLng },
          geoLabel: shift.locationName ?? undefined,
          // consent_scope: single_app is the DPA-2019-safer default (Hakken R8,
          // 23 Jul). Klokd's onboarding does not yet capture cross-app discovery
          // consent, so we must not assert cross_app_optional. Upgrade to
          // cross_app_optional only once the consent-capture UI ships.
          consentScope: 'single_app',
          ttlAt,
        },
        { idempotencyKey, traceparent }
      );
      await prisma.shift.update({
        where: { id: shift.id },
        data: { hakkenBroadcastId: broadcast.broadcastId },
      });
      await this.audit({
        actorId, operation: 'shift_publish', outcome: 'success', resourceId: shift.id,
        businessOpId: shift.id, traceparent, detail: { broadcastId: broadcast.broadcastId },
      });
    } catch (err) {
      console.error('[HAKKEN] publishShiftOpen failed (non-fatal):', (err as Error).message);
      await this.audit({
        actorId, operation: 'shift_publish', outcome: 'error', resourceId: shift.id,
        businessOpId: shift.id, traceparent, detail: { reason: (err as Error).message },
      });
    }
  }

  /**
   * Revoke a shift's Hakken broadcast on filled / expired / cancelled.
   * Non-blocking.
   */
  async revokeShiftBroadcast(shiftId: string): Promise<void> {
    const traceparent = this.newTrace();
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { employer: true },
    });
    if (!shift?.hakkenBroadcastId || !shift.employer?.accountUuid) return;
    const actorId = shift.employer.userId;

    let jwt: string;
    try {
      jwt = await getHakkenJwt(shift.employer.accountUuid);
    } catch (err) {
      await this.audit({
        actorId, operation: 'shift_revoke', outcome: 'deferred', resourceId: shift.id,
        businessOpId: shift.id, traceparent, detail: { reason: (err as Error).message, broadcastId: shift.hakkenBroadcastId },
      });
      return;
    }

    try {
      await hakkenRailClient.revokeBroadcast(jwt, shift.hakkenBroadcastId, { traceparent });
      await prisma.shift.update({
        where: { id: shift.id },
        data: { hakkenBroadcastId: null },
      });
      await this.audit({
        actorId, operation: 'shift_revoke', outcome: 'success', resourceId: shift.id,
        businessOpId: shift.id, traceparent,
      });
    } catch (err) {
      console.error('[HAKKEN] revokeShiftBroadcast failed (non-fatal):', (err as Error).message);
      await this.audit({
        actorId, operation: 'shift_revoke', outcome: 'error', resourceId: shift.id,
        businessOpId: shift.id, traceparent, detail: { reason: (err as Error).message },
      });
    }
  }

  /** Mark an entity retired (offboarding). Non-blocking. */
  async retireEntity(opts: { entityId: string; accountUuid: string }): Promise<void> {
    const traceparent = this.newTrace();
    // Resolve the owning user for audit attribution (actor_id FK). If we can't,
    // the operation still runs but is un-attributable — skip the audit row
    // rather than throw an FK violation into the swallow.
    const owner = await prisma.user.findUnique({ where: { accountUuid: opts.accountUuid } });
    const actorId = owner?.id;

    let jwt: string;
    try {
      jwt = await getHakkenJwt(opts.accountUuid);
    } catch (err) {
      if (actorId) {
        await this.audit({
          actorId, operation: 'entity_retire', outcome: 'deferred', resourceId: opts.entityId,
          businessOpId: opts.accountUuid, traceparent, detail: { reason: (err as Error).message },
        });
      }
      return;
    }
    try {
      await hakkenRailClient.patchEntity(jwt, opts.entityId, { status: 'retired' }, { traceparent });
      if (actorId) {
        await this.audit({
          actorId, operation: 'entity_retire', outcome: 'success', resourceId: opts.entityId,
          businessOpId: opts.accountUuid, traceparent,
        });
      }
    } catch (err) {
      console.error('[HAKKEN] retireEntity failed (non-fatal):', (err as Error).message);
      if (actorId) {
        await this.audit({
          actorId, operation: 'entity_retire', outcome: 'error', resourceId: opts.entityId,
          businessOpId: opts.accountUuid, traceparent, detail: { reason: (err as Error).message },
        });
      }
    }
  }

  /**
   * Re-run a previously-deferred operation. Called only by the D2 sweep; routes
   * a `hakken.<operation>.deferred` audit row back to the method that produces
   * it. Each target method is idempotent (deterministic Hakken idempotency keys)
   * and non-blocking, so a replay either resolves the op (writes a fresh
   * `.success` row, dropping it from the pending set) or re-defers it.
   *   - entity_retire needs the accountUuid, which the deferred row carried as
   *     business_op_id; the other operations key purely off resourceId.
   */
  async replayDeferred(
    operation: HakkenReplayableOperation,
    resourceId: string,
    businessOpId: string | null
  ): Promise<void> {
    switch (operation) {
      case 'employer_register':
        return this.upsertEmployerEntity(resourceId);
      case 'worker_register':
        return this.upsertWorkerEntity(resourceId);
      case 'shift_publish':
        return this.publishShiftOpen(resourceId);
      case 'shift_revoke':
        return this.revokeShiftBroadcast(resourceId);
      case 'entity_retire':
        if (!businessOpId) return; // accountUuid unknown — cannot replay a retire
        return this.retireEntity({ entityId: resourceId, accountUuid: businessOpId });
    }
  }
}

export const hakkenIntegrationService = new HakkenIntegrationService();
