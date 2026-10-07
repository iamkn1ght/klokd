import { AuthService } from '../src/modules/auth/auth.service';

jest.mock('../src/config', () => ({
  config: {
    nodeEnv: 'test',
    defaultTenantId: 'test-tenant',
    railFallbackLocal: true,
    otpSandboxEcho: true,
    jwt: { secret: 'test-secret', expiry: '1h' },
  },
}));

jest.mock('../src/config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    worker: {
      create: jest.fn().mockResolvedValue({}),
    },
    employer: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock('../src/modules/rails', () => ({
  identityRailClient: {
    createCustomer: jest.fn().mockResolvedValue({ accountUuid: 'acc_test_123', tier: 'tier_1' }),
    activateCustomer: jest.fn().mockResolvedValue({}),
  },
  commsRailClient: {
    sendNotification: jest.fn().mockResolvedValue({}),
  },
  TODOKU_TEMPLATES: { OTP_SMS: 'klokd_otp_sms' },
}));

import prisma from '../src/config/database';

function mockUser(over: Record<string, unknown> = {}) {
  return {
    id: 'user-1',
    tenantId: 'test-tenant',
    phone: '+254722111222',
    accountUuid: 'acc_test_123',
    kycTier: 1,
    role: 'WORKER',
    isActive: false,
    ...over,
  };
}

const NEW_PROFILE = { nameFirst: 'Grace', nameLast: 'Wanjiru', dpaConsent: true, kycConsent: true };

describe('AuthService', () => {
  const service = new AuthService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestOtp', () => {
    it('requires a profile for brand-new phones (Identiti customer-create contract)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.requestOtp('0722111222')).rejects.toThrow('Profile required');
    });

    it('creates the account and returns a challenge with a sandbox OTP in dev', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockImplementation(({ data }) =>
        Promise.resolve(mockUser({ phone: data.phone, accountUuid: data.accountUuid })),
      );

      const res = await service.requestOtp('0722111999', NEW_PROFILE);
      expect(res.message).toBe('OTP sent');
      expect(res.challengeId).toMatch(/^klokd_/);
      expect(res.sandboxOtp).toMatch(/^\d{6}$/);
    });
  });

  describe('verifyOtp', () => {
    it('rejects an unknown challenge', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser({ isActive: true }));
      await expect(
        service.verifyOtp('0722111222', 'klokd_does-not-exist', '123456', 'WORKER')
      ).rejects.toThrow('Invalid or expired challenge');
    });

    it('rejects a wrong code', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockImplementation(({ data }) =>
        Promise.resolve(mockUser({ phone: data.phone, accountUuid: data.accountUuid })),
      );
      const { challengeId, sandboxOtp } = await service.requestOtp('0722111333', NEW_PROFILE);
      // randomInt(100000, 1000000) never yields 000000, so this is always wrong.
      expect(sandboxOtp).not.toBe('000000');

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser({ phone: '+254722111333' }));
      await expect(
        service.verifyOtp('0722111333', challengeId, '000000', 'WORKER')
      ).rejects.toThrow('Invalid OTP');
    });

    it('activates on first verify and stamps the requested role', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockImplementation(({ data }) =>
        Promise.resolve(mockUser({ phone: data.phone, accountUuid: data.accountUuid })),
      );
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const { challengeId, sandboxOtp } = await service.requestOtp('0722111444', NEW_PROFILE);
      const stored = mockUser({ phone: '+254722111444' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(stored);
      (prisma.user.update as jest.Mock).mockImplementation(({ data }) =>
        Promise.resolve({ ...stored, ...data }),
      );

      const res = await service.verifyOtp('0722111444', challengeId, sandboxOtp!, 'EMPLOYER');
      expect(res.isNewUser).toBe(true);
      expect(res.role).toBe('EMPLOYER');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isActive: true, role: 'EMPLOYER' }) })
      );
    });

    it('bootstraps the role\'s profile row on activation (so apply/confirm flows don\'t 404)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockImplementation(({ data }) =>
        Promise.resolve(mockUser({ phone: data.phone, accountUuid: data.accountUuid })),
      );
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const { challengeId, sandboxOtp } = await service.requestOtp('0722111666', NEW_PROFILE);
      const stored = mockUser({ phone: '+254722111666', role: 'WORKER' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(stored);
      (prisma.user.update as jest.Mock).mockImplementation(({ data }) =>
        Promise.resolve({ ...stored, ...data }),
      );

      await service.verifyOtp('0722111666', challengeId, sandboxOtp!, 'WORKER');
      expect(prisma.worker.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'user-1',
            accountUuid: 'acc_test_123',
            firstName: 'Grace',
            lastName: 'Wanjiru',
          }),
        })
      );
    });

    it('does NOT flip the role on re-verify (worker tapping "I hire workers" stays a worker)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockImplementation(({ data }) =>
        Promise.resolve(mockUser({ phone: data.phone, accountUuid: data.accountUuid })),
      );
      const { challengeId, sandboxOtp } = await service.requestOtp('0722111555', NEW_PROFILE);

      // Already-activated WORKER signs in again, but picked the employer tile.
      const stored = mockUser({ phone: '+254722111555', isActive: true, role: 'WORKER' });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(stored);
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});

      const res = await service.verifyOtp('0722111555', challengeId, sandboxOtp!, 'EMPLOYER');
      expect(prisma.user.update).not.toHaveBeenCalled(); // role untouched
      expect(res.isNewUser).toBe(false);
      expect(res.role).toBe('WORKER');
    });
  });
});
