import app from './app';
import { config } from './config';

console.log('[startup] Booting Klokd Octopus API...');
console.log(`[startup] Node version: ${process.version}`);
console.log(`[startup] PORT env: ${process.env.PORT || '(unset)'}`);
console.log(`[startup] NODE_ENV: ${process.env.NODE_ENV || '(unset)'}`);
console.log(`[startup] DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'unset'}`);

// Bind to 0.0.0.0 explicitly so Railway/Docker can route to the container
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`[startup] ✓ Server listening on 0.0.0.0:${config.port}`);
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║           Klokd API Server                ║
  ║  Port: ${config.port}                            ║
  ║  Env:  ${config.nodeEnv.padEnd(16)}           ║
  ║  klokd.co.ke · @klokdKE                  ║
  ╚═══════════════════════════════════════════╝
  `);
});

server.on('error', (err) => {
  console.error('[fatal] Server failed to start:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => process.exit(0));
});

// Catch unhandled errors so we see them in logs
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err);
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
  process.exit(1);
});

export default server;
