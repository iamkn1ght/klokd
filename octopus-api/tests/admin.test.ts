import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { config } from '../src/config';

// Mock Supabase
jest.mock('../src/config/supabase', () => ({
  supabase: { auth: { signInWithOtp: jest.fn(), verifyOtp: jest.fn() } },
}));

// Mock Prisma
jest.mock('../src/config/database', () => ({
  __esModule: true,
  default: {
    complianceConfig: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), create: jest.fn() },
    worker: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), findUnique: jest.fn(), update: jest.fn() },
    employer: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0), findUnique: jest.fn() },
    user: { findUnique: jest.fn(), update: jest.fn() },
    shift: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(5) },
    payment: {
      findMany: jest.fn().mockResolvedValue([]),
      aggregate: jest.fn().mockResolvedValue({ _sum: { grossKes: 10000, netKes: 9000, platformFeeKes: 400 } }),
    },
    notification: { findMany: jest.fn().mockResolvedValue([]) },
    analyticsEvent: { findMany: jest.fn().mockResolvedValue([]), create: jest.fn().mockResolvedValue({ id: 'breach-1' }) },
  },
}));

function adminToken() {
  return jwt.sign(
    { userId: 'admin-1', role: 'ADMIN', tenantId: 'test-tenant' },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
}

function workerToken() {
  return jwt.sign(
    { userId: 'worker-1', role: 'WORKER', tenantId: 'test-tenant' },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
}

describe('Admin Routes', () => {
  it('should reject non-admin users', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${workerToken()}`);
    expect(res.status).toBe(403);
  });

  it('should return platform stats for admin', async () => {
    const res = await request(app)
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('workers');
    expect(res.body.data).toHaveProperty('employers');
    expect(res.body.data).toHaveProperty('totalRevenueKes');
  });

  it('should list compliance config', async () => {
    const res = await request(app)
      .get('/api/v1/admin/compliance/config')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('should return paginated workers list', async () => {
    const res = await request(app)
      .get('/api/v1/admin/workers?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('workers');
    expect(res.body.data).toHaveProperty('totalPages');
  });
});

describe('Security Routes', () => {
  it('should return encryption audit', async () => {
    const res = await request(app)
      .get('/api/v1/security/encryption-audit')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.checks.length).toBeGreaterThan(0);
  });

  it('should return OWASP check results', async () => {
    const res = await request(app)
      .get('/api/v1/security/owasp-check')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.checks.length).toBe(10);
  });

  it('should return rate limit configuration', async () => {
    const res = await request(app)
      .get('/api/v1/security/rate-limits')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.endpoints.length).toBeGreaterThan(0);
  });
});

describe('Breach Response', () => {
  it('should create a breach report with 72hr countdown', async () => {
    const res = await request(app)
      .post('/api/v1/admin/breach')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({
        description: 'Potential unauthorized access to worker ID images detected in logs',
        affectedRecords: 12,
        dataTypes: ['id_images', 'selfies'],
        severity: 'HIGH',
      });
    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('breachId');
    expect(res.body.data.hoursRemaining).toBe(72);
    expect(res.body.data).toHaveProperty('odpcDeadline');
  });
});
