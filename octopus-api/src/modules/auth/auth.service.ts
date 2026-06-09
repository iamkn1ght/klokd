import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../config/database';
import { config } from '../../config';
import { JwtPayload } from '../../types';
import { UserRole } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';
import { logAudit } from '../../utils/auditLogger';
import { identityRailClient, commsRailClient, TODOKU_TEMPLATES } from '../rails';

// Klokd v3 — Auth Service (C1: revised S3-02)
// OTP flow routes through Identiti (account_uuid issuance) + Todoku (delivery).
// Klokd never holds phone numbers in logs or sends OTP via Africa's Talking directly.
//
// Phone is retained on the User row as a unique lookup key for the migration window.
// Long-term, all auth lookups will key on account_uuid only.

// In-memory OTP rate-limit window (3 attempts / 10 min per phone).
const otpAttempts = new Map<string, { count: number; windowStartedAt: number }>();
const OTP_WINDOW_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 3;

export class AuthService {
  /**
   * Request OTP: ensure Identiti account exists, then ask Todoku to deliver.
   * Klokd does not generate or hold the OTP value — Identiti+Todoku handle it.
   */
  async requestOtp(phone: string): Promise<{ message: string }> {
    const normalized = this.normalizePhone(phone);
    this.enforceOtpRateLimit(normalized);

    let user = await prisma.user.findUnique({ where: { phone: normalized } });

    let accountUuid = user?.accountUuid ?? null;

    if (!accountUuid) {
      const created = await identityRailClient.createAccount({ phone: normalized });
      accountUuid = created.accountUuid;

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { accountUuid },
        });
      }
    }

    await commsRailClient.sendOtp(accountUuid, TODOKU_TEMPLATES.OTP, {
      expiry_mins: '5',
    });

    return { message: 'OTP sent successfully' };
  }

  /**
   * Verify OTP via Identiti, then mint Klokd JWT.
   */
  async verifyOtp(
    phone: string,
    code: string,
    role: UserRole
  ): Promise<{ accessToken: string; refreshToken: string; isNewUser: boolean }> {
    const normalized = this.normalizePhone(phone);

    let user = await prisma.user.findUnique({ where: { phone: normalized } });
    const accountUuid = user?.accountUuid;

    if (!accountUuid) {
      throw new AppError(400, 'No OTP requested for this phone');
    }

    const result = await identityRailClient.verifyOtp({ accountUuid, otp: code });
    if (result.status !== 'active') {
      throw new AppError(400, 'Invalid or expired OTP');
    }

    let isNewUser = false;
    if (!user) {
      user = await prisma.user.create({
        data: {
          tenantId: config.defaultTenantId,
          phone: normalized,
          accountUuid,
          kycTier: result.kycTier,
          role,
        },
      });
      isNewUser = true;
    } else if (user.kycTier !== result.kycTier) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { kycTier: result.kycTier },
      });
    }

    otpAttempts.delete(normalized);

    const payload: JwtPayload = {
      userId: user.id,
      role: user.role,
      tenantId: user.tenantId,
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiry as jwt.SignOptions['expiresIn'],
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

    return { accessToken, refreshToken: refreshTokenValue, isNewUser };
  }

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
      expiresIn: config.jwt.expiry as jwt.SignOptions['expiresIn'],
    });

    return { accessToken };
  }

  async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  }

  private normalizePhone(phone: string): string {
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    if (cleaned.startsWith('0')) {
      cleaned = '254' + cleaned.slice(1);
    }
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    return cleaned;
  }

  private enforceOtpRateLimit(normalizedPhone: string): void {
    const now = Date.now();
    const record = otpAttempts.get(normalizedPhone);

    if (!record || now - record.windowStartedAt > OTP_WINDOW_MS) {
      otpAttempts.set(normalizedPhone, { count: 1, windowStartedAt: now });
      return;
    }

    if (record.count >= OTP_MAX_ATTEMPTS) {
      throw new AppError(429, 'Too many OTP requests. Try again in 10 minutes.');
    }

    record.count += 1;
  }
}

export const authService = new AuthService();
