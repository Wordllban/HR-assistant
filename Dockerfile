# syntax=docker/dockerfile:1

# Multi-stage build. ONE image backs BOTH compose services (DECISIONS.md §9):
#   • migrate-seed — the one-off deploy job: applies migrations, then ingests the bundled
#     corpus through the shared ingest() pipeline (run with tsx). Exits when the index is ready.
#   • app          — stateless serving: srvx serves the Vite build's fetch handler and the
#     client assets. Never seeds; only reads the vector store.
# The Vite build runs in an isolated stage; the runtime image carries only production
# dependencies plus the built output and the scripts/corpus the seed job reads.

FROM node:22-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

# --- Full dependencies (incl. dev) — only needed to build ---
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# --- Production-only dependencies — what the runtime image ships ---
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile

# --- Build the client + SSR bundle into dist/ ---
FROM deps AS build
COPY . .
RUN pnpm build

# --- Runtime: lean image shared by migrate-seed and app ---
FROM base AS runtime
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=prod-deps /app/node_modules ./node_modules
# Source + migrations + corpus power the seed one-off (tsx resolves the #/ and @/ aliases
# via package.json imports and tsconfig); dist powers serving.
COPY package.json pnpm-lock.yaml tsconfig.json ./
COPY drizzle ./drizzle
COPY corpus ./corpus
COPY scripts ./scripts
COPY src ./src
COPY --from=build /app/dist ./dist

EXPOSE 3000

# Default = the one-off init job. The app service overrides this with `pnpm start`
# (see docker-compose.yml).
CMD ["sh", "-c", "pnpm db:migrate && pnpm seed"]
