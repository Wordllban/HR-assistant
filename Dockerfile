# Job image for the decoupled migrate + seed one-off (DECISIONS.md §9). Runs the
# TypeScript scripts via tsx — no build step needed. #7 extends this (build stage +
# serve command) so the same image also serves the app; for now it backs `migrate-seed`.
FROM node:22-slim

WORKDIR /app
RUN corepack enable

# Install dependencies first for layer caching.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# App source + the bundled corpus the seed reads.
COPY . .

# Overridden per compose service; default runs the full one-off.
CMD ["sh", "-c", "pnpm db:migrate && pnpm seed"]
