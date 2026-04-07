# Klokd Octopus API — Production Dockerfile
FROM node:22-slim AS builder

# Install OpenSSL for Prisma
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install all deps (need dev for build)
RUN npm ci --legacy-peer-deps

# Copy source
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src

# Generate Prisma client + build TypeScript
RUN npx prisma generate
RUN npm run build

# ─── Production stage ──────────────────────────────────
FROM node:22-slim

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./

# Install only production deps (prisma is now in dependencies)
RUN npm ci --legacy-peer-deps --omit=dev

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy entrypoint
COPY start.sh ./
RUN chmod +x ./start.sh

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["./start.sh"]
