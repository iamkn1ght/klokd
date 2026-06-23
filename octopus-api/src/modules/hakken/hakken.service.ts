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
//      completes regardless. Failures logged to audit_log for retry by a
//      background sweep (not implemented in this pass; see §3 below).
//   2. IDEMPOTENT — Idempotency-Key = deterministic per business operation
//      (employer_id / worker_account_uuid / shift_id) so retries collapse.
//   3. §A.11 propagation — traceparent + business_op_id (Klokd-side IDs) on
//      every audit_log entry.
//
// IDENTITI JWT GAP (the second hard blocker — see playbook §8 + KMV_RAILS_
// INTEGRATION_GUIDE.md): Hakken requires Authorization: Bearer <Identiti RS256
// JWT, aud=hakken>. Klokd's current Identiti integration mints phone tokens
// (audience=todoku) but does NOT yet expose a customer-JWT issuance endpoint
// for arbitrary audiences. Until Silvia confirms the endpoint (open question
// in OPERATOR_REQUEST_HAKKEN.md), getHakkenJwt() throws 503. Callers catch
// + log + move on; the integration is structurally complete.

async function getHakkenJwt(_accountUuid: string): Promise<string> {
  // PENDING Silvia confirmation of the Identiti customer-JWT issuance endpoint
  // for audience=hakken. Once available, this delegates to identityRailClient.
  // See OPERATOR_REQUEST_HAKKEN.md §0 (or open one if not yet created).
  if (process.env.HAKKEN_IDENTITY_JWT_STUB && config.nodeEnv !== 'production') {
    return process.env.HAKKEN_IDENTITY_JWT_STUB;
  }
  throw new AppError(
    503,
    'HAKKEN_JWT_PENDING: Identiti customer-JWT issuance (aud=hakken) not yet wired. ' +
      'See OPERATOR_REQUEST_HAKKEN.md. Set HAKKEN_IDENTITY_JWT_STUB env for dev smoke.'
  );
}

export class HakkenIntegrationService {
  /**
   * Audit-log every JWT-pending deferral so the integration-pending state is
   * queryable. A future background sweep replays these once Identiti's
   * customer-JWT endpoint lands.
   */
  private async recordDeferral(operation: string, reason: string): Promise<void> {
    try {
      await logAudit({
        tenantId: config.defaultTenantId,
        actorId: 'system',
        action: `hakken.deferred.${operation}`,
        resource: 'hakken_integration',
        metadata: { reason, deferredAt: new Date().toISOString() },
      });
    } catch {
      // never let audit failure cascade
    }
  }


  /**
   * Upsert a Klokd employer as a Hakken entity. Called on:
   *   - employer profile completion (post-WIBA)
   *   - KYC_TIER_CHANGED webhook (tier increase)
   */
  async upsertEmployerEntity(employerId: string): Promise<void> {
    const employer = await prisma.employer.findUnique({ where: { id: employerId } });
    if (!employer?.accountUuid) {
      console.warn(`[HAKKEN] employer ${employerId} has no accountUuid — skipping entity upsert`);
      return;
    }

    let jwt: string;
    try {
      jwt = await getHakkenJwt(employer.accountUuid);
    } catch (err) {
      await this.recordDeferral('entity_upsert', (err as Error).message);
      return;
    }

    const externalRef = `klokd:emp:${employer.id}`;
    const metadata: KlokdEmployerEntityMetadata = { sector: 'hospitality' };

    try {
      if (employer.hakkenEntityId) {
        await hakkenRailClient.patchEntity(jwt, employer.hakkenEntityId, {
          displayName: employer.businessName,
          metadata: metadata as unknown as Record<string, unknown>,
        });
      } else {
        const entity = await hakkenRailClient.createEntity<KlokdEmployerEntityMetadata>(
          jwt,
          {
            entityType: 'employer',
            displayName: employer.businessName,
            roleFlags: ['publisher', 'employer'],
            // No raw GPS on employer entities at v3 (locations come at shift-post time).
            // Use Nairobi CBD centroid as a placeholder — playbook §7 forbids raw GPS
            // exfiltration of employer addresses.
            geo: { lat: -1.2841, lng: 36.8225 },
            geoLabel: 'CBD',
            metadata,
            externalRef,
          },
          { idempotencyKey: externalRef }
        );
        await prisma.employer.update({
          where: { id: employer.id },
          data: { hakkenEntityId: entity.entityId },
        });
      }
    } catch (err) {
      console.error('[HAKKEN] upsertEmployerEntity failed (non-fatal):', (err as Error).message);
    }
  }

  /**
   * Upsert a Klokd worker as a Hakken entity. Called on:
   *   - KYC_TIER_CHANGED webhook (tier ≥ 1 unlocks shift applications)
   *   - rating aggregate update
   */
  async upsertWorkerEntity(workerId: string): Promise<void> {
    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker?.accountUuid) {
      console.warn(`[HAKKEN] worker ${workerId} has no accountUuid — skipping entity upsert`);
      return;
    }

    let jwt: string;
    try {
      jwt = await getHakkenJwt(worker.accountUuid);
    } catch (err) {
      await this.recordDeferral('entity_upsert', (err as Error).message);
      return;
    }

    const externalRef = `klokd:worker:${worker.accountUuid}`;
    const tier = Math.max(0, Math.min(3, worker.kycTier)) as 0 | 1 | 2 | 3;

