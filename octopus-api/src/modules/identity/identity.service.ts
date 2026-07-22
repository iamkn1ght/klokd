import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { logAudit } from '../../utils/auditLogger';
import { identityRailClient } from '../rails';

// Klokd v3 — Identity Service (C2: revised S3-03)
// All National ID images, biometrics, and KYC documents flow to Identiti (AD-K02).
// Klokd retains only: account_uuid + kyc_tier + verificationStatus signal.

/** Identiti returns tier as a slug; Klokd persists kyc_tier as an Int. */
const TIER_TO_INT: Record<string, number> = {
  tier_0: 0,
  tier_1: 1,
  tier_2: 2,
  tier_3: 3,
};

export class IdentityService {
  async upsertWorkerProfile(
    userId: string,
    tenantId: string,
    data: { firstName: string; lastName: string; skills?: string[] }
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found');

    const skillsJson = JSON.stringify(data.skills || []);
    return prisma.worker.upsert({
      where: { userId },
      create: {
        tenantId,
        userId,
        accountUuid: user.accountUuid,
        kycTier: user.kycTier,
        firstName: data.firstName,
        lastName: data.lastName,
        skills: skillsJson,
      },
      update: {
        firstName: data.firstName,
        lastName: data.lastName,
        skills: skillsJson,
      },
    });
  }

  /**
   * Submit National ID details for IPRS verification via Identiti.
   *
   * Identiti KYC is an IPRS data lookup against the national register, NOT an
   * image upload — inputs are national_id + name_first + name_last +
   * date_of_birth. No document image ever reaches Klokd (AD-K02); we persist
   * only the resulting tier + verification signal.
   *
   * Rail side-effects on full_match: tier_0 -> tier_1, emits KYC_APPROVED +
   * TIER_CHANGED. Verification does NOT activate the account — activation is a
   * separate Identiti endpoint and the two are independent.
   *
   * Wire contract verified against Identiti 0.1.2 (22 Jul 2026).
   */
  async submitIdVerification(
    workerId: string,
    tenantId: string,
    data: { nationalId: string; nameFirst: string; nameLast: string; dateOfBirth: string }
  ): Promise<{ state: string; tier: number | null; alreadyVerified: boolean }> {
    const worker = await prisma.worker.findUnique({ where: { id: workerId } });
    if (!worker) throw new AppError(404, 'Worker profile not found');

    const accountUuid = worker.accountUuid;
    if (!accountUuid) {
      throw new AppError(409, 'Worker has no Identiti account_uuid — complete sign-in first');
    }

    try {
      const res = await identityRailClient.submitIprsKyc(accountUuid as `acc_${string}`, {
        nationalId: data.nationalId,
        nameFirst: data.nameFirst,
        nameLast: data.nameLast,
        dateOfBirth: data.dateOfBirth,
      });

      const tierInt = res.tierPromotedTo ? TIER_TO_INT[res.tierPromotedTo] : null;
      const verified = res.state === 'verified';

      // Persist only the signal — never the National ID itself (AD-K02).
      if (verified || tierInt !== null) {
        await prisma.$transaction([
          prisma.worker.update({
            where: { id: worker.id },
            data: {
              ...(tierInt !== null ? { kycTier: tierInt } : {}),
              ...(verified ? { verificationStatus: 'APPROVED' as const } : {}),
            },
          }),
          ...(tierInt !== null
            ? [prisma.user.update({ where: { id: worker.userId }, data: { kycTier: tierInt } })]
            : []),
        ]);
      }

      await logAudit({
        tenantId,
        actorId: worker.userId,
        action: 'identity.kyc.iprs_submitted',
        resource: 'worker',
        resourceId: worker.id,
        metadata: {
          artefactId: res.artefactId,
          state: res.state,
          match: res.iprsSummary?.match,
          tierPromotedTo: res.tierPromotedTo ?? null,
        },
      });

      return { state: res.state, tier: tierInt, alreadyVerified: false };
    } catch (err) {
      const e = err as AppError;
      switch (e.railCode) {
        // Already submitted is a success from the worker's point of view.
        case 'kyc_artefact_already_submitted':
          await prisma.worker.update({
            where: { id: worker.id },
            data: { verificationStatus: 'APPROVED' as const },
          });
          return { state: 'verified', tier: null, alreadyVerified: true };
        case 'kyc_iprs_document_mismatch':
          throw new AppError(400, 'Those details do not match the national register. Check your names and date of birth.');
        case 'kyc_iprs_no_match':
          throw new AppError(400, 'We could not verify that National ID. Check the number and try again.');
        case 'upstream_iprs_unavailable':
          throw new AppError(503, 'ID verification is temporarily unavailable. Please try again shortly.');
        case 'customer_not_found':
          throw new AppError(409, 'Identiti account not found for this worker.');
        default:
          throw err;
      }
    }
  }

