import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { logAudit } from '../../utils/auditLogger';
import { identityRailClient } from '../rails';

// Klokd v3 — Identity Service (C2: revised S3-03)
// All National ID images, biometrics, and KYC documents flow to Identiti (AD-K02).
// Klokd retains only: account_uuid + kyc_tier + verificationStatus signal.

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
   * Submit National ID + selfie to Identiti.
   * Documents transit through Klokd API but are NEVER persisted in Klokd storage.
   * Klokd stores the verification reference returned by Identiti.
   */
  async submitIdVerification(
    workerId: string,
    tenantId: string,
    data: { idFrontBase64: string; idBackBase64: string; selfieBase64: string }
  ) {
    const worker = await prisma.worker.findUnique({
      where: { id: workerId },
      include: { user: true },
    });
    if (!worker) throw new AppError(404, 'Worker not found');
    if (!worker.accountUuid) {
      throw new AppError(422, 'Worker has no Identiti account; complete authentication first');
    }

    const response = await identityRailClient.submitKycDocuments({
      accountUuid: worker.accountUuid,
      idFront: data.idFrontBase64,
      idBack: data.idBackBase64,
      selfie: data.selfieBase64,
    });

    await prisma.worker.update({
      where: { id: workerId },
      data: { verificationStatus: 'PENDING' },
    });

    await logAudit({
      tenantId,
      actorId: worker.userId,
      action: 'identity.submitted',
      resource: 'worker',
      resourceId: workerId,
      metadata: { verificationId: response.verificationId },
    });

    return { verificationStatus: 'PENDING', verificationId: response.verificationId };
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
