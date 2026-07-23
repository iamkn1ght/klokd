import prisma from '../../config/database';
import { config } from '../../config';
import { logAudit } from '../../utils/auditLogger';
import {
  hakkenIntegrationService,
  hakkenReplayReady,
  HAKKEN_REPLAYABLE_OPERATIONS,
  type HakkenReplayableOperation,
} from './hakken.service';

// Klokd v3 — Hakken deferral-retry sweep (D2)
//
// The audit_log IS the deferral queue. Every Hakken trigger that can't reach the
// rail (today: no aud=hakken JWT) writes a `hakken.<operation>.deferred` row
// carrying resourceId + business_op_id + traceparent. This job replays those
// rows so a stranded employer/worker/shift eventually lands on Hakken.
//
// DESIGN
//   1. Probe-gate. If the aud=hakken JWT is unavailable (the systemic blocker),
//      the whole sweep no-ops after one cheap check — it never churns the
//      backlog or inflates attempt counts while nothing can possibly succeed.
//   2. Pending detection. Group the service's own audit rows by (operation,
//      resourceId); an op is pending iff its LATEST outcome is `deferred`
//      (a later `success` resolves it; `error`/`skipped` are out of D2 scope).
//   3. Backoff + cap (Hakken R7). Attempts are counted from the sweep's OWN
//      `hakken.sweep_replay.*` marker rows written AFTER the latest deferral —
//      kept separate from trigger-origin deferrals so a fresh business event
//      resets the retry budget. wait = backoffBaseMs * 2^(attempts-1); a key is
//      abandoned (logged, not retried) once attempts >= maxAttempts.
//   4. Idempotent replay. replayDeferred() re-runs the original method, which
//      uses deterministic Hakken idempotency keys, so replays can't double-post.

const SWEEP_MARKER_ACTION_PREFIX = 'hakken.sweep_replay.';

interface PendingDeferral {
  operation: HakkenReplayableOperation;
  resourceId: string;
  businessOpId: string | null;
  actorId: string; // carried from the deferred row (valid users.id FK for markers)
  latestDeferredAt: Date;
}

export interface SweepResult {
  skippedReason?: 'not_ready' | 'disabled';
  pending: number;
  replayed: number;
  resolved: number;
  waitingBackoff: number;
  exhausted: number;
}

export class HakkenDeferralSweepService {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private running = false;

  /** Parse `hakken.<operation>.<outcome>` → its parts (null if not one of ours). */
  private parseAction(action: string): { operation: string; outcome: string } | null {
    if (!action.startsWith('hakken.')) return null;
    const parts = action.split('.');
    if (parts.length < 3) return null;
    return { operation: parts.slice(1, -1).join('.'), outcome: parts[parts.length - 1] };
  }

  /**
   * The current pending set: operations whose most-recent service audit row is a
   * `deferred`. Reads only trigger/service rows (`hakken.<op>.<outcome>`), never
   * the sweep's own `hakken.sweep_replay.*` markers.
   */
  async findPendingDeferrals(): Promise<PendingDeferral[]> {
    const since = new Date(Date.now() - config.hakkenSweep.lookbackDays * 86_400_000);
    const rows = await prisma.auditLog.findMany({
      where: { resource: 'hakken_integration', createdAt: { gte: since } },
      orderBy: { createdAt: 'asc' },
      select: { action: true, actorId: true, resourceId: true, metadata: true, createdAt: true },
    });

    // Fold to the latest service row per (operation, resourceId).
    const latest = new Map<string, PendingDeferral & { outcome: string }>();
    for (const row of rows) {
      const parsed = this.parseAction(row.action);
      if (!parsed) continue;
      if (!HAKKEN_REPLAYABLE_OPERATIONS.includes(parsed.operation as HakkenReplayableOperation)) {
        continue; // excludes sweep_replay markers and any unknown op
      }
      if (!row.resourceId) continue;
      const key = `${parsed.operation}:${row.resourceId}`;
      let meta: Record<string, unknown> = {};
      try {
        meta = row.metadata ? JSON.parse(row.metadata) : {};
      } catch {
        meta = {};
      }
      latest.set(key, {
        operation: parsed.operation as HakkenReplayableOperation,
        resourceId: row.resourceId,
        businessOpId: (meta.business_op_id as string | null) ?? null,
        actorId: row.actorId,
        latestDeferredAt: row.createdAt,
        outcome: parsed.outcome,
      });
    }

    return [...latest.values()]
      .filter((e) => e.outcome === 'deferred')
      .map(({ outcome: _outcome, ...pending }) => pending);
  }

