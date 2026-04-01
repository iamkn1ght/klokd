import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { complianceService } from './compliance.service';
import { authenticate, authorize } from '../../middleware/auth';
import prisma from '../../config/database';

const router = Router();

// POST /compliance/calculate — PAYE, NSSF, SHIF, AHL per shift
router.post('/calculate', authenticate, async (req: Request, res: Response) => {
  const schema = z.object({
    grossKes: z.number().positive(),
    monthlyGrossAggregate: z.number().positive().optional(),
  });
  const { grossKes, monthlyGrossAggregate } = schema.parse(req.body);
  const result = await complianceService.calculateDeductions(
    req.user!.tenantId, grossKes, monthlyGrossAggregate
  );
  res.json({ success: true, data: result });
});

// GET /compliance/wiba/:shiftId — hard gate before clock-in
router.get('/wiba/:shiftId', authenticate, async (req: Request, res: Response) => {
  const shift = await prisma.shift.findUnique({
    where: { id: req.params.shiftId as string },
  });
  if (!shift) {
    res.status(404).json({ success: false, error: 'Shift not found' });
    return;
  }
  const result = await complianceService.checkWiba(shift.employerId, req.user!.tenantId);
  res.json({ success: true, data: result });
});

// GET /compliance/section37/:workerId/:employerId — threshold monitoring
router.get('/section37/:workerId/:employerId', authenticate, async (req: Request, res: Response) => {
  const result = await complianceService.checkSection37(
    req.params.workerId as string,
    req.params.employerId as string,
    req.user!.tenantId
  );
  res.json({ success: true, data: result });
});

// POST /compliance/minwage/validate — blocking gate on shift posting
router.post('/minwage/validate', authenticate, async (req: Request, res: Response) => {
  const schema = z.object({
    sector: z.string(),
    location: z.string(),
    proposedRate: z.number().positive(),
  });
  const data = schema.parse(req.body);
  const result = await complianceService.validateMinWage(
    req.user!.tenantId, data.sector, data.location, data.proposedRate
  );
  res.json({ success: true, data: result });
});

// ─── Admin: Update Compliance Config ────────────────────

router.put('/config/:key', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const schema = z.object({
    value: z.unknown(),
  });
  const { value } = schema.parse(req.body);

  const existing = await prisma.complianceConfig.findUnique({
    where: { tenantId_key: { tenantId: req.user!.tenantId, key: req.params.key as string } },
  });

  await prisma.complianceConfig.upsert({
    where: { tenantId_key: { tenantId: req.user!.tenantId, key: req.params.key as string } },
    create: {
      tenantId: req.user!.tenantId,
      key: req.params.key as string,
      value: JSON.stringify(value),
      updatedBy: req.user!.userId,
    },
    update: {
      value: JSON.stringify(value),
      updatedBy: req.user!.userId,
    },
  });

  // Audit trail
  await prisma.auditLog.create({
    data: {
      tenantId: req.user!.tenantId,
      actorId: req.user!.userId,
      action: 'compliance_config.updated',
      resource: 'compliance_config',
      resourceId: req.params.key as string,
      metadata: JSON.stringify({
        previousValue: existing?.value ?? null,
        newValue: value,
      }),
    },
  });

  res.json({ success: true, message: `Config '${req.params.key as string}' updated` });
});

export default router;
