import { PaymentService, isPaymentRailLive, refundEscrowIfFunded } from '../src/modules/payment/payment.service';
import { config } from '../src/config';
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
      findUnique: jest.fn(),
    },
    shiftSettlement: { findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
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

describe('Kipkiren Pay guards', () => {
  const saved = { ...config.paymentRail };
  afterEach(() => Object.assign(config.paymentRail, saved));

  it('treats the rail as not live until base URL and credentials are set', () => {
    Object.assign(config.paymentRail, { baseUrl: '', appId: '', appSecret: '' });
    expect(isPaymentRailLive()).toBe(false);
    Object.assign(config.paymentRail, { baseUrl: 'https://kp.example', appId: 'klokd', appSecret: 's' });
    expect(isPaymentRailLive()).toBe(true);
  });

  it('refuses to pay out while the rail is not live', async () => {
    Object.assign(config.paymentRail, { baseUrl: '', appId: '', appSecret: '' });
    await expect(new PaymentService().disbursePayment('shift-1', 'tenant')).rejects.toMatchObject({
      statusCode: 503,
      railCode: 'PAYMENT_RAIL_NOT_LIVE',
    });
  });

  it('payout sweep and refunds are no-ops while the rail is not live', async () => {
    Object.assign(config.paymentRail, { baseUrl: '', appId: '', appSecret: '' });
    expect(await new PaymentService().payoutApprovedSettlements()).toBe(0);
    await refundEscrowIfFunded('shift-1', 'tenant', 'actor');
    expect((prisma as any).escrow.findUnique).not.toHaveBeenCalled();
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
