import prisma from '../../config/database';

/**
 * Monthly Reconciliation Service.
 * Generates employer and platform summaries for PAYE/NSSF/SHIF remittance.
 */
export class ReconciliationService {
  /**
   * Generate monthly reconciliation for a tenant.
   */
  async generateMonthlyReport(tenantId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const payments = await prisma.payment.findMany({
      where: {
        tenantId,
        status: 'COMPLETED',
        paidAt: { gte: startDate, lte: endDate },
      },
      include: {
        shift: {
          select: {
            employerId: true,
            role: true,
            employer: { select: { businessName: true, kraPin: true } },
          },
        },
        worker: { select: { firstName: true, lastName: true } },
      },
    });

    // Aggregate by employer
    const byEmployer = new Map<string, {
      businessName: string;
      kraPin: string | null;
      shiftCount: number;
      grossKes: number;
      payeKes: number;
      nssfKes: number;
      shifKes: number;
      ahlKes: number;
      platformFeeKes: number;
      netKes: number;
    }>();

    for (const p of payments) {
      const eid = p.shift.employerId;
      const existing = byEmployer.get(eid) || {
        businessName: p.shift.employer.businessName,
        kraPin: p.shift.employer.kraPin,
        shiftCount: 0,
        grossKes: 0,
        payeKes: 0,
        nssfKes: 0,
        shifKes: 0,
        ahlKes: 0,
        platformFeeKes: 0,
        netKes: 0,
      };

      existing.shiftCount++;
      existing.grossKes += p.grossKes;
      existing.payeKes += p.payeKes;
      existing.nssfKes += p.nssfTier1Kes + p.nssfTier2Kes;
      existing.shifKes += p.shifKes;
      existing.ahlKes += p.ahlKes;
      existing.platformFeeKes += p.platformFeeKes;
      existing.netKes += p.netKes;

      byEmployer.set(eid, existing);
    }

    // Platform totals
    const platformTotals = {
      totalShifts: payments.length,
      totalGrossKes: 0,
      totalPayeKes: 0,
      totalNssfKes: 0,
      totalShifKes: 0,
      totalAhlKes: 0,
      totalPlatformFeeKes: 0,
      totalNetKes: 0,
    };

    for (const emp of byEmployer.values()) {
      platformTotals.totalGrossKes += emp.grossKes;
      platformTotals.totalPayeKes += emp.payeKes;
      platformTotals.totalNssfKes += emp.nssfKes;
      platformTotals.totalShifKes += emp.shifKes;
      platformTotals.totalAhlKes += emp.ahlKes;
      platformTotals.totalPlatformFeeKes += emp.platformFeeKes;
      platformTotals.totalNetKes += emp.netKes;
    }

    // Failed/pending payments
    const failedPayments = await prisma.payment.findMany({
      where: {
        tenantId,
        status: { in: ['FAILED', 'RETRYING'] },
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { id: true, shiftId: true, grossKes: true, netKes: true, status: true, retryCount: true },
    });

    return {
      period: `${year}-${String(month).padStart(2, '0')}`,
      generatedAt: new Date().toISOString(),
      employers: Array.from(byEmployer.entries()).map(([id, data]) => ({ employerId: id, ...data })),
      platformTotals,
      remittanceSummary: {
        payeToKra: platformTotals.totalPayeKes,
        nssfToNssf: platformTotals.totalNssfKes,
        shifToShif: platformTotals.totalShifKes,
        ahlToAhl: platformTotals.totalAhlKes,
      },
      failedPayments,
    };
  }
}

export const reconciliationService = new ReconciliationService();
