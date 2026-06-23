# Klokd Octopus API — Deployment Guide

## Quick Deploy to Railway (recommended)

### Prerequisites
- Railway account (railway.app)
- Railway CLI: `npm install -g @railway/cli`
- This repo cloned locally

### Steps

1. **Login to Railway**
   ```bash
   railway login
   ```

2. **Create a new project**
   ```bash
   cd octopus-api
   railway init
   ```

3. **Add a persistent volume** (for SQLite database)
   - Go to railway.app → your project → Settings → Volumes
   - Create volume mounted at `/app/prisma`

4. **Set environment variables** (Railway dashboard → Variables)
   ```
   DATABASE_URL=file:./prisma/dev.db
   JWT_SECRET=<generate a strong random string>
   JWT_REFRESH_SECRET=<generate another strong random string>
   JWT_EXPIRY=15m
   JWT_REFRESH_EXPIRY=7d

   # ─── KMV Platform Rails (per cardinal rules AD-K01/02/03) ───
   # Klokd never holds Daraja/AT/WhatsApp creds. Those live behind KP / Todoku.
   # See KMV_RAILS_INTEGRATION_GUIDE.md + .env.example for the canonical set.

   # Identiti (account UUID, KYC, phone tokens, step-up)
   IDENTITI_API_BASE=https://identiti-production.up.railway.app
   IDENTITI_APP_ID=klokd_sandbox
   IDENTITI_APP_SECRET=<hex-64, from Silvia>

   # Todoku (OTP, SMS, WhatsApp delivery)
   TODOKU_API_BASE=https://todoku-prod-production.up.railway.app
   TODOKU_APP_ID=klokd_sandbox
   TODOKU_APP_SECRET=<base64url-43, from Silvia>
   TODOKU_WEBHOOK_SECRET=<base64url-43, from Silvia>

   # Payment Rail (Kipkiren Pay → LipaStack at Phase 3)
   # NEVER name these KIPKIREN_PAY_* — they don't survive LipaStack transcendence.
   PAYMENT_RAIL_API_BASE=<from Silvia after KP-1-Ops Railway deploy>
   PAYMENT_RAIL_APP_ID=klokd_sandbox
   PAYMENT_RAIL_APP_SECRET=<base64url-43, from Silvia>
   PAYMENT_RAIL_WEBHOOK_SECRET=<base64url-43, from Silvia>

   # Helpan AI (agent runtime)
   HELPAN_API_BASE=<from Helpan operator>
   HELPAN_APP_ID=klokd   # literal slug, NOT klokd_sandbox
   HELPAN_APP_SECRET=<hex-64>
   HELPAN_WEBHOOK_SECRET=<hex-64>

   # Hakken (discovery — Sprint 5)
   HAKKEN_API_BASE=https://hakken-production.up.railway.app
   HAKKEN_APP_KEY=klokd
   HAKKEN_APP_SECRET=<from Silvia>

   # Supabase Storage
   SUPABASE_URL=https://nbtpkmjovgbwgwefsdjn.supabase.co
   SUPABASE_SERVICE_KEY=<from supabase dashboard>
   SUPABASE_STORAGE_BUCKET=klokd-documents

   # Expo Push
   EXPO_PUSH_TOKEN=<from expo.dev>

   # App
   PORT=3000
   NODE_ENV=production
   ```

5. **Deploy**
   ```bash
   railway up
   ```

6. **Get the URL**
   ```bash
   railway domain
   ```
   Note this URL (e.g., `https://klokd-api.railway.app`)

7. **Update mobile apps** to point to production URL
   - Edit `worker-app/src/services/api.ts` and `employer-app/src/services/api.ts`
   - Change the production URL from `https://api.klokd.co.ke/api/v1` to your Railway URL

8. **Verify**
   ```bash
   curl https://your-app.railway.app/health
   curl https://your-app.railway.app/ready
   ```

---

## Migrating to Supabase PostgreSQL (later)

For production scale, migrate from SQLite to Supabase Postgres:

1. **Get connection string** from Supabase → Settings → Database → Connection string (URI)

2. **Create a production schema** at `prisma/schema.production.prisma`:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
   (Otherwise identical to schema.prisma)

3. **Add a build script** to swap schemas before deploy:
   ```json
   "scripts": {
     "build:prod": "cp prisma/schema.production.prisma prisma/schema.prisma && npx prisma generate && tsc"
   }
   ```

4. **Update Dockerfile** to run `npm run build:prod`

5. **Update Railway env**: change `DATABASE_URL` to the Supabase Postgres URL

6. **Run migration**:
   ```bash
   railway run npx prisma migrate deploy
   ```

---

## Alternative: Render.com

Same Dockerfile works on Render. Create a Web Service, point at GitHub repo, set build command to `docker build -f octopus-api/Dockerfile .`, use the same env variables.

---

## Health Checks

- `GET /health` — returns `{status: "ok"}` (always)
- `GET /ready` — returns `{status: "ready", database: "connected"}` if DB is reachable
