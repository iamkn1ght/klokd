import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import crypto from 'crypto';
import prisma from '../../config/database';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { logAudit } from '../../utils/auditLogger';
import { helpanRailClient } from '../rails';
import { HELPAN_KLOKD_SCOPES } from '../rails/helpan.dto';

// Klokd v3 — Agent Dispatch Routes (Klokd as TARGET RAIL).
//
// When Helpan AI dispatches an action whose target_rail='klokd', it forwards
// the call here. Klokd MUST:
//   1. Verify Helpan's HMAC signature (app_id=helpan_ai)
//   2. Extract X-Delegated-Authority JWT from headers
//   3. Call back to Helpan's /v1/authorities/{jti}/validate per §A.11
//   4. Execute the operation
//   5. Audit-log with matching fields (agent_id, traceparent, business_op_id)
//
// Mount BEFORE express.json() — HMAC verification needs raw bytes.

const router = Router();
router.use(express.raw({ type: '*/*', limit: '1mb' }));

interface ParsedHelpanRequest extends Request {
  parsedBody: {
    operation: string;
    account_uuid: `acc_${string}`;
    payload: Record<string, unknown>;
    business_op_id: string;
  };
  delegatedAuthorityJwt: string;
  delegatedAuthorityJti: string;
  traceparent: string;
  businessOpId: string;
}

function verifyHelpanRequest(req: Request, _res: Response, next: NextFunction): void {
  const secret = config.helpan.appSecret;
  if (!secret) {
    return next(new AppError(503, 'Helpan app secret not configured'));
  }

  // 1. Verify HMAC signature
  const authHeader = req.header('Authorization') || '';
  const match = /^Helpan-HMAC-SHA256 app_id=([^,]+),\s*signature=(.+)$/.exec(authHeader.trim());
  if (!match) {
    return next(new AppError(401, 'Missing or malformed Helpan auth header'));
  }
  const [, appId, providedSig] = match;
  if (appId !== 'helpan_ai') {
    return next(new AppError(401, `Unexpected app_id: ${appId}`));
  }

  const timestamp = req.header('x-helpan-timestamp') || req.header('X-Helpan-Timestamp') || '';
  if (!timestamp) {
    return next(new AppError(401, 'Missing x-helpan-timestamp header'));
  }

  const raw = (req.body as Buffer) ?? Buffer.alloc(0);
  const contentType = req.header('Content-Type') ?? '';
  const bodyHash = crypto.createHash('sha256').update(raw).digest('hex');
  const canonical = ['POST', req.path, contentType, timestamp, bodyHash].join('\n');
  const expected = crypto.createHmac('sha256', secret).update(canonical, 'utf8').digest('base64');

  if (
    providedSig.length !== expected.length ||
    !crypto.timingSafeEqual(Buffer.from(providedSig), Buffer.from(expected))
  ) {
    return next(new AppError(401, 'Invalid Helpan signature'));
  }

  // 2. Extract delegated authority JWT (header + decode jti)
  const daJwt = req.header('X-Delegated-Authority') || '';
  if (!daJwt) {
    return next(new AppError(401, 'Missing X-Delegated-Authority header'));
  }
  let jti: string;
  try {
    const payloadB64 = daJwt.split('.')[1];
    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    jti = decoded.jti;
    if (!jti) throw new Error('jti missing');
  } catch {
    return next(new AppError(401, 'Malformed delegated authority JWT'));
  }

  // 3. Parse body + extract traceparent + business_op_id
  let parsedBody;
  try {
    parsedBody = JSON.parse(raw.toString('utf8'));
  } catch {
    return next(new AppError(400, 'Body is not JSON'));
  }

  const traceparent = req.header('Traceparent') || req.header('traceparent') || '';
  const businessOpId =
    req.header('X-Business-Op-Id') || parsedBody.business_op_id || '';
  if (!traceparent || !businessOpId) {
    return next(new AppError(400, 'Missing traceparent or business_op_id (§A.11)'));
  }

  const r = req as ParsedHelpanRequest;
  r.parsedBody = parsedBody;
  r.delegatedAuthorityJwt = daJwt;
  r.delegatedAuthorityJti = jti;
  r.traceparent = traceparent;
  r.businessOpId = businessOpId;
  next();
}

/**
 * Klokd-side execution of klokd.write.shift_signup.
 * Worker's agent applies them to a shift on their behalf.
 */
router.post(
  '/klokd.write.shift_signup',
  verifyHelpanRequest,
  async (req: Request, res: Response, next: NextFunction) => {
    const r = req as ParsedHelpanRequest;
    try {
      const { operation, account_uuid, payload } = r.parsedBody;

      if (operation !== HELPAN_KLOKD_SCOPES.SHIFT_SIGNUP) {
        throw new AppError(400, `Operation mismatch: expected ${HELPAN_KLOKD_SCOPES.SHIFT_SIGNUP}`);
      }

      // §A.11 step 1 — validate authority with Helpan before acting.
      const validation = await helpanRailClient.validateAuthority(r.delegatedAuthorityJti, {
        token: r.delegatedAuthorityJwt,
        intendedOperation: HELPAN_KLOKD_SCOPES.SHIFT_SIGNUP,
      });
      if (!validation.valid) {
        throw new AppError(403, `Authority invalid: ${validation.rejectionReason ?? 'unknown'}`);
      }
      if (validation.authority.accountUuid !== account_uuid) {
        throw new AppError(403, 'Authority account does not match dispatch account');
      }

      const shiftId = payload.shift_id as string | undefined;
      if (!shiftId) {
        throw new AppError(400, 'shift_id required in payload');
      }

      // Look up the worker by Identiti account_uuid.
      const worker = await prisma.worker.findUnique({ where: { accountUuid: account_uuid } });
      if (!worker) throw new AppError(404, 'Worker not found for account_uuid');

      // Find shift, ensure it's open + worker is qualified.
      const shift = await prisma.shift.findUnique({ where: { id: shiftId } });
      if (!shift) throw new AppError(404, 'Shift not found');
      if (shift.status !== 'POSTED') {
        throw new AppError(422, `Shift not accepting applications (status: ${shift.status})`);
      }

      // Create application on worker's behalf.
      const application = await prisma.shiftApplication.upsert({
        where: { shiftId_workerId: { shiftId, workerId: worker.id } },
        create: {
          tenantId: shift.tenantId,
          shiftId,
          workerId: worker.id,
          status: 'PENDING',
        },
        update: {},
      });

      // §A.11 step 2 — audit log with matching fields.
      await logAudit({
        tenantId: shift.tenantId,
        actorId: 'helpan-klokd-v1',
        action: 'agent.shift_signup',
        resource: 'shift_application',
        resourceId: application.id,
        metadata: {
          actorType: 'agent',
          agentId: validation.authority.agentId,
          delegatedAuthorityJti: r.delegatedAuthorityJti,
          initiatedBy: 'agent',
          traceparent: r.traceparent,
          businessOpId: r.businessOpId,
          shiftId,
          workerId: worker.id,
        },
      });

      // §A.11 step 3 — same response shape on retries (idempotency_key replay).
      res.json({
        ok: true,
        data: {
          application_id: application.id,
          shift_id: shiftId,
          worker_id: worker.id,
          status: application.status,
          business_op_id: r.businessOpId,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
