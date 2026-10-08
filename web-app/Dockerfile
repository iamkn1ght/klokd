# Klokd web (klokd.co.ke) — static Expo web export served by Caddy
FROM node:22-slim AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

COPY . .

# Inlined into the bundle at export time. Override via a Railway build variable.
ARG EXPO_PUBLIC_API_URL=https://klokd-production.up.railway.app
ARG EXPO_PUBLIC_SIGNIN_MODE=early-access
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_SIGNIN_MODE=$EXPO_PUBLIC_SIGNIN_MODE
ENV CI=1

RUN npx expo export --platform web --output-dir dist

# ─── Serve ─────────────────────────────────────────────
FROM caddy:2-alpine

COPY Caddyfile /etc/caddy/Caddyfile
COPY --from=builder /app/dist /srv

ENV PORT=8080
EXPOSE 8080
