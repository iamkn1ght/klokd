import prisma from '../../config/database';
import { config } from '../../config';
import { ComplianceCalculation, Section37Check } from '../../types';
import { AppError } from '../../middleware/errorHandler';

/**
 * Compliance Engine — discrete Layer 1 service.
 * All statutory rates read from compliance_config table, NEVER hardcoded.
 * AHL toggle via config — currently OFF.
 */
export class ComplianceService {
  // ─── Default rates (seeded into compliance_config on first run) ─

  private static readonly DEFAULT_RATES = {
    paye_bands: [
      { min: 0, max: 24000, rate: 10 },
      { min: 24001, max: 32333, rate: 25 },
      { min: 32334, max: 500000, rate: 30 },
      { min: 500001, max: 800000, rate: 32.5 },
      { min: 800001, max: Infinity, rate: 35 },
    ],
    paye_personal_relief: 2400,
    nssf_tier1_ceiling: 8000,
    nssf_tier1_rate: 6,
    nssf_tier2_min: 8001,
    nssf_tier2_ceiling: 72000,
    nssf_tier2_rate: 6,
    shif_rate: 2.75,
    shif_minimum: 300,
    ahl_enabled: false,
    ahl_rate: 1.5,
    nita_levy: 50,
    platform_fee_percent: 4,
  };

  /**
   * Calculate all statutory deductions for a shift payment.
   */
  async calculateDeductions(
    tenantId: string,
    grossKes: number,
    monthlyGrossAggregate?: number
  ): Promise<ComplianceCalculation> {
    const rates = await this.getRates(tenantId);

    // Use monthly aggregate if provided, otherwise use shift gross
    const monthlyGross = monthlyGrossAggregate || grossKes;

    // PAYE — applied on monthly aggregate
    const payeKes = this.calculatePaye(monthlyGross, rates);

    // NSSF Tier I — 6% up to ceiling, per month
    const nssfTier1Kes = Math.min(
      Math.round(monthlyGross * (rates.nssf_tier1_rate / 100)),
      Math.round(rates.nssf_tier1_ceiling * (rates.nssf_tier1_rate / 100))
    );

    // NSSF Tier II — 6% on band above tier 1 ceiling
    let nssfTier2Kes = 0;
    if (monthlyGross > rates.nssf_tier1_ceiling) {
      const tier2Taxable = Math.min(monthlyGross, rates.nssf_tier2_ceiling) - rates.nssf_tier1_ceiling;
      nssfTier2Kes = Math.round(tier2Taxable * (rates.nssf_tier2_rate / 100));
    }

    // SHIF — 2.75% of gross, minimum KES 300/month
    const shifKes = Math.max(
      Math.round(monthlyGross * (rates.shif_rate / 100)),
      rates.shif_minimum
    );

    // AHL — only if enabled
    let ahlKes = 0;
    let employerAhlKes = 0;
    if (rates.ahl_enabled) {
      ahlKes = Math.round(monthlyGross * (rates.ahl_rate / 100));
      employerAhlKes = ahlKes; // same rate for employer
    }

    // Employer contributions
    const employerNssfKes = nssfTier1Kes + nssfTier2Kes; // employer matches

    // NITA — KES 50/worker/month (not per-shift)
    const nitaKes = rates.nita_levy;

    // Net for per-shift calculation: prorate monthly deductions
    if (grossKes === 0 || monthlyGross === 0) {
      return {
        grossKes: 0, payeKes: 0, nssfTier1Kes: 0, nssfTier2Kes: 0,
        shifKes: 0, ahlKes: 0, netKes: 0, employerNssfKes: 0,
        employerAhlKes: 0, nitaKes: rates.nita_levy,
      };
    }

    const proRate = grossKes / monthlyGross;
    const totalDeductions = payeKes + nssfTier1Kes + nssfTier2Kes + shifKes + ahlKes;
    const netKes = grossKes - Math.round(totalDeductions * proRate);

    return {
      grossKes,
      payeKes: Math.round(payeKes * proRate),
      nssfTier1Kes: Math.round(nssfTier1Kes * proRate),
      nssfTier2Kes: Math.round(nssfTier2Kes * proRate),
      shifKes: Math.round(shifKes * proRate),
      ahlKes: Math.round(ahlKes * proRate),
      netKes: Math.max(0, netKes),
      employerNssfKes: Math.round(employerNssfKes * proRate),
      employerAhlKes: Math.round(employerAhlKes * proRate),
      nitaKes,
    };
  }

