import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { authenticate, authorize } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { helpanRailClient, HELPAN_KLOKD_AGENT_ID } from '../rails';
import { getHelpanCustomerJwt } from '../rails/helpan.client';
import { HELPAN_KLOKD_SCOPES } from '../rails/helpan.dto';
import { logAudit } from '../../utils/auditLogger';

// Klokd v3 — Agent management routes (consuming app side).
// Workers grant the helpan-klokd-v1 agent authority to apply for shifts on
// their behalf within configured limits + time windows.

const router = Router();

// ─── Issue a delegated authority ──────────────────────────

const issueSchema = z.object({
  scopes: z
    .array(
      z.object({
        scopeId: z.string(),
        amountLimitMinor: z.number().int().positive().optional(),
        perPeriodLimitMinor: z.number().int().positive().optional(),
        period: z.enum(['daily', 'weekly', 'monthly']).optional(),
      })
    )
    .min(1),
  ttlSeconds: z.number().int().positive().max(86400),
  stepUpToken: z.string().optional(),
});

router.post('/authorities', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const data = issueSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user?.accountUuid) throw new AppError(422, 'User has no Identiti account');

  const authority = await helpanRailClient.issueAuthority({
    accountUuid: user.accountUuid as `acc_${string}`,
    agentId: HELPAN_KLOKD_AGENT_ID,
    scopes: data.scopes,
    ttlSeconds: data.ttlSeconds,
    stepUpToken: data.stepUpToken,
  });

  // CRITICAL: capture token now — Helpan never returns it on GET reads.
  await prisma.delegatedAuthority.create({
    data: {
      tenantId: user.tenantId,
      accountUuid: authority.accountUuid,
      agentId: authority.agentId,
      authorityJti: authority.id,
      authorityJwt: authority.token,
      scopes: JSON.stringify(authority.scopes),
      status: 'ACTIVE',
      ttlSeconds: data.ttlSeconds,
      issuedAt: new Date(authority.createdAt),
      expiresAt: new Date(authority.expiresAt),
    },
  });

  await logAudit({
    tenantId: user.tenantId,
    actorId: user.id,
    action: 'agent.authority.issued',
    resource: 'delegated_authority',
    resourceId: authority.id,
    metadata: { agentId: authority.agentId, scopes: data.scopes.map(s => s.scopeId) },
  });

  res.json({
    success: true,
    data: {
      authorityId: authority.id,
      agentId: authority.agentId,
      scopes: authority.scopes,
      expiresAt: authority.expiresAt,
    },
  });
});

router.get('/authorities', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user?.accountUuid) throw new AppError(422, 'User has no Identiti account');

  const authorities = await prisma.delegatedAuthority.findMany({
    where: { accountUuid: user.accountUuid, status: 'ACTIVE' },
    orderBy: { issuedAt: 'desc' },
    select: {
      id: true,
      authorityJti: true,
      agentId: true,
      scopes: true,
      status: true,
      issuedAt: true,
      expiresAt: true,
    },
  });

  res.json({ success: true, data: authorities });
});

router.delete('/authorities/:jti', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const jti = req.params.jti as string;
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user?.accountUuid) throw new AppError(422, 'User has no Identiti account');

  const auth = await prisma.delegatedAuthority.findUnique({ where: { authorityJti: jti } });
  if (!auth || auth.accountUuid !== user.accountUuid) {
    throw new AppError(404, 'Authority not found');
  }

  await helpanRailClient.revokeAuthority(jti, { reason: 'user_initiated' });

  await prisma.delegatedAuthority.update({
    where: { id: auth.id },
    data: { status: 'REVOKED', revokedAt: new Date() },
  });

  res.json({ success: true });
});

// ─── Create a briefing ──────────────────────────────────
// Briefings use BearerCustomer auth on Helpan's side. Klokd's API forwards the
// JWT it issued to the worker (or mints a customer JWT here — TBD).
// For now we accept the user's Klokd JWT and forward it — Helpan validates
// against Identiti's JWKS, and this works only when Klokd's JWT secret is
// linked to Identiti (out of scope for this turn; document as escalation).

const briefingSchema = z.object({
  briefingType: z.enum(['alert', 'standing_basket', 'scheduled_action', 'threshold_watch']),
  intent: z.record(z.string(), z.unknown()),
  expiresAt: z.string().datetime(),
  appCorrelationId: z.string().optional(),
});

router.post('/briefings', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const data = briefingSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
  if (!user?.accountUuid) throw new AppError(422, 'User has no Identiti account');

  // Helpan briefings are customer-JWT-only — an Identiti-minted RS256 token
  // scoped to Helpan's audience (session-shaped: scope/tier/session_kind/jti),
  // NOT Klokd's own JWT. Minted server-side + cached via Identiti 0.1.4.
  const customerJwt = await getHelpanCustomerJwt(user.accountUuid as `acc_${string}`);

  const briefing = await helpanRailClient.createBriefing(customerJwt, {
    briefingType: data.briefingType,
    intent: data.intent,
    expiresAt: data.expiresAt,
    appCorrelationId: data.appCorrelationId,
  });

  await prisma.agentBriefing.create({
    data: {
      tenantId: user.tenantId,
      accountUuid: briefing.accountUuid,
      helpanBriefingId: briefing.id,
      briefingType: briefing.briefingType,
      intent: JSON.stringify(briefing.intent),
      status: 'ACTIVE',
      createdAt: new Date(briefing.createdAt),
      expiresAt: new Date(briefing.expiresAt),
    },
  });

  res.json({ success: true, data: briefing });
});

// ─── Internal: ingest shift event to Helpan ──────────────
// Called by shift.service when a new shift posts. Fans out to any briefings
// matching klokd.shift_search intent.

export async function publishShiftToHelpan(shift: {
  id: string;
  tenantId: string;
  role: string;
  rateKes: number;
  locationLat: number;
  locationLng: number;
  startTime: Date;
}): Promise<void> {
  try {
    await helpanRailClient.ingestEvent({
      eventType: 'klokd.shift_offer',
      appId: 'klokd',
      accountUuid: null,
      payload: {
        shift_id: shift.id,
        category: shift.role,
        pay_minor: shift.rateKes * 100,
        location: { lat: shift.locationLat, lng: shift.locationLng },
        start_time: shift.startTime.toISOString(),
      },
      publishedAt: new Date().toISOString(),
      appCorrelationId: shift.id,
    });
  } catch (err) {
    // Non-blocking — shift still posts if Helpan is down.
    console.warn('[AGENT] Helpan ingest failed (non-fatal):', (err as Error).message);
  }
}

export default router;
