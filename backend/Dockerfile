# ==============================================================================
# Kings Taxi Central Backend — Production Multi-Stage Dockerfile
# ==============================================================================

# Stage 1: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache openssl libc6-compat

# Copy workspace package manifests
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY shared/package.json ./shared/

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy backend and shared source files
COPY shared ./shared
COPY backend ./backend

# Generate Prisma Client & Build TypeScript
WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --production

# ------------------------------------------------------------------------------
# Stage 2: Minimal Production Runner
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl libc6-compat dumb-init

ENV NODE_ENV=production
ENV PORT=3000
ENV API_PREFIX=/api/v1

# Security: Non-root user
USER node

# Copy production artifacts from builder
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/backend/node_modules ./backend/node_modules
COPY --chown=node:node --from=builder /app/backend/dist ./backend/dist
COPY --chown=node:node --from=builder /app/backend/prisma ./backend/prisma
COPY --chown=node:node --from=builder /app/backend/package.json ./backend/package.json

WORKDIR /app/backend

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/v1/health/live || exit 1

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "dist/server.js"]

