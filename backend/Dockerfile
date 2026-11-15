# ==============================================================================
# Kings Taxi Central Backend — Production Multi-Stage Dockerfile (Render)
# ==============================================================================
# Multi-stage build optimized for Render deployment with VPS PostgreSQL SSH tunnel:
#   Stage 1 (prod-deps): Clean production dependencies only for backend & shared
#   Stage 2 (builder):   DevDependencies, Prisma client generation, TypeScript build
#   Stage 3 (runner):    Minimal hardened Alpine runtime with SSH client, dumb-init,
#                        and su-exec for root secret staging & privilege dropping
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Production Dependencies
# ------------------------------------------------------------------------------
FROM node:22-alpine AS prod-deps

WORKDIR /app

# Copy root and workspace package manifests
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
COPY apps/passenger-mobile/package.json ./apps/passenger-mobile/

# Install only production dependencies for backend and shared packages.
# Omit --include-workspace-root to avoid installing root mobile dependencies.
RUN npm ci --omit=dev --workspace=@kings-taxi/backend --workspace=@kings-taxi/shared --ignore-scripts

# ------------------------------------------------------------------------------
# Stage 2: Application Builder
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install build dependencies for Prisma binary engine on Alpine
RUN apk add --no-cache openssl libc6-compat

# Copy root and workspace package manifests
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/
COPY apps/passenger-mobile/package.json ./apps/passenger-mobile/

# Install build dependencies for backend and shared packages.
# Omit --include-workspace-root to avoid installing root mobile dependencies.
RUN npm ci --workspace=@kings-taxi/backend --workspace=@kings-taxi/shared --ignore-scripts

# Copy shared domain and backend source files
COPY shared ./shared
COPY backend ./backend

# Generate Prisma Client & Compile Backend TypeScript
WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 3: Minimal Hardened Production Runner
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Install runtime dependencies:
# - openssl & libc6-compat: required for Prisma query engine on Alpine
# - dumb-init: process supervisor for proper PID 1 signal forwarding
# - openssh-client: OpenSSH tools for establishing the secure tunnel to VPS
# - bash: reliable shell environment for the startup supervisor script
# - netcat-openbsd: port probing for local tunnel verification
# - su-exec: lightweight privilege dropping from root to non-root user (node)
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    dumb-init \
    openssh-client \
    bash \
    netcat-openbsd \
    su-exec

ENV NODE_ENV=production
ENV PORT=3000
ENV API_PREFIX=/api/v1

# Setup runtime directories with non-root ownership
RUN mkdir -p /home/node/.ssh /app/backend/public/uploads \
    && chown -R node:node /home/node /app \
    && chmod 700 /home/node/.ssh

# Copy production dependencies from prod-deps stage
COPY --chown=node:node --from=prod-deps /app/node_modules ./node_modules

# Copy generated Prisma Client and compiled application artifacts from builder stage
COPY --chown=node:node --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --chown=node:node --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --chown=node:node --from=builder /app/backend/dist ./backend/dist
COPY --chown=node:node --from=builder /app/backend/prisma ./backend/prisma
COPY --chown=node:node --from=builder /app/backend/package.json ./backend/package.json
COPY --chown=node:node --from=builder /app/package.json ./package.json

# Copy production startup script with executable permissions
COPY --chown=node:node backend/start-with-tunnel.sh ./backend/start-with-tunnel.sh
RUN chmod +x ./backend/start-with-tunnel.sh

WORKDIR /app/backend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-3000}/api/v1/health/live || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["./start-with-tunnel.sh"]
