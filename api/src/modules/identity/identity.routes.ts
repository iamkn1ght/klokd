import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { identityService } from './identity.service';
import { authenticate, authorize } from '../../middleware/auth';
import { storageService } from '../storage/storage.service';

const router = Router();

// ─── Worker Profile ─────────────────────────────────────

router.put('/workers/profile', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const schema = z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    skills: z.array(z.string()).optional(),
  });
  const data = schema.parse(req.body);
  const result = await identityService.upsertWorkerProfile(req.user!.userId, req.user!.tenantId, data);
  res.json({ success: true, data: result });
});

router.post('/workers/consent', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const schema = z.object({
    consentIdentity: z.boolean(),
    consentGps: z.boolean(),
  });
  const { consentIdentity, consentGps } = schema.parse(req.body);

  // Need worker record
  const worker = await (await import('../../config/database')).default.worker.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!worker) {
    res.status(404).json({ success: false, error: 'Worker profile not found. Complete profile setup first.' });
    return;
  }

  const result = await identityService.recordConsent(worker.id, req.user!.tenantId, consentIdentity, consentGps);
  res.json({ success: true, data: result });
});

router.post('/workers/verify-id', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const schema = z.object({
    idNumber: z.string().min(5),
    idFrontKey: z.string(),
    idBackKey: z.string(),
    selfieKey: z.string(),
  });
  const data = schema.parse(req.body);

  const worker = await (await import('../../config/database')).default.worker.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!worker) {
    res.status(404).json({ success: false, error: 'Worker profile not found' });
    return;
  }

  const result = await identityService.submitIdVerification(worker.id, req.user!.tenantId, data);
  res.json({ success: true, data: result });
});

router.put('/workers/mpesa', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  const schema = z.object({
    mpesaNumber: z.string().regex(/^(?:254|\+254|0)\d{9}$/, 'Invalid M-Pesa number'),
  });
  const { mpesaNumber } = schema.parse(req.body);

  const worker = await (await import('../../config/database')).default.worker.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!worker) {
    res.status(404).json({ success: false, error: 'Worker profile not found' });
    return;
  }

  const result = await identityService.setMpesaNumber(worker.id, mpesaNumber);
  res.json({ success: true, ...result });
});

// ─── Employer Profile ───────────────────────────────────

router.put('/employers/profile', authenticate, authorize('EMPLOYER'), async (req: Request, res: Response) => {
  const schema = z.object({
    businessName: z.string().min(1),
    kraPin: z.string().optional(),
    contactPerson: z.string().optional(),
  });
  const data = schema.parse(req.body);
  const result = await identityService.upsertEmployerProfile(req.user!.userId, req.user!.tenantId, data);
  res.json({ success: true, data: result });
});

router.post('/employers/wiba', authenticate, authorize('EMPLOYER'), async (req: Request, res: Response) => {
  const schema = z.object({
    policyRef: z.string().min(1),
    insurer: z.string().min(1),
    policyExpiry: z.string().transform(s => new Date(s)),
  });
  const data = schema.parse(req.body);

  const employer = await (await import('../../config/database')).default.employer.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!employer) {
    res.status(404).json({ success: false, error: 'Employer profile not found' });
    return;
  }

  const result = await identityService.declareWiba(employer.id, req.user!.tenantId, data);
  res.json({ success: true, data: result });
});

router.put('/employers/mpesa', authenticate, authorize('EMPLOYER'), async (req: Request, res: Response) => {
  const schema = z.object({
    method: z.enum(['paybill', 'till', 'personal']),
    accountNumber: z.string().min(1),
  });
  const { method, accountNumber } = schema.parse(req.body);

  const employer = await (await import('../../config/database')).default.employer.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!employer) {
    res.status(404).json({ success: false, error: 'Employer profile not found' });
    return;
  }

  const result = await identityService.setEmployerMpesa(employer.id, method, accountNumber);
  res.json({ success: true, ...result });
});

// ─── File Upload ───────────────────────────────────────

router.post('/upload', authenticate, async (req: Request, res: Response) => {
  const schema = z.object({
    type: z.enum(['id-front', 'id-back', 'selfie', 'certificate']),
    data: z.string().min(1), // base64 encoded
    contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']).default('image/jpeg'),
  });
  const { type, data, contentType } = schema.parse(req.body);

  const worker = await (await import('../../config/database')).default.worker.findUnique({
    where: { userId: req.user!.userId },
  });
  if (!worker) {
    res.status(404).json({ success: false, error: 'Worker profile not found' });
    return;
  }

  const buffer = Buffer.from(data, 'base64');

  let storageKey: string;
  if (type === 'selfie') {
    storageKey = await storageService.uploadSelfie(worker.id, buffer, contentType);
  } else if (type === 'certificate') {
    storageKey = await storageService.uploadCertificate(worker.id, buffer, contentType);
  } else {
    const side = type === 'id-front' ? 'front' : 'back';
    storageKey = await storageService.uploadIdDocument(worker.id, side, buffer, contentType);
  }

  res.json({ success: true, data: { storageKey } });
});

// ─── Admin ──────────────────────────────────────────────

router.patch('/admin/workers/:workerId/verification', authenticate, authorize('ADMIN'), async (req: Request, res: Response) => {
  const schema = z.object({
    status: z.enum(['APPROVED', 'REJECTED']),
  });
  const { status } = schema.parse(req.body);
  const result = await identityService.updateVerificationStatus(
    req.params.workerId as string,
    req.user!.tenantId,
    status,
    req.user!.userId
  );
  res.json({ success: true, data: result });
});

export default router;
