import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../../config/database';
import { config } from '../../config';
import { JwtPayload } from '../../types';
import { UserRole } from '@prisma/client';
import { AppError } from '../../middleware/errorHandler';
import { logAudit } from '../../utils/auditLogger';
import { identityRailClient, commsRailClient, TODOKU_TEMPLATES } from '../rails';
import type { IdentitiAccountUuid, IdentitiTier } from '../rails/identiti.dto';

// Klokd v3 — Auth Service (C1: revised S3-02)
//
// IMPORTANT FLOW CHANGE FROM v1:
// Identiti requires name_first + name_last + consent AT customer creation time.
// Klokd's current mobile UX captures these AFTER OTP verify. The v3-aligned
// flow needs Klokd's WelcomeScreen to collect name + consent before requestOtp,
// OR call PATCH /v1/customers/<uuid> at profile-setup time.
//
// This turn: requestOtp accepts an optional name+consent block. When omitted,
// the call throws so the mobile apps fail loudly and the UX gets rearranged.

const HEX_TIER_TO_INT: Record<IdentitiTier, number> = {
  tier_0: 0,
  tier_1: 1,
  tier_2: 2,
  tier_3: 3,
};

const otpAttempts = new Map<string, { count: number; windowStartedAt: number }>();
const OTP_WINDOW_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 3;

interface RequestOtpProfile {
  nameFirst: string;
  nameLast: string;
  dpaConsent: boolean;
  kycConsent: boolean;
  marketingConsent?: boolean;
}

export class AuthService {
  /**
   * Request OTP. If the user has no Identiti account yet, profile is required
   * (Identiti rail mandates name_first + name_last + consent at create time).
   * Returns the step-up challenge_id; mobile app submits OTP to verifyOtp().
   */
  async requestOtp(
    phone: string,
    profile?: RequestOtpProfile
  ): Promise<{ challengeId: string; message: string }> {
    const normalized = this.normalizePhone(phone);
    this.enforceOtpRateLimit(normalized);

    let user = await prisma.user.findUnique({ where: { phone: normalized } });
    let accountUuid = user?.accountUuid as IdentitiAccountUuid | null | undefined;

    if (!accountUuid) {
      if (!profile) {
        throw new AppError(
          422,
          'Profile required for new account: nameFirst, nameLast, dpaConsent, kycConsent'
        );
      }
      const created = await identityRailClient.createCustomer({
        phone: normalized,
        nameFirst: profile.nameFirst,
        nameLast: profile.nameLast,
        appCorrelation: `klokd_phone_${normalized}`,
        consent: {
          dpa_consent: profile.dpaConsent,
          kyc_consent: profile.kycConsent,
          marketing_consent: profile.marketingConsent ?? false,
          captured_at: new Date().toISOString(),
          captured_via: 'app_onboarding',
        },
      });
      accountUuid = created.accountUuid;

      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            accountUuid: created.accountUuid,
            kycTier: HEX_TIER_TO_INT[created.tier],
          },
        });
      }
    }

    const challenge = await identityRailClient.createStepUpChallenge({
      accountUuid,
      operationAudience: 'https://api.klokd.co.ke',
      operationKind: 'klokd.login',
      operationRiskTier: 'low',
      factor: 'phone_otp',
    });

    // Sandbox: if OTP is echoed back, log it server-side for dev convenience.
    if (challenge.sandboxOnly && challenge.otpPlaintext && config.nodeEnv !== 'production') {
      console.log(`[DEV] OTP for ${normalized}: ${challenge.otpPlaintext} (challenge ${challenge.challengeId})`);
    }

    // Identiti's createStepUpChallenge already dispatches the OTP through
    // Todoku internally (see SandboxIdentitiClient resolver). Klokd does NOT
    // need to call Todoku again for login OTP — would result in a duplicate
    // SMS. In sandbox, the OTP is also echoed in challenge.otpPlaintext above.
    void commsRailClient;
    void TODOKU_TEMPLATES;

    return { challengeId: challenge.challengeId, message: 'OTP sent' };
  }

  /**
   * Verify OTP by submitting it to the step-up challenge.
   * Returns Klokd-issued JWT + refresh token.
   */
  async verifyOtp(
    phone: string,
    challengeId: string,
    otp: string,
    role: UserRole
  ): Promise<{ accessToken: string; refreshToken: string; isNewUser: boolean }> {
    const normalized = this.normalizePhone(phone);

    let user = await prisma.user.findUnique({ where: { phone: normalized } });
    const accountUuid = user?.accountUuid as IdentitiAccountUuid | null | undefined;

    if (!accountUuid) {
      throw new AppError(400, 'No OTP requested for this phone');
    }

    await identityRailClient.verifyStepUpChallenge({ challengeId, response: otp });

    // After successful step-up, fetch current tier (Identiti webhook may not yet have fired).
    const tierResp = await identityRailClient.getTier(accountUuid);
    const kycTier = HEX_TIER_TO_INT[tierResp.tier];

    let isNewUser = false;
    if (!user) {
      user = await prisma.user.create({
        data: {
          tenantId: config.defaultTenantId,
          phone: normalized,
          accountUuid,
          kycTier,
          role,
        },
      });
      isNewUser = true;
    } else if (user.kycTier !== kycTier) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { kycTier },
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
    let cleaned = phone.replace(/[\s\-()]/g, '');
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
