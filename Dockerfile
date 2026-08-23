# syntax=docker/dockerfile:1.7

FROM node:24-bookworm-slim AS dependencies
ARG SOURCE_SHA
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
WORKDIR /app
RUN test -n "$SOURCE_SHA" && printf '%s' "$SOURCE_SHA" | grep -Eq '^[0-9a-f]{40}$'
RUN corepack enable && corepack prepare pnpm@11.19.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder
ARG SOURCE_SHA
ENV NEXT_TELEMETRY_DISABLED=1
RUN test -n "$SOURCE_SHA" && printf '%s' "$SOURCE_SHA" | grep -Eq '^[0-9a-f]{40}$'
COPY . .
RUN pnpm build

FROM node:24-bookworm-slim AS runner
ARG SOURCE_SHA
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app
RUN test -n "$SOURCE_SHA" && printf '%s' "$SOURCE_SHA" | grep -Eq '^[0-9a-f]{40}$'
RUN groupadd --system --gid 1001 virro && useradd --system --uid 1001 --gid virro virro
COPY --from=builder --chown=virro:virro /app/.next/standalone ./
COPY --from=builder --chown=virro:virro /app/.next/static ./.next/static
LABEL org.opencontainers.image.revision=$SOURCE_SHA
LABEL org.opencontainers.image.source="https://github.com/acidicalan-bit/Virro-master"
USER virro
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:3000/api/health/live').then((r)=>process.exit(r.status===204?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
