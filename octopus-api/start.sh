#!/bin/sh
set -e

echo "[entrypoint] Starting Klokd Octopus API..."
echo "[entrypoint] Working directory: $(pwd)"
echo "[entrypoint] Node version: $(node --version)"
echo "[entrypoint] DATABASE_URL: ${DATABASE_URL:-(unset)}"
echo "[entrypoint] PORT: ${PORT:-(unset)}"

# Ensure prisma directory exists and is writable
mkdir -p ./prisma
echo "[entrypoint] Prisma dir: $(ls -la ./prisma/ 2>&1 || echo 'cannot list')"

echo "[entrypoint] Running prisma migrate deploy..."
npx prisma migrate deploy || {
  echo "[entrypoint] migrate deploy failed, trying db push..."
  npx prisma db push --skip-generate --accept-data-loss
}

echo "[entrypoint] Starting Node server..."
exec node dist/server.js
