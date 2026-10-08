import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../../middleware/auth';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';

/**
 * Early-access waitlist — public capture for klokd.co.ke while self-serve
 * sign-in is gated (Todoku SMS channels unavailable). Upserts by phone so a
 * resubmit updates the row instead of erroring.
 */
const router = Router();

const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 10;
const attempts = new Map<string, { count: number; windowStartedAt: number }>();

function clientIp(req: Request): string {
  const fwd = req.headers['x-forwarded-for'];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim();
  return first || req.ip || 'unknown';
}

function enforceRateLimit(ip: string): void {
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record || now - record.windowStartedAt > WINDOW_MS) {
    attempts.set(ip, { count: 1, windowStartedAt: now });
    return;
  }
  if (record.count >= MAX_PER_WINDOW) {
    throw new AppError(429, 'Too many requests. Try again later.');
  }
  record.count += 1;
}

function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('0')) cleaned = '254' + cleaned.slice(1);
  if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
  return cleaned;
}

const requestSchema = z.object({
  phone: z.string().regex(/^(?:\+?254|0)\d{9}$/, 'Enter a Kenyan number, e.g. 0722400500'),
  role: z.enum(['WORKER', 'EMPLOYER']),
  name: z.string().trim().min(2).max(80),
  businessName: z.string().trim().max(120).optional(),
  area: z.string().trim().max(80).optional(),
});

router.post('/', async (req: Request, res: Response) => {
  enforceRateLimit(clientIp(req));
  const body = { ...req.body, phone: String(req.body?.phone ?? '').replace(/[\s\-()]/g, '') };
  const data = requestSchema.parse(body);
  if (data.role === 'EMPLOYER' && !data.businessName) {
    throw new AppError(422, 'Business name is required for employers');
  }

  const phone = normalizePhone(data.phone);
  const fields = {
    role: data.role,
    name: data.name,
    businessName: data.businessName || null,
    area: data.area || null,
  };
  await prisma.earlyAccessRequest.upsert({
    where: { phone },
    create: { phone, ...fields },
    update: fields,
  });

  res.status(201).json({ success: true, data: { received: true } });
});

// Public total for the landing page's trust strip — a count only, no rows.
router.get('/count', async (_req: Request, res: Response) => {
  const count = await prisma.earlyAccessRequest.count();
  res.json({ success: true, data: { count } });
});

router.get('/', authenticate, authorize('ADMIN'), async (_req: Request, res: Response) => {
  const rows = await prisma.earlyAccessRequest.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ success: true, data: rows });
});

export default router;
