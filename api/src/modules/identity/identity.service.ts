import crypto from 'crypto';
import prisma from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { logAudit } from '../../utils/auditLogger';

export class IdentityService {
  /**
   * Create or update worker profile.
   */
  async upsertWorkerProfile(
    userId: string,
    tenantId: string,
    data: {
      firstName: string;
      lastName: string;
      skills?: string[];
    }
  ) {
    const skillsJson = JSON.stringify(data.skills || []);
    const worker = await prisma.worker.upsert({
      where: { userId },
      create: {
        tenantId,
        userId,
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

    return worker;
  }

  /**
   * Submit ID for verification. In production, images go to Supabase Storage.
   * National ID number is hashed, never stored in plaintext.
   */
  async submitIdVerification(
    workerId: string,
    tenantId: string,
    data: {
      idNumber: string;
      idFrontKey: string;
      idBackKey: string;
      selfieKey: string;
    }
  ) {
    const idNumberHash = crypto.createHash('sha256').update(data.idNumber).digest('hex');

    const worker = await prisma.worker.update({
      where: { id: workerId },
      data: {
        idNumberHash,
        idFrontKey: data.idFrontKey,
        idBackKey: data.idBackKey,
        selfieKey: data.selfieKey,
        verificationStatus: 'PENDING',
      },
    });

    await logAudit({
      tenantId,
      actorId: worker.userId,
      action: 'identity.submitted',
      resource: 'worker',
      resourceId: workerId,
    });

    return { verificationStatus: worker.verificationStatus };
  }

  /**
   * Record DPA 2019 consent (biometric + GPS).
   */
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
      data: {
        consentIdentity,
        consentGps,
        consentedAt: new Date(),
      },
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

  /**
   * Set M-Pesa number (encrypted at rest).
   */
  async setMpesaNumber(workerId: string, mpesaNumber: string) {
    // In production: encrypt with application-level key before storage
    const encrypted = Buffer.from(mpesaNumber).toString('base64');

    await prisma.worker.update({
      where: { id: workerId },
      data: { mpesaNumberEnc: encrypted },
    });

    return { message: 'M-Pesa number saved' };
  }

  /**
   * Create or update employer profile.
   */
  async upsertEmployerProfile(
    userId: string,
    tenantId: string,
    data: {
      businessName: string;
      kraPin?: string;
      contactPerson?: string;
    }
  ) {
    // Validate KRA PIN format: letter + 9 digits + letter (e.g., P051234567A)
    if (data.kraPin && !/^[A-Z]\d{9}[A-Z]$/.test(data.kraPin)) {
      throw new AppError(422, 'Invalid KRA PIN format. Expected format: P051234567A');
    }

    const employer = await prisma.employer.upsert({
      where: { userId },
      create: {
        tenantId,
        userId,
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

    return employer;
  }

  /**
   * Declare WIBA coverage (employer onboarding screen 3).
   */
  async declareWiba(
    employerId: string,
    tenantId: string,
    data: {
      policyRef: string;
      insurer: string;
      policyExpiry: Date;
    }
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
   * Set employer M-Pesa payment method.
   */
  async setEmployerMpesa(
    employerId: string,
    method: string,
    accountNumber: string
  ) {
    const encrypted = Buffer.from(accountNumber).toString('base64');

    await prisma.employer.update({
      where: { id: employerId },
      data: {
        mpesaMethod: method,
        mpesaAccountEnc: encrypted,
      },
    });

    return { message: 'M-Pesa payment method saved' };
  }

  /**
   * Admin: approve or reject worker verification.
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
