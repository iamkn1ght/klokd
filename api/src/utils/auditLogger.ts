import prisma from '../config/database';
import crypto from 'crypto';

export async function logAudit(params: {
  tenantId: string;
  actorId: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}): Promise<void> {
  await prisma.auditLog.create({
    data: {
      tenantId: params.tenantId,
      actorId: params.actorId,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      ipHash: params.ip ? crypto.createHash('sha256').update(params.ip).digest('hex') : null,
    },
  });
}
