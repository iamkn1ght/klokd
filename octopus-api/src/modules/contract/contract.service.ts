import prisma from '../../config/database';
import { config } from '../../config';
import { AppError } from '../../middleware/errorHandler';
import { complianceService } from '../compliance/compliance.service';

/**
 * Per-shift written particulars (Employment Act 2007, s.9 / s.10).
 *
 * Generated when the employer picks a worker (employer acceptance = the
 * selection itself) and accepted by the worker when they confirm the shift.
 * The rendered text is stored on the contract row and never edited, so what
 * both parties agreed to stays the record (7-year retention, D-14).
 */

const fmtDate = (d: Date) =>
  d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Nairobi' });
const fmtTime = (d: Date) =>
  d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Africa/Nairobi' });
const kes = (n: number) => `KES ${n.toLocaleString('en-KE')}`;

export class ContractService {
  async generate(shiftId: string) {
    const existing = await prisma.contract.findUnique({ where: { shiftId } });
    if (existing?.body) return existing;

    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { employer: true, worker: true },
    });
    if (!shift || !shift.worker) throw new AppError(404, 'Shift has no worker yet');

    const d = await complianceService.calculateDeductions(shift.tenantId, shift.rateKes);
    const hours = (shift.endTime.getTime() - shift.startTime.getTime()) / 3_600_000;
    const ref = `KLK-${shift.id.slice(0, 8).toUpperCase()}`;

    const body = [
      'WRITTEN PARTICULARS OF EMPLOYMENT — CASUAL SHIFT',
      `Reference: ${ref}`,
      'Issued under sections 9 and 10 of the Employment Act, 2007.',
      '',
      '1. PARTIES',
      `Employer: ${shift.employer.businessName}${shift.employer.kraPin ? ` (KRA PIN ${shift.employer.kraPin})` : ''}`,
      `Worker: ${shift.worker.firstName} ${shift.worker.lastName}`,
      'Arranged through Klokd, an online marketplace. Klokd is not the employer.',
      '',
      '2. JOB',
      `Role: ${shift.role}`,
      shift.description ? `Duties and instructions: ${shift.description}` : 'Duties: as normally performed in this role at the venue.',
      `Place of work: ${shift.locationName ?? 'Venue address shared in the Klokd app'}, Nairobi`,
      '',
      '3. DATE AND HOURS',
      `Date: ${fmtDate(shift.startTime)}`,
      `Hours: ${fmtTime(shift.startTime)} to ${fmtTime(shift.endTime)} (${+hours.toFixed(2)} hours, East Africa Time)`,
      'This is a single casual engagement. It ends when the shift ends and creates no promise of further work.',
      '',
      '4. PAY',
      `Pay for the shift: ${kes(shift.rateKes)}`,
      `Statutory deductions (estimate): PAYE ${kes(d.payeKes)}, NSSF ${kes(d.nssfTier1Kes + d.nssfTier2Kes)}, SHIF ${kes(d.shifKes)}, Housing Levy ${kes(d.ahlKes)}`,
      `Estimated take-home: ${kes(d.netKes)}`,
      `Paid to the worker’s M-Pesa through Klokd after the shift. The employer has ${config.platform.escrowAutoReleaseHours} hours after clock-out to report a problem; otherwise pay is approved automatically.`,
      'Hours are recorded by the worker checking in at the venue, the start PIN given by the employer, and clocking out in the Klokd app.',
      '',
      '5. WORK INJURY COVER',
      shift.employer.wibaPolicyRef
        ? `The employer holds Work Injury Benefits Act cover: ${shift.employer.wibaInsurer ?? 'insurer on file'}, policy ${shift.employer.wibaPolicyRef}${shift.employer.wibaPolicyExpiry ? `, valid to ${fmtDate(shift.employer.wibaPolicyExpiry)}` : ''}.`
        : 'The employer must hold Work Injury Benefits Act cover before the shift can start.',
      '',
      '6. CANCELLATION AND DISPUTES',
      'Either party may cancel before the shift starts through the Klokd app. A worker who does not arrive within 20 minutes of the start may be replaced.',
      'Disagreements about hours or conduct are raised in the Klokd app and reviewed by Klokd within 24 hours.',
      '',
      '7. ACCEPTANCE',
      `Employer acceptance: recorded when ${shift.employer.businessName} selected the worker.`,
      'Worker acceptance: recorded when the worker confirms the shift in the Klokd app.',
    ].join('\n');

    const retainUntil = new Date();
    retainUntil.setFullYear(retainUntil.getFullYear() + config.platform.dataRetentionYears);

    return prisma.contract.upsert({
      where: { shiftId },
      create: {
        tenantId: shift.tenantId,
        shiftId,
        documentKey: `inline:${ref}`,
        body,
        employerAcceptedAt: new Date(),
        retainUntil,
      },
      update: { body, documentKey: `inline:${ref}`, employerAcceptedAt: existing?.employerAcceptedAt ?? new Date() },
    });
  }

  async workerAccept(shiftId: string) {
    const contract = (await prisma.contract.findUnique({ where: { shiftId } })) ?? (await this.generate(shiftId));
    if (contract.workerAcceptedAt) return contract;
    return prisma.contract.update({ where: { id: contract.id }, data: { workerAcceptedAt: new Date() } });
  }

  /** Only the two parties to the shift (or staff) may read it. */
  async getForUser(shiftId: string, user: { userId: string; role: string }) {
    const shift = await prisma.shift.findUnique({
      where: { id: shiftId },
      include: { worker: { select: { userId: true } }, employer: { select: { userId: true } } },
    });
    const allowed =
      user.role === 'ADMIN' || shift?.worker?.userId === user.userId || shift?.employer.userId === user.userId;
    if (!shift || !allowed) throw new AppError(404, 'Contract not found');
    if (!shift.workerId) throw new AppError(404, 'No contract until a worker is picked');
    const contract = (await prisma.contract.findUnique({ where: { shiftId } })) ?? (await this.generate(shiftId));
    return {
      body: contract.body,
      employerAcceptedAt: contract.employerAcceptedAt,
      workerAcceptedAt: contract.workerAcceptedAt,
      createdAt: contract.createdAt,
    };
  }
}

export const contractService = new ContractService();