  /** Sweep-written attempt markers for a key, created after `after`. */
  private async attemptsSince(
    operation: string,
    resourceId: string,
    after: Date
  ): Promise<{ count: number; lastAt: Date | null }> {
    const markers = await prisma.auditLog.findMany({
      where: {
        resource: 'hakken_integration',
        action: { startsWith: SWEEP_MARKER_ACTION_PREFIX },
        resourceId,
        createdAt: { gt: after },
      },
      orderBy: { createdAt: 'desc' },
      select: { metadata: true, createdAt: true },
    });
    // resourceId is shared across operations only if the same id is reused for
    // two op types (won't happen — employer/worker/shift ids are distinct), but
    // filter on the recorded operation anyway to be exact.
    const mine = markers.filter((m) => {
      try {
        return m.metadata ? JSON.parse(m.metadata).operation === operation : false;
      } catch {
        return false;
      }
    });
    return { count: mine.length, lastAt: mine[0]?.createdAt ?? null };
  }

  private backoffMs(attempts: number): number {
    if (attempts <= 0) return 0;
    return config.hakkenSweep.backoffBaseMs * 2 ** (attempts - 1);
  }

  private async writeMarker(
    d: PendingDeferral,
    attempt: number,
    replayOutcome: 'resolved' | 'still_pending'
  ): Promise<void> {
    try {
      await logAudit({
        tenantId: config.defaultTenantId,
        actorId: d.actorId,
        action: `${SWEEP_MARKER_ACTION_PREFIX}${replayOutcome}`,
        resource: 'hakken_integration',
        resourceId: d.resourceId,
        metadata: {
          operation: d.operation,
          business_op_id: d.businessOpId,
          attempt,
          replayOutcome,
          at: new Date().toISOString(),
        },
      });
    } catch {
      // marker is best-effort; never let it break the sweep
    }
  }

  /** Did the key resolve? True iff its latest service outcome is now `success`. */
  private async isResolved(operation: string, resourceId: string): Promise<boolean> {
    const rows = await prisma.auditLog.findMany({
      where: { resource: 'hakken_integration', resourceId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { action: true },
    });
    for (const row of rows) {
      const parsed = this.parseAction(row.action);
      if (parsed?.operation === operation) return parsed.outcome === 'success';
    }
    return false;
  }

  /** One sweep pass. Safe to call concurrently — re-entrancy is guarded. */
  async sweep(): Promise<SweepResult> {
    if (!config.hakkenSweep.enabled) return zero({ skippedReason: 'disabled' });
    if (this.running) return zero({});
    this.running = true;
    try {
      const pending = await this.findPendingDeferrals();
      if (pending.length === 0) return { ...zero({}), pending: 0 };

      // Probe-gate: nothing can succeed until both prerequisites are in place
      // (Hakken creds wired + Identiti minting authorized), so don't burn attempts.
      if (!(await hakkenReplayReady())) {
        console.log(`[HAKKEN-SWEEP] ${pending.length} deferral(s) waiting on Hakken prerequisites (Identiti scope grant / Hakken creds) — skipping replay`);
        return { ...zero({ skippedReason: 'not_ready' }), pending: pending.length };
      }

      let replayed = 0;
      let resolved = 0;
      let waitingBackoff = 0;
      let exhausted = 0;

      for (const d of pending) {
        const { count: attempts, lastAt } = await this.attemptsSince(
          d.operation,
          d.resourceId,
          d.latestDeferredAt
        );

        if (attempts >= config.hakkenSweep.maxAttempts) {
          exhausted++;
          continue;
        }
        const waited = Date.now() - (lastAt ?? d.latestDeferredAt).getTime();
        if (waited < this.backoffMs(attempts)) {
          waitingBackoff++;
          continue;
        }

        await hakkenIntegrationService.replayDeferred(d.operation, d.resourceId, d.businessOpId);
        replayed++;
        const ok = await this.isResolved(d.operation, d.resourceId);
        if (ok) resolved++;
        await this.writeMarker(d, attempts + 1, ok ? 'resolved' : 'still_pending');
      }

      console.log(
        `[HAKKEN-SWEEP] pending=${pending.length} replayed=${replayed} resolved=${resolved} ` +
          `waitingBackoff=${waitingBackoff} exhausted=${exhausted}`
      );
      return { pending: pending.length, replayed, resolved, waitingBackoff, exhausted };
    } finally {
      this.running = false;
    }
  }

  start(intervalMs = config.hakkenSweep.intervalMs) {
    if (this.intervalHandle) return;
    if (!config.hakkenSweep.enabled) {
      console.log('[HAKKEN-SWEEP] disabled (HAKKEN_SWEEP_ENABLED=false)');
      return;
    }
    console.log(`[HAKKEN-SWEEP] Started (interval: ${intervalMs / 1000}s)`);
    this.intervalHandle = setInterval(() => {
      this.sweep().catch((err) => console.error('[HAKKEN-SWEEP] pass failed:', err));
    }, intervalMs);
  }

  stop() {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
      console.log('[HAKKEN-SWEEP] Stopped');
    }
  }
}

function zero(partial: Partial<SweepResult>): SweepResult {
  return { pending: 0, replayed: 0, resolved: 0, waitingBackoff: 0, exhausted: 0, ...partial };
}

export const hakkenDeferralSweepService = new HakkenDeferralSweepService();
