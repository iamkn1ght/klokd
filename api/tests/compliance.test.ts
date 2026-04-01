import { ComplianceService } from '../src/modules/compliance/compliance.service';

// Mock Prisma
jest.mock('../src/config/database', () => ({
  __esModule: true,
  default: {
    complianceConfig: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    employer: {
      findUnique: jest.fn(),
    },
    shift: {
      findMany: jest.fn(),
    },
    minimumWage: {
      findFirst: jest.fn(),
    },
  },
}));

import prisma from '../src/config/database';

describe('ComplianceService', () => {
  const service = new ComplianceService();
  const tenantId = 'test-tenant';

  describe('calculateDeductions', () => {
    it('should calculate deductions for a given gross amount', async () => {
      const result = await service.calculateDeductions(tenantId, 1800);

      expect(result.grossKes).toBe(1800);
      expect(result.netKes).toBeLessThan(result.grossKes);
      expect(result.netKes).toBeGreaterThan(0);
      expect(result.payeKes).toBeGreaterThanOrEqual(0);
      expect(result.nssfTier1Kes).toBeGreaterThanOrEqual(0);
      expect(result.shifKes).toBeGreaterThanOrEqual(0);
      expect(result.ahlKes).toBe(0); // AHL is off by default
    });

    it('should return zero AHL when toggle is off', async () => {
      const result = await service.calculateDeductions(tenantId, 5000);
      expect(result.ahlKes).toBe(0);
    });

    it('should handle zero gross amount', async () => {
      const result = await service.calculateDeductions(tenantId, 0);
      expect(result.grossKes).toBe(0);
      expect(result.netKes).toBe(0);
    });
  });

  describe('checkWiba', () => {
    it('should return not confirmed when employer has no WIBA policy', async () => {
      (prisma.employer.findUnique as jest.Mock).mockResolvedValue({
        id: 'emp-1',
        wibaPolicyRef: null,
      });

      const result = await service.checkWiba('emp-1', tenantId);
      expect(result.confirmed).toBe(false);
      expect(result.reason).toContain('not declared');
    });

    it('should return not confirmed when WIBA policy is expired', async () => {
      (prisma.employer.findUnique as jest.Mock).mockResolvedValue({
        id: 'emp-1',
        wibaPolicyRef: 'POL-123',
        wibaPolicyExpiry: new Date('2020-01-01'),
      });

      const result = await service.checkWiba('emp-1', tenantId);
      expect(result.confirmed).toBe(false);
      expect(result.reason).toContain('expired');
    });

    it('should return confirmed when WIBA policy is valid', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      (prisma.employer.findUnique as jest.Mock).mockResolvedValue({
        id: 'emp-1',
        wibaPolicyRef: 'POL-123',
        wibaPolicyExpiry: futureDate,
      });

      const result = await service.checkWiba('emp-1', tenantId);
      expect(result.confirmed).toBe(true);
    });
  });

  describe('checkSection37', () => {
    it('should return no warning when days are below threshold', async () => {
      (prisma.shift.findMany as jest.Mock).mockResolvedValue([
        { date: new Date() },
      ]);

      const result = await service.checkSection37('worker-1', 'employer-1', tenantId);
      expect(result.warning).toBe(false);
      expect(result.blocked).toBe(false);
    });

    it('should return warning at 20 days', async () => {
      const shifts = Array.from({ length: 20 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return { date };
      });
      (prisma.shift.findMany as jest.Mock).mockResolvedValue(shifts);

      const result = await service.checkSection37('worker-1', 'employer-1', tenantId);
      expect(result.warning).toBe(true);
      expect(result.acknowledgementRequired).toBe(false);
      expect(result.blocked).toBe(false);
    });

    it('should require acknowledgement at 25 days', async () => {
      const shifts = Array.from({ length: 25 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return { date };
      });
      (prisma.shift.findMany as jest.Mock).mockResolvedValue(shifts);

      const result = await service.checkSection37('worker-1', 'employer-1', tenantId);
      expect(result.warning).toBe(true);
      expect(result.acknowledgementRequired).toBe(true);
      expect(result.blocked).toBe(false);
    });

    it('should block at 30 days', async () => {
      const shifts = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return { date };
      });
      (prisma.shift.findMany as jest.Mock).mockResolvedValue(shifts);

      const result = await service.checkSection37('worker-1', 'employer-1', tenantId);
      expect(result.warning).toBe(true);
      expect(result.acknowledgementRequired).toBe(true);
      expect(result.blocked).toBe(true);
    });
  });

  describe('validateMinWage', () => {
    it('should return valid when rate is above minimum', async () => {
      (prisma.minimumWage.findFirst as jest.Mock).mockResolvedValue({
        rateKes: 1000,
        sector: 'hospitality',
        location: 'nairobi',
      });

      const result = await service.validateMinWage(tenantId, 'hospitality', 'nairobi', 1500);
      expect(result.valid).toBe(true);
    });

    it('should return invalid when rate is below minimum', async () => {
      (prisma.minimumWage.findFirst as jest.Mock).mockResolvedValue({
        rateKes: 1000,
        sector: 'hospitality',
        location: 'nairobi',
      });

      const result = await service.validateMinWage(tenantId, 'hospitality', 'nairobi', 500);
      expect(result.valid).toBe(false);
      expect(result.minimumWage).toBe(1000);
    });

    it('should allow when no minimum wage is configured', async () => {
      (prisma.minimumWage.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await service.validateMinWage(tenantId, 'unknown', 'unknown', 100);
      expect(result.valid).toBe(true);
    });
  });
});
