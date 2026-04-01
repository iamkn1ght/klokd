import app from './app';
import { config } from './config';

const server = app.listen(config.port, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║           Klokd API Server                ║
  ║  Port: ${config.port}                            ║
  ║  Env:  ${config.nodeEnv.padEnd(16)}           ║
  ║  klokd.co.ke · @klokdKE                  ║
  ╚═══════════════════════════════════════════╝
  `);
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

export default server;
