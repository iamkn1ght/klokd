import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../config/database';
import { config } from '../../config';
import { supabase } from '../../config/supabase';
import { JwtPayload } from '../../types';
import { UserRole } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';
import { logAudit } from '../../utils/auditLogger';

export class AuthService {
  /**
   * Request OTP via Supabase Auth (sends SMS automatically).
   */
  async requestOtp(phone: string): Promise<{ message: string }> {
    // Normalize phone to E.164 format for Supabase
    const normalized = this.normalizePhone(phone);

    const { error } = await supabase.auth.signInWithOtp({
      phone: normalized,
    });

    if (error) {
      console.error('[Auth] Supabase OTP error:', error.message);

      // Fallback: if Supabase phone auth isn't configured, use dev mode
      if (config.nodeEnv === 'development' || error.message.includes('not enabled')) {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        // Store in a simple fallback for dev
        devOtpStore.set(normalized, { code, expiresAt: Date.now() + 5 * 60 * 1000 });
        console.log(`[DEV] OTP for ${normalized}: ${code}`);
        return { message: 'OTP sent successfully (dev mode)' };
      }

      throw new AppError(502, 'Failed to send OTP. Please try again.');
    }

    return { message: 'OTP sent successfully' };
  }

  /**
   * Verify OTP and return JWT tokens.
   * Tries Supabase first, falls back to dev store.
   */
  async verifyOtp(phone: string, code: string, role: UserRole): Promise<{
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
  }> {
    const normalized = this.normalizePhone(phone);
    let verified = false;

    // Try Supabase verification first
    const { error } = await supabase.auth.verifyOtp({
      phone: normalized,
      token: code,
      type: 'sms',
    });

    if (!error) {
      verified = true;
    } else {
      // Fallback: check dev OTP store
      const stored = devOtpStore.get(normalized);
      if (stored && stored.code === code && Date.now() < stored.expiresAt) {
        verified = true;
        devOtpStore.delete(normalized);
      }
    }

    if (!verified) {
      throw new AppError(400, 'Invalid or expired OTP');
    }

    // Find or create user in our database
    let user = await prisma.user.findUnique({ where: { phone: normalized } });
    let isNewUser = false;

    if (!user) {
      user = await prisma.user.create({
        data: {
          tenantId: config.defaultTenantId,
          phone: normalized,
          role,
        },
      });
      isNewUser = true;
    }

    // Issue our own JWT (not Supabase's)
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

  /**
   * Normalize Kenyan phone number to E.164 format (+254...).
   */
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
}

// Dev fallback OTP store (only used when Supabase phone auth isn't configured)
const devOtpStore = new Map<string, { code: string; expiresAt: number }>();

export const authService = new AuthService();
