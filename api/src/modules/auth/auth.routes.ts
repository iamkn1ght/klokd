import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authService } from './auth.service';
import { rateLimiter } from '../../middleware/rateLimiter';

const router = Router();

const requestOtpSchema = z.object({
  phone: z.string().regex(/^(?:254|\+254|0)\d{9}$/, 'Invalid Kenyan phone number'),
});

const verifyOtpSchema = z.object({
  phone: z.string(),
  code: z.string().length(6),
  role: z.enum(['WORKER', 'EMPLOYER']),
});

const refreshSchema = z.object({
  refreshToken: z.string().uuid(),
});

// Rate limit: 3 OTP requests per 10 minutes
router.post('/otp/request', rateLimiter(3, 10), async (req: Request, res: Response) => {
  const { phone } = requestOtpSchema.parse(req.body);
  const result = await authService.requestOtp(phone);
  res.json({ success: true, ...result });
});

router.post('/otp/verify', rateLimiter(3, 10), async (req: Request, res: Response) => {
  const { phone, code, role } = verifyOtpSchema.parse(req.body);
  const result = await authService.verifyOtp(phone, code, role);
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
