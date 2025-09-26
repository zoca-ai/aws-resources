FROM node:18-alpine AS base

# Rebuild the source code only when needed
FROM base AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm with store configuration
RUN npm install -g pnpm
RUN pnpm config set store-dir /pnpm

# Install dependencies with cache mount
COPY package.json pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm pnpm install --frozen-lockfile

# Copy source code
COPY . .

ENV NODE_ENV="production"
ENV DATABASE_URL=""
ENV AUTH_SECRET=""
ENV AUTH_GOOGLE_ID=""
ENV AUTH_GOOGLE_SECRET=""
ENV AWS_PROFILE="default"
ENV COLLECTION_TIMEOUT="300000"
ENV COLLECTION_RETRY_ATTEMPTS="3"
ENV COLLECTION_RETRY_DELAY="1000"

# Build Next.js application
RUN pnpm run build
# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Install pnpm for running migrations
RUN npm install -g pnpm
RUN pnpm config set store-dir /pnpm

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Install only production dependencies
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-lock.yaml* ./
RUN --mount=type=cache,id=pnpm,target=/pnpm pnpm install --frozen-lockfile --prod

# Copy migration files and dependencies
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/src/server/db ./src/server/db
COPY --from=builder /app/src/env.js ./src/env.js

# Copy the public folder
COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Copy startup script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Copy production environment file
COPY .env.production /app/.env.production

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Environment variables will be loaded from .env.production at runtime

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["node", "server.js"]
