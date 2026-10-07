import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { rateLimiter } from '../../middleware/rateLimiter';
import prisma from '../../config/database';
import { config } from '../../config';

/**
 * REAL rail health — replaces the admin overview's hardcoded "all green"
 * panel with live probes of every KMV rail Klokd depends on:
 *
 *   - self     : this API's own DB round-trip (the anchor everything else needs)
 *   - identiti : identity / KYC / phone tokens
 *   - todoku   : SMS / OTP delivery
 *   - kppay    : M-Pesa escrow + payouts (provision-ready — expected down)
 *   - hakken   : shift discovery broadcasting
 *   - helpan   : AI match agent runtime
 *
 * Two surfaces:
 *
 *   GET /api/v1/rails/status        PUBLIC, coarse — {key, status} only, so
 *                                   the admin UI (incl. demo sessions, which
 *                                   hold no JWT) can show honest states.
 *                                   Fixed probe targets, no input reflection,
 *                                   rate-limited — a standard status page.
 *   GET /api/v1/admin/rails-health  ADMIN, detailed — + latency + diagnostics.
 *
 * Env vars absent → "unconfigured" (distinct from "down": nothing was
 * attempted, so operators see a provisioning gap, not an outage).
 */

const PROBE_TIMEOUT_MS = 2500;

type RailStatus = 'up' | 'down' | 'unconfigured';

interface ProbeResult {
  ok: boolean;
  ms: number;
  detail: string | null;
}

async function timedFetch(url: string): Promise<ProbeResult> {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return { ok: res.ok, ms: Date.now() - started, detail: res.ok ? null : `HTTP ${res.status}` };
  } catch (err) {
    const isTimeout = (err as Error).name === 'AbortError';
    return {
      ok: false,
      ms: Date.now() - started,
      detail: isTimeout ? `timeout >${PROBE_TIMEOUT_MS}ms` : (err as Error).message || 'unreachable',
    };
  } finally {
    clearTimeout(timer);
  }
}

async function probeDb(): Promise<ProbeResult> {
  const started = Date.now();
  try {
    await prisma.$queryRawUnsafe('SELECT 1');
    return { ok: true, ms: Date.now() - started, detail: null };
  } catch (err) {
    return { ok: false, ms: Date.now() - started, detail: (err as Error).message || 'DB unreachable' };
  }
}

interface RailDef {
  key: string;
  name: string;
  desc: string;
  baseUrl: string;
  path: string;
  probe: () => Promise<ProbeResult>;
}

function railDefs(): RailDef[] {
  const base = (u: string) => u.replace(/\/$/, '');
  return [
    {
      key: 'self',
      name: 'Klokd API',
      desc: 'Core API + database',
      baseUrl: 'self',
      path: '',
      probe: probeDb,
    },
    // No public /health on Identiti; the JWKS fetch doubles as a
    // well-defined, cache-friendly unauthenticated probe.
    {
      key: 'identiti',
      name: 'Identiti',
      desc: 'KYC + customers',
      baseUrl: config.identiti.baseUrl,
      path: '/.well-known/jwks.json',
      probe: () => timedFetch(`${base(config.identiti.baseUrl)}/.well-known/jwks.json`),
    },
    {
      key: 'todoku',
      name: 'Todoku',
      desc: 'SMS / OTP delivery',
      baseUrl: config.todoku.baseUrl,
      path: '/.well-known/jwks.json',
      probe: () => timedFetch(`${base(config.todoku.baseUrl)}/.well-known/jwks.json`),
    },
    // Provision-ready: env absent is EXPECTED until KP-1-Ops lands.
    {
      key: 'kppay',
      name: 'Kipkiren Pay',
      desc: 'M-Pesa escrow + payouts',
      baseUrl: config.paymentRail.baseUrl,
      path: '/health',
      probe: () => timedFetch(`${base(config.paymentRail.baseUrl)}/health`),
    },
    {
      key: 'hakken',
      name: 'Hakken',
      desc: 'Shift discovery broadcast',
      baseUrl: config.hakken.baseUrl,
      path: '/health',
      probe: () => timedFetch(`${base(config.hakken.baseUrl)}/health`),
    },
    {
      key: 'helpan',
      name: 'Helpan AI',
      desc: 'Match + scoring',
      baseUrl: config.helpan.baseUrl,
      path: '/health',
      probe: () => timedFetch(`${base(config.helpan.baseUrl)}/health`),
    },
  ];
}

interface RailHealth {
  key: string;
  name: string;
  desc: string;
  status: RailStatus;
  latencyMs: number | null;
  detail: string | null;
}

function toHealth(def: RailDef, r: ProbeResult | null): RailHealth {
  if (!r) {
    return {
      key: def.key,
      name: def.name,
      desc: def.desc,
      status: 'unconfigured',
      latencyMs: null,
      detail: 'Base URL not set — provisioning pending',
    };
  }
  return {
    key: def.key,
    name: def.name,
    desc: def.desc,
    status: r.ok ? 'up' : 'down',
    latencyMs: r.ms,
    detail: r.detail ?? (r.ok ? null : 'Probe rejected'),
  };
}

async function probeAll(): Promise<RailHealth[]> {
  return Promise.all(
    railDefs().map(def =>
      def.baseUrl ? def.probe().then(r => toHealth(def, r)) : Promise.resolve(toHealth(def, null))
    )
  );
}

// ─── PUBLIC coarse status ───────────────────────────────

export const railsStatusRouter = Router();

// Mounted at /api/v1/rails — serve both /status and the mount root.
railsStatusRouter.get('/status', rateLimiter(30, 60), statusHandler);
railsStatusRouter.get('/', rateLimiter(30, 60), statusHandler);

async function statusHandler(_req: Request, res: Response) {
  try {
    const rails = await probeAll();
    res.json({
      success: true,
      data: {
        checkedAt: new Date().toISOString(),
        rails: rails.map(r => ({ key: r.key, name: r.name, desc: r.desc, status: r.status })),
      },
    });
  } catch {
    res.status(503).json({ success: false, error: 'Health probe failed' });
  }
}

// ─── ADMIN detailed health ──────────────────────────────

export const railsHealthRouter = Router();

railsHealthRouter.get('/', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  const rails = await probeAll();
  const up = rails.filter(r => r.status === 'up').length;
  res.json({
    success: true,
    data: {
      checkedAt: new Date().toISOString(),
      allUp: up === rails.length,
      summary: `${up}/${rails.length} rails up`,
      rails,
    },
  });
});
