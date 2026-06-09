import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { errorHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './modules/auth/auth.routes';
import identityRoutes from './modules/identity/identity.routes';
import shiftRoutes from './modules/shift/shift.routes';
import complianceRoutes from './modules/compliance/compliance.routes';
import paymentRoutes from './modules/payment/payment.routes';
import disputeRoutes from './modules/dispute/dispute.routes';
import ratingRoutes from './modules/rating/rating.routes';
import adminRoutes from './modules/admin/admin.routes';
import securityRoutes from './modules/admin/security.routes';
import railWebhookRoutes from './modules/rails/webhook.routes';

const app = express();

// ─── Global Middleware ──────────────────────────────────
app.use(helmet());
app.use(cors());

// Rail webhooks need raw body for HMAC verification — mount BEFORE express.json()
app.use('/api/v1/webhooks/rails', railWebhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// ─── Health Check ───────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'klokd-api',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

// ─── Readiness Probe (checks DB connection) ─────────────
app.get('/ready', async (_req, res) => {
  try {
    const prisma = (await import('./config/database')).default;
    await prisma.$queryRawUnsafe('SELECT 1');
    res.json({
      status: 'ready',
      service: 'klokd-api',
      database: 'connected',
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({
      status: 'not_ready',
      service: 'klokd-api',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// ─── API Routes ─────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/identity', identityRoutes);
app.use('/api/v1/shifts', shiftRoutes);
app.use('/api/v1/compliance', complianceRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/disputes', disputeRoutes);
app.use('/api/v1/ratings', ratingRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/security', securityRoutes);

// ─── Error Handler (must be last) ───────────────────────
app.use(errorHandler);

export default app;
