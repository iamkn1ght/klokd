import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { identityService } from './identity.service';
import { authenticate, authorize } from '../../middleware/auth';
import { storageService } from '../storage/storage.service';
import prisma from '../../config/database';

// Klokd v3 — Identity routes
// AD-K02: National ID + biometrics flow to Identiti.
// AD-K04: Pay statements + contracts + certificates remain in Klokd S3.
// M-Pesa numbers are no longer collected by Klokd — Identiti holds the phone token,
// Kipkiren Pay holds the wallet/payout destination.

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

  const worker = await prisma.worker.findUnique({ where: { userId: req.user!.userId } });
  if (!worker) {
    res.status(404).json({ success: false, error: 'Worker profile not found. Complete profile setup first.' });
    return;
  }

  const result = await identityService.recordConsent(worker.id, req.user!.tenantId, consentIdentity, consentGps);
  res.json({ success: true, data: result });
});

router.post('/workers/verify-id', authenticate, authorize('WORKER'), async (req: Request, res: Response) => {
  // Identiti KYC is an IPRS data lookup, not an image upload (AD-K02: no
  // National ID image ever reaches Klokd). Constraints mirror the rail schema:
  // national_id ^[0-9]{7,9}$, date_of_birth YYYY-MM-DD (not a full date-time).
  const schema = z.object({
    nationalId: z.string().regex(/^[0-9]{7,9}$/, 'National ID must be 7-9 digits'),
    nameFirst: z.string().min(1).max(100),
    nameLast: z.string().min(1).max(100),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be YYYY-MM-DD'),
  });
  const data = schema.parse(req.body);

  const worker = await prisma.worker.findUnique({ where: { userId: req.user!.userId } });
  if (!worker) {
    res.status(404).json({ success: false, error: 'Worker profile not found' });
    return;
  }

  const result = await identityService.submitIdVerification(worker.id, req.user!.tenantId, data);
  res.json({ success: true, data: result });
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

  const employer = await prisma.employer.findUnique({ where: { userId: req.user!.userId } });
  if (!employer) {
    res.status(404).json({ success: false, error: 'Employer profile not found' });
    return;
  }

  const result = await identityService.declareWiba(employer.id, req.user!.tenantId, data);
  res.json({ success: true, data: result });
});

// ─── File Upload (certificates only; AD-K02 bars identity docs from Klokd S3) ──

router.post('/upload', authenticate, async (req: Request, res: Response) => {
  const schema = z.object({
    type: z.literal('certificate'),
    data: z.string().min(1),
    contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']).default('image/jpeg'),
  });
  const { data, contentType } = schema.parse(req.body);

  const worker = await prisma.worker.findUnique({ where: { userId: req.user!.userId } });
  if (!worker) {
    res.status(404).json({ success: false, error: 'Worker profile not found' });
    return;
  }

  const buffer = Buffer.from(data, 'base64');
  const storageKey = await storageService.uploadCertificate(worker.id, buffer, contentType);
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
