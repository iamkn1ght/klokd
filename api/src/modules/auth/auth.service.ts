import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import prisma from '../../config/database';
import { config } from '../../config';
import { JwtPayload } from '../../types';
import { UserRole } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';
import { logAudit } from '../../utils/auditLogger';

// In-memory OTP store for MVP (replace with Redis in production)
const otpStore = new Map<string, { code: string; expiresAt: number; attempts: number }>();

export class AuthService {
  /**
   * Request OTP for phone number. Creates user if not exists.
   */
  async requestOtp(phone: string): Promise<{ message: string }> {
    // Rate limit check
    const existing = otpStore.get(phone);
    if (existing && existing.attempts >= config.otp.maxAttempts) {
      const windowEnd = existing.expiresAt + (config.otp.windowMinutes * 60 * 1000);
      if (Date.now() < windowEnd) {
        throw new AppError(429, 'Too many OTP requests. Please try again later.');
      }
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, {
      code,
      expiresAt: Date.now() + config.otp.expiryMinutes * 60 * 1000,
      attempts: 0,
    });

    // In production: send via Africa's Talking SMS API
    // For development, log the OTP
    if (config.nodeEnv === 'development') {
      console.log(`[DEV] OTP for ${phone}: ${code}`);
    }

    return { message: 'OTP sent successfully' };
  }

  /**
   * Verify OTP and return JWT tokens.
   */
  async verifyOtp(phone: string, code: string, role: UserRole): Promise<{
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
  }> {
    const stored = otpStore.get(phone);
    if (!stored) {
      throw new AppError(400, 'No OTP requested for this number');
    }

    if (Date.now() > stored.expiresAt) {
      otpStore.delete(phone);
      throw new AppError(400, 'OTP has expired. Please request a new one.');
    }

    stored.attempts++;
    if (stored.attempts > config.otp.maxAttempts) {
      otpStore.delete(phone);
      throw new AppError(429, 'Too many attempts. Please request a new OTP.');
    }

    if (stored.code !== code) {
      throw new AppError(400, 'Invalid OTP');
    }

    otpStore.delete(phone);

    // Find or create user
    let user = await prisma.user.findUnique({ where: { phone } });
    let isNewUser = false;

    if (!user) {
      user = await prisma.user.create({
        data: {
          tenantId: config.defaultTenantId,
          phone,
          role,
        },
      });
      isNewUser = true;
    }

    const payload: JwtPayload = {
      userId: user.id,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiry as any,
    });

    const refreshTokenValue = crypto.randomUUID();
    const refreshExpiresAt = new Date();
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt: refreshExpiresAt,
      },
    });

    await logAudit({
      tenantId: user.tenantId,
      actorId: user.id,
      action: isNewUser ? 'user.registered' : 'user.login',
      resource: 'user',
      resourceId: user.id,
    });

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      isNewUser,
    };
  }

  /**
   * Refresh access token using refresh token.
   */
  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!stored || stored.expiresAt < new Date()) {
      if (stored) {
        await prisma.refreshToken.delete({ where: { id: stored.id } });
      }
      throw new AppError(401, 'Invalid or expired refresh token');
    }

    const payload: JwtPayload = {
      userId: stored.user.id,
      role: stored.user.role,
      tenantId: stored.user.tenantId,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiry as any,
    });

    return { accessToken };
  }

  /**
   * Logout — invalidate refresh token.
   */
  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }
}

export const authService = new AuthService();