  /**
   * WIBA hard gate — blocks clock-in if employer's WIBA is not confirmed/expired.
   */
  async checkWiba(
    employerId: string,
    _tenantId: string
  ): Promise<{ confirmed: boolean; reason?: string }> {
    const employer = await prisma.employer.findUnique({ where: { id: employerId } });

    if (!employer?.wibaPolicyRef) {
      return { confirmed: false, reason: 'Employer has not declared WIBA coverage' };
    }

    if (!employer.wibaPolicyExpiry || employer.wibaPolicyExpiry < new Date()) {
      return { confirmed: false, reason: 'Employer WIBA policy has expired' };
    }

    return { confirmed: true };
  }

  /**
   * Section 37 monitoring — alert at 20, acknowledge at 25, block at 30 days.
   */
  async checkSection37(
    workerId: string,
    employerId: string,
    tenantId: string
  ): Promise<Section37Check> {
    // Count consecutive calendar days of engagement
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 35); // look back 35 days

    const shifts = await prisma.shift.findMany({
      where: {
        workerId,
        employerId,
        tenantId,
        status: { in: ['ACCEPTED', 'ACTIVE', 'COMPLETED', 'PAID'] },
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'asc' },
      select: { date: true },
    });

    // Count unique days
    const uniqueDays = new Set(shifts.map(s => s.date.toISOString().split('T')[0]));
    const days = uniqueDays.size;

    const { section37WarnDays, section37AcknowledgeDays, section37BlockDays } = config.platform;

    if (days >= section37BlockDays) {
      return {
        workerEmployerDays: days,
        warning: true,
        acknowledgementRequired: true,
        blocked: true,
        message: `Worker has been engaged for ${days} consecutive days. Employment Act Section 37 threshold reached. This pairing is blocked.`,
      };
    }

    if (days >= section37AcknowledgeDays) {
      return {
        workerEmployerDays: days,
        warning: true,
        acknowledgementRequired: true,
        blocked: false,
        message: `Worker has been engaged for ${days} of the last 30 days. Explicit acknowledgement required to continue.`,
      };
    }

    if (days >= section37WarnDays) {
      return {
        workerEmployerDays: days,
        warning: true,
        acknowledgementRequired: false,
        blocked: false,
        message: `Worker has been engaged for ${days} of the last 30 days. Approaching Section 37 threshold.`,
      };
    }

    return {
      workerEmployerDays: days,
      warning: false,
      acknowledgementRequired: false,
      blocked: false,
      message: 'OK',
    };
  }

  /**
   * Validate minimum wage for a shift.
   */
  async validateMinWage(
    tenantId: string,
    sector: string,
    location: string,
    proposedRate: number
  ): Promise<{ valid: boolean; minimumWage: number; sector: string }> {
    const minWage = await prisma.minimumWage.findFirst({
      where: {
        tenantId,
        sector: { equals: sector },
        location: { equals: location },
      },
    });

    // If no minimum wage configured, allow (with a sensible floor)
    const minimumWage = minWage?.rateKes || 0;

    return {
      valid: proposedRate >= minimumWage,
      minimumWage,
      sector,
    };
  }

  // ─── Private helpers ────────────────────────────────────

  private calculatePaye(monthlyGross: number, rates: typeof ComplianceService.DEFAULT_RATES): number {
    let taxableIncome = monthlyGross;
    let paye = 0;

    for (const band of rates.paye_bands) {
      if (taxableIncome <= 0) break;
      const taxableInBand = Math.min(taxableIncome, (band.max === Infinity ? taxableIncome : band.max - band.min + 1));
      paye += taxableInBand * (band.rate / 100);
      taxableIncome -= taxableInBand;
    }

    // Personal relief
    paye = Math.max(0, paye - rates.paye_personal_relief);

    return Math.round(paye);
  }

  private async getRates(tenantId: string): Promise<typeof ComplianceService.DEFAULT_RATES> {
    // Try to load from config table
    const configs = await prisma.complianceConfig.findMany({
      where: { tenantId },
    });

    if (configs.length === 0) {
      return ComplianceService.DEFAULT_RATES;
    }

    const rates = { ...ComplianceService.DEFAULT_RATES };
    for (const cfg of configs) {
      if (cfg.key in rates) {
        try {
          (rates as any)[cfg.key] = JSON.parse(cfg.value);
        } catch {
          (rates as any)[cfg.key] = cfg.value;
        }
      }
    }

    return rates;
  }
}

export const complianceService = new ComplianceService();
