# Shared base: keeps the Node version and telemetry setting consistent.
FROM node:22-alpine AS base

ENV NEXT_TELEMETRY_DISABLED=1

# Stage 1 — dependencies: install the exact packages recorded in package-lock.json.
FROM base AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Stage 2 — builder: compile the application into Next.js standalone output.
FROM base AS builder

WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3 — runtime: copy only the production server and static assets.
FROM base AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# The runtime process has no root privileges.
RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# No source code, tests, lockfile, or build-time node_modules are copied here.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
