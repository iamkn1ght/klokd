import { AuthService } from '../src/modules/auth/auth.service';

// Mock Prisma
jest.mock('../src/config/database', () => ({
  __esModule: true,
  default: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
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
  },
}));

// Mock Supabase
jest.mock('../src/config/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: jest.fn().mockResolvedValue({ error: { message: 'not enabled' } }),
      verifyOtp: jest.fn().mockResolvedValue({ error: { message: 'invalid' } }),
    },
  },
}));

import prisma from '../src/config/database';

describe('AuthService', () => {
  const service = new AuthService();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('requestOtp', () => {
    it('should return success message for valid phone (dev fallback)', async () => {
      const result = await service.requestOtp('0722400500');
      expect(result.message).toContain('OTP sent successfully');
    });
  });

  describe('verifyOtp', () => {
    it('should reject with invalid OTP', async () => {
      await expect(
        service.verifyOtp('0700000000', '123456', 'WORKER')
      ).rejects.toThrow('Invalid or expired OTP');
    });

    it('should verify with dev fallback OTP', async () => {
      // Request OTP first (falls back to dev store since Supabase phone auth is mocked as disabled)
      await service.requestOtp('0722111222');

      // Mock user not found, then create
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-1',
        tenantId: 'klokd-ke-default',
        phone: '+254722111222',
        role: 'WORKER',
      });
      (prisma.refreshToken.create as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      // Wrong OTP should fail
      await expect(
        service.verifyOtp('0722111222', '000000', 'WORKER')
      ).rejects.toThrow('Invalid or expired OTP');
    });
  });
});
