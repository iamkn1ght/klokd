# Klokd Octopus API — Production Dockerfile
FROM node:22-slim AS builder

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

RUN npx prisma generate
RUN npm run build

# ─── Production stage ──────────────────────────────────
FROM node:22-slim

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Use Node directly — no shell script (avoids CRLF issues on Windows hosts)
CMD ["node", "dist/start.js"]