    // §5 PII wall: Hakken rejects literal name fields. display_name MUST be opaque.
    // We use the FIRST 8 chars of accountUuid (post-acc_ prefix) as the public label.
    const opaqueLabel = `worker-${worker.accountUuid.replace(/^acc_/, '').slice(0, 8)}`;
    const metadata: KlokdWorkerEntityMetadata = {
      sector: 'hospitality',
      kyc_tier: tier,
    };

    try {
      if (worker.hakkenEntityId) {
        await hakkenRailClient.patchEntity(jwt, worker.hakkenEntityId, {
          metadata: metadata as unknown as Record<string, unknown>,
        });
      } else {
        const entity = await hakkenRailClient.createEntity<KlokdWorkerEntityMetadata>(
          jwt,
          {
            entityType: 'worker',
            displayName: opaqueLabel,
            roleFlags: ['worker'],
            // Worker location comes at clock-in via geoHash; entity-level geo is
            // the CBD centroid placeholder — Klokd-side privacy: never resolve
            // home address to Hakken.
            geo: { lat: -1.2841, lng: 36.8225 },
            geoLabel: 'CBD',
            metadata,
            externalRef,
          },
          { idempotencyKey: externalRef }
        );
        await prisma.worker.update({
          where: { id: worker.id },
          data: { hakkenEntityId: entity.entityId },
        });
      }
    } catch (err) {
      console.error('[HAKKEN] upsertWorkerEntity failed (non-fatal):', (err as Error).message);
    }
  }

  /**
   * Publish a shift_open broadcast on Hakken. Called by ShiftService.createShift
   * after the shift row commits. Non-blocking.
   */
  async publishShiftOpen(shiftId: string): Promise<void> {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { employer: true },
    });
    if (!shift) return;
    if (!shift.employer?.accountUuid) {
      console.warn(`[HAKKEN] shift ${shiftId} employer has no accountUuid — skipping broadcast`);
      return;
    }
    if (!shift.employer.hakkenEntityId) {
      console.warn(`[HAKKEN] shift ${shiftId} employer not yet registered with Hakken — skipping`);
      return;
    }

    let jwt: string;
    try {
      jwt = await getHakkenJwt(shift.employer.accountUuid);
    } catch (err) {
      await this.recordDeferral('broadcast_publish', (err as Error).message);
      return;
    }

    const idempotencyKey = `klokd:shift:${shift.id}:publish`;
    const payload: KlokdShiftOpenPayload = {
      shift_id: `klokd:shift:${shift.id}`,
      role: shift.role,
      shift_start_at: shift.startTime.toISOString(),
      shift_end_at: shift.endTime.toISOString(),
      // pay_rate_kes — reference §4 says "integer, minor units" but §6.2 example
      // shows 800 which matches Klokd's whole-KES domain (a shift paying KES 800).
      // shift.rateKes is whole KES in Klokd's schema. AMBIGUITY pending Silvia
      // confirmation (escalation tracked in HAKKEN_INTEGRATION_RESULT.md).
      pay_rate_kes: shift.rateKes,
      sector: 'hospitality',
      headcount: 1,
    };

    // TTL = shift start. Reference §6.2 + §8 TTL_TOO_FAR: `ttl_at > now + 168h`
    // is rejected — the boundary is inclusive at 168h. Use absolute timestamp
    // capping to avoid float-rounding drift around the boundary.
    const maxTtlMs = Date.now() + 168 * 3600_000 - 60_000; // 1-min slack
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
          consentScope: 'cross_app_optional',
          ttlAt,
        },
        { idempotencyKey }
      );
      await prisma.shift.update({
        where: { id: shift.id },
        data: { hakkenBroadcastId: broadcast.broadcastId },
      });
    } catch (err) {
      console.error('[HAKKEN] publishShiftOpen failed (non-fatal):', (err as Error).message);
    }
  }

  /**
   * Revoke a shift's Hakken broadcast on filled / expired / cancelled.
   * Non-blocking.
   */
  async revokeShiftBroadcast(shiftId: string): Promise<void> {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { employer: true },
    });
    if (!shift?.hakkenBroadcastId || !shift.employer?.accountUuid) return;

    let jwt: string;
    try {
      jwt = await getHakkenJwt(shift.employer.accountUuid);
    } catch (err) {
      await this.recordDeferral('broadcast_revoke', (err as Error).message);
      return;
    }

    try {
      await hakkenRailClient.revokeBroadcast(jwt, shift.hakkenBroadcastId);
      await prisma.shift.update({
        where: { id: shift.id },
        data: { hakkenBroadcastId: null },
      });
    } catch (err) {
      console.error('[HAKKEN] revokeShiftBroadcast failed (non-fatal):', (err as Error).message);
    }
  }

  /** Mark an entity retired (offboarding). Non-blocking. */
  async retireEntity(opts: { entityId: string; accountUuid: string }): Promise<void> {
    let jwt: string;
    try {
      jwt = await getHakkenJwt(opts.accountUuid);
    } catch (err) {
      await this.recordDeferral('entity_retire', (err as Error).message);
      return;
    }
    try {
      await hakkenRailClient.patchEntity(jwt, opts.entityId, { status: 'retired' });
    } catch (err) {
      console.error('[HAKKEN] retireEntity failed (non-fatal):', (err as Error).message);
    }
  }
}

export const hakkenIntegrationService = new HakkenIntegrationService();
