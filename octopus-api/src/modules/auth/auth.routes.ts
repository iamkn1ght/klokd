import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';
import { authenticate } from '../../middleware/auth';
import { rateLimiter } from '../../middleware/rateLimiter';
import prisma from '../../config/database';

const router = Router();

// Per v3 contract: Identiti requires name + consent at customer creation.
// Klokd worker/employer app must send these on first requestOtp for a new phone.
const requestOtpSchema = z.object({
  phone: z.string().regex(/^(?:254|\+254|0)\d{9}$/, 'Invalid Kenyan phone number'),
  profile: z
    .object({
      nameFirst: z.string().min(1),
      nameLast: z.string().min(1),
      dpaConsent: z.literal(true),
      kycConsent: z.literal(true),
      marketingConsent: z.boolean().optional(),
    })
    .optional(),
});

const verifyOtpSchema = z.object({
  phone: z.string(),
  challengeId: z.string().min(1),
  code: z.string().length(6),
  role: z.enum(['WORKER', 'EMPLOYER', 'ADMIN']),
});

const staffLoginSchema = z.object({
  phone: z.string().regex(/^(?:254|\+254|0)\d{9}$/, 'Invalid Kenyan phone number'),
  accessKey: z.string().min(1).max(200),
});

const refreshSchema = z.object({
  refreshToken: z.string().uuid(),
});

// Rate limit: 3 OTP requests per 10 minutes
router.post('/otp/request', rateLimiter(3, 10), async (req: Request, res: Response) => {
  const { phone, profile } = requestOtpSchema.parse(req.body);
  const result = await authService.requestOtp(phone, profile);
  res.json({ success: true, ...result });
});

// Staff sign-in (no SMS): listed phone + access key. Tight rate limit.
router.post('/staff/login', rateLimiter(5, 15), async (req: Request, res: Response) => {
  const { phone, accessKey } = staffLoginSchema.parse(req.body);
  const result = await authService.staffLogin(phone, accessKey);
  res.json({ success: true, data: result });
});

router.post('/otp/verify', rateLimiter(3, 10), async (req: Request, res: Response) => {
  const { phone, challengeId, code, role } = verifyOtpSchema.parse(req.body);
  const result = await authService.verifyOtp(phone, challengeId, code, role);
  res.json({ success: true, data: result });
});

// Session probe + profile: the cheapest authenticated GET. Returns the
// authoritative role plus a display name (worker first/last or employer
// business name) so clients can show real identity, not phone-derived ones.
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      phone: true,
      role: true,
      kycTier: true,
      isActive: true,
      worker: { select: { firstName: true, lastName: true, verificationStatus: true } },
      employer: { select: { businessName: true } },
    },
  });
  if (!user || !user.isActive) {
    res.status(401).json({ success: false, error: 'Session invalid' });
    return;
  }
  const profileName = user.worker
    ? `${user.worker.firstName} ${user.worker.lastName}`.trim()
    : user.employer?.businessName ?? null;
  res.json({
    success: true,
    data: {
      id: user.id,
      phone: user.phone,
      role: user.role,
      kycTier: user.kycTier,
      profileName,
      verificationStatus: user.worker?.verificationStatus ?? null,
    },
  });
});

router.post('/refresh', async (req: Request, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  const result = await authService.refreshAccessToken(refreshToken);
  res.json({ success: true, data: result });
});

router.post('/logout', async (req: Request, res: Response) => {
  const { refreshToken } = refreshSchema.parse(req.body);
  await authService.logout(refreshToken);
  res.json({ success: true, message: 'Logged out' });
});

export default router;
