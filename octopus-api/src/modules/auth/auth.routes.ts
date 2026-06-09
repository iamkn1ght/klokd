import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';
import { rateLimiter } from '../../middleware/rateLimiter';

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
  role: z.enum(['WORKER', 'EMPLOYER']),
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

router.post('/otp/verify', rateLimiter(3, 10), async (req: Request, res: Response) => {
  const { phone, challengeId, code, role } = verifyOtpSchema.parse(req.body);
  const result = await authService.verifyOtp(phone, challengeId, code, role);
  res.json({ success: true, data: result });
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
