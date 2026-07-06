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
// FIRST-LOGIN OTP: Klokd-side dispatch via Todoku.
// Identiti's /v1/stepup/challenges requires customer.state == active, but new
// customers are created pending_onboarding. The rail has no first-OTP path
// today (escalation pending with Silvia). For now Klokd generates a 6-digit
// OTP, persists in-memory with 5-min TTL, and sends via Todoku using the
// klokd_otp_sms template + phone_token from Identiti. Cardinal rule holds —
// phone never crosses Klokd's boundary; phone_token does the resolve.
//
// HIGH-VALUE PAYOUT step-up still uses Identiti's stepup endpoints — those
// run on already-active customers and the operation_kind enum permits
// kipkiren_pay.* + app.custom_high_risk for app-defined kinds.

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

interface PendingOtp {
  accountUuid: IdentitiAccountUuid;
  code: string;
  expiresAt: number;
}

// challenge_id → pending OTP. Cleared on verify or expiry.
const pendingOtps = new Map<string, PendingOtp>();
const OTP_TTL_MS = 5 * 60 * 1000;

function generateOtp(): string {
  return String(crypto.randomInt(100_000, 1_000_000));
}

interface RequestOtpResult {
  challengeId: string;
  message: string;
  /** Echoed in dev mode for testing convenience. Stripped in production. */
  sandboxOtp?: string;
}

export class AuthService {
  /**
   * Request OTP. New phones require profile (Identiti customer-create
   * needs nameFirst + nameLast + consent up front). Returns a challenge_id
   * that must be passed back to verifyOtp.
   */
  async requestOtp(phone: string, profile?: RequestOtpProfile): Promise<RequestOtpResult> {
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
      let created: { accountUuid: IdentitiAccountUuid; tier: IdentitiTier };
      try {
        created = await identityRailClient.createCustomer({
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
      } catch (err) {
        // Sandbox-only: keep auth testable while the Identiti rail is down.
        // Placeholder accounts are tier_0 and clearly marked acc_local_*;
        // they can never pass KYC or receive payouts.
        if (!config.railFallbackLocal) throw err;
        console.warn(
          '[AUTH] Identiti createCustomer failed — RAIL_FALLBACK_LOCAL minting placeholder:',
          (err as Error).message
        );
        created = {
          accountUuid: `acc_local_${crypto.randomUUID()}` as IdentitiAccountUuid,
          tier: 'tier_0' as IdentitiTier,
        };
      }
      accountUuid = created.accountUuid;

      // Persist immediately so retries skip createCustomer.
      if (user) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            accountUuid: created.accountUuid,
            kycTier: HEX_TIER_TO_INT[created.tier],
          },
        });
      } else {
        user = await prisma.user.create({
          data: {
            tenantId: config.defaultTenantId,
            phone: normalized,
            accountUuid: created.accountUuid,
            kycTier: HEX_TIER_TO_INT[created.tier],
            role: 'WORKER',
            isActive: false,
          },
        });
      }
    }

    // Klokd-side OTP — generated here, sent via Todoku, verified locally.
    const code = generateOtp();
    const challengeId = `klokd_${crypto.randomUUID()}`;
    pendingOtps.set(challengeId, {
      accountUuid,
      code,
      expiresAt: Date.now() + OTP_TTL_MS,
    });

    // Send via Todoku. In sandbox the phone token is rejected (cross-rail gap),
    // so the OTP delivery throws — we catch + log + still return the challenge.
    try {
      await commsRailClient.sendNotification(
        accountUuid,
        TODOKU_TEMPLATES.OTP_SMS,
        'sms',
        { otp_code: code, expiry_mins: '5' }
      );
    } catch (err) {
      console.warn('[AUTH] Todoku OTP delivery failed (will use sandbox echo):', (err as Error).message);
    }

    if (config.nodeEnv !== 'production') {
      console.log(`[DEV] OTP for ${normalized}: ${code} (challenge ${challengeId})`);
    }

    return {
      challengeId,
      message: 'OTP sent',
      sandboxOtp: config.nodeEnv !== 'production' ? code : undefined,
    };
  }

  async verifyOtp(
    phone: string,
    challengeId: string,
    code: string,
    role: UserRole
  ): Promise<{ accessToken: string; refreshToken: string; isNewUser: boolean }> {
    const normalized = this.normalizePhone(phone);

    let user = await prisma.user.findUnique({ where: { phone: normalized } });
    if (!user?.accountUuid) {
      throw new AppError(400, 'No OTP requested for this phone');
    }

    const pending = pendingOtps.get(challengeId);
    if (!pending) throw new AppError(400, 'Invalid or expired challenge');
    if (Date.now() > pending.expiresAt) {
      pendingOtps.delete(challengeId);
      throw new AppError(400, 'OTP expired. Request a new one.');
    }
    if (pending.accountUuid !== user.accountUuid) {
      throw new AppError(400, 'Challenge does not match account');
    }
    if (pending.code !== code) throw new AppError(400, 'Invalid OTP');

    pendingOtps.delete(challengeId);
    otpAttempts.delete(normalized);

    // First successful verify activates the user.
    const justActivated = !user.isActive;
    if (justActivated || user.role !== role) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { isActive: true, role },
      });
    }

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
      action: justActivated ? 'user.registered' : 'user.login',
      resource: 'user',
      resourceId: user.id,
    });

    return { accessToken, refreshToken: refreshTokenValue, isNewUser: justActivated };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    const stored = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
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
    if (cleaned.startsWith('0')) cleaned = '254' + cleaned.slice(1);
    if (!cleaned.startsWith('+')) cleaned = '+' + cleaned;
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
