import { DarajaService } from '../src/modules/payment/daraja.service';
import { ReconciliationService } from '../src/modules/payment/reconciliation.service';

// Mock Supabase
jest.mock('../src/config/supabase', () => ({
  supabase: { auth: { signInWithOtp: jest.fn(), verifyOtp: jest.fn() } },
}));

// Mock Prisma
jest.mock('../src/config/database', () => ({
  __esModule: true,
  default: {
    payment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    escrow: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    shift: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    shiftEvent: { create: jest.fn() },
    worker: { findUnique: jest.fn(), update: jest.fn() },
    employer: { findUnique: jest.fn(), update: jest.fn() },
    dispute: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
    complianceConfig: { findMany: jest.fn().mockResolvedValue([]) },
    minimumWage: { findFirst: jest.fn() },
  },
}));

import prisma from '../src/config/database';

describe('DarajaService (sandbox)', () => {
  const service = new DarajaService();

  it('should return STK Push refs', async () => {
    const result = await service.stkPush({
      phoneNumber: '254722400500',
      amountKes: 1800,
      accountRef: 'SHIFT-001',
      description: 'Escrow funding',
      callbackUrl: 'https://api.klokd.co.ke/callback',
    });
    expect(result.checkoutRequestId).toBeTruthy();
    expect(typeof result.checkoutRequestId).toBe('string');
    expect(result.merchantRequestId).toBeTruthy();
  });

  it.skip('should return B2C refs (requires security credential)', async () => {
    const result = await service.b2cPayment({
      phoneNumber: '254722400500',
      amountKes: 1642,
      remarks: 'Shift payment',
      occasion: 'SHIFT-001',
      resultUrl: 'https://api.klokd.co.ke/callback/b2c',
      timeoutUrl: 'https://api.klokd.co.ke/callback/timeout',
    });
    expect(result.conversationId).toBeTruthy();
    expect(typeof result.conversationId).toBe('string');
  });
});

describe('ReconciliationService', () => {
  const service = new ReconciliationService();

  it('should generate empty report when no payments', async () => {
    (prisma.payment.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.generateMonthlyReport('test-tenant', 2026, 3);

    expect(result.period).toBe('2026-03');
    expect(result.employers).toHaveLength(0);
    expect(result.platformTotals.totalShifts).toBe(0);
    expect(result.platformTotals.totalGrossKes).toBe(0);
  });

  it('should aggregate payments by employer', async () => {
    (prisma.payment.findMany as jest.Mock)
      .mockResolvedValueOnce([
        {
          grossKes: 1800, payeKes: 0, nssfTier1Kes: 108, nssfTier2Kes: 0,
          shifKes: 50, ahlKes: 0, platformFeeKes: 72, netKes: 1642,
          status: 'COMPLETED',
          shift: {
            employerId: 'emp-1',
            role: 'Waiter',
            employer: { businessName: 'Brew Bistro', kraPin: 'P051234567A' },
          },
          worker: { firstName: 'Akinyi', lastName: 'K' },
        },
        {
          grossKes: 1500, payeKes: 0, nssfTier1Kes: 90, nssfTier2Kes: 0,
          shifKes: 41, ahlKes: 0, platformFeeKes: 60, netKes: 1369,
          status: 'COMPLETED',
          shift: {
            employerId: 'emp-1',
            role: 'Barista',
            employer: { businessName: 'Brew Bistro', kraPin: 'P051234567A' },
          },
          worker: { firstName: 'James', lastName: 'M' },
        },
      ])
      .mockResolvedValueOnce([]); // failed payments query

    const result = await service.generateMonthlyReport('test-tenant', 2026, 3);

    expect(result.employers).toHaveLength(1);
    expect(result.employers[0].businessName).toBe('Brew Bistro');
    expect(result.employers[0].shiftCount).toBe(2);
    expect(result.employers[0].grossKes).toBe(3300);
    expect(result.platformTotals.totalPlatformFeeKes).toBe(132);
    expect(result.remittanceSummary.nssfToNssf).toBe(198);
  });
});
