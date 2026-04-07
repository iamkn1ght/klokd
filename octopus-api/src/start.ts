/**
 * Production entrypoint — runs migrations then starts the server.
 * Avoids shell script line-ending issues by doing everything in Node.
 */
import { execSync } from 'child_process';

console.log('[entrypoint] Klokd Octopus API booting...');
console.log(`[entrypoint] Node version: ${process.version}`);
console.log(`[entrypoint] Working dir: ${process.cwd()}`);
console.log(`[entrypoint] PORT: ${process.env.PORT || '(unset)'}`);
console.log(`[entrypoint] DATABASE_URL: ${process.env.DATABASE_URL ? 'set' : 'unset'}`);

// Ensure prisma directory exists for SQLite
try {
  const fs = require('fs');
  if (!fs.existsSync('./prisma')) {
    fs.mkdirSync('./prisma', { recursive: true });
    console.log('[entrypoint] Created ./prisma directory');
  }
} catch (e) {
  console.warn('[entrypoint] Could not create prisma dir:', e);
}

// Run migrations
try {
  console.log('[entrypoint] Running prisma migrate deploy...');
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  console.log('[entrypoint] ✓ Migrations applied');
} catch (err) {
  console.warn('[entrypoint] migrate deploy failed, trying db push...');
  try {
    execSync('npx prisma db push --skip-generate --accept-data-loss', { stdio: 'inherit' });
    console.log('[entrypoint] ✓ Schema synced via db push');
  } catch (e2) {
    console.error('[entrypoint] FATAL: could not initialize database', e2);
    process.exit(1);
  }
}

// Start the server
console.log('[entrypoint] Starting server...');
require('./server');