  async recordConsent(
    workerId: string,
    tenantId: string,
    consentIdentity: boolean,
    consentGps: boolean
  ) {
    if (!consentIdentity || !consentGps) {
      throw new AppError(422, 'Both identity and GPS consent are required to proceed');
    }

    const worker = await prisma.worker.update({
      where: { id: workerId },
      data: { consentIdentity, consentGps, consentedAt: new Date() },
    });

    await logAudit({
      tenantId,
      actorId: worker.userId,
      action: 'consent.recorded',
      resource: 'worker',
      resourceId: workerId,
      metadata: { consentIdentity, consentGps },
    });

    return { consentIdentity: worker.consentIdentity, consentGps: worker.consentGps };
  }

  async upsertEmployerProfile(
    userId: string,
    tenantId: string,
    data: { businessName: string; kraPin?: string; contactPerson?: string }
  ) {
    if (data.kraPin && !/^[A-Z]\d{9}[A-Z]$/.test(data.kraPin)) {
      throw new AppError(422, 'Invalid KRA PIN format. Expected format: P051234567A');
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError(404, 'User not found');

    return prisma.employer.upsert({
      where: { userId },
      create: {
        tenantId,
        userId,
        accountUuid: user.accountUuid,
        kycTier: user.kycTier,
        businessName: data.businessName,
        kraPin: data.kraPin,
        contactPerson: data.contactPerson,
      },
      update: {
        businessName: data.businessName,
        kraPin: data.kraPin,
        contactPerson: data.contactPerson,
      },
    });
  }

  async declareWiba(
    employerId: string,
    tenantId: string,
    data: { policyRef: string; insurer: string; policyExpiry: Date }
  ) {
    if (new Date(data.policyExpiry) < new Date()) {
      throw new AppError(422, 'WIBA policy has expired. Please provide a valid policy.');
    }

    const employer = await prisma.employer.update({
      where: { id: employerId },
      data: {
        wibaPolicyRef: data.policyRef,
        wibaInsurer: data.insurer,
        wibaPolicyExpiry: data.policyExpiry,
      },
    });

    await logAudit({
      tenantId,
      actorId: employer.userId,
      action: 'wiba.declared',
      resource: 'employer',
      resourceId: employerId,
      metadata: { insurer: data.insurer, expiry: data.policyExpiry },
    });

    return { wibaStatus: 'confirmed', expiresAt: data.policyExpiry };
  }

  /**
   * Admin: approve or reject verification.
   * In v3 this is a no-op locally; the source of truth is Identiti's KYC tier.
   * Retained as an admin override hook only.
   */
  async updateVerificationStatus(
    workerId: string,
    tenantId: string,
    status: 'APPROVED' | 'REJECTED',
    adminId: string
  ) {
    const worker = await prisma.worker.update({
      where: { id: workerId },
      data: { verificationStatus: status },
    });

    await logAudit({
      tenantId,
      actorId: adminId,
      action: `identity.${status.toLowerCase()}`,
      resource: 'worker',
      resourceId: workerId,
    });

    return { verificationStatus: worker.verificationStatus };
  }
}

export const identityService = new IdentityService();
