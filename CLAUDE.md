# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

**HR-assistant** — intended as a RAG-based HR assistant chat. Currently scaffolded as a blank **TanStack Start** (React 19) app; RAG/LLM features are not implemented yet.

See `AGENTS.md` for scaffolding history, TanStack Intent skills, env vars, deployment notes, and architecture.

## Commands

```bash
pnpm install          # install dependencies
pnpm dev              # dev server at http://localhost:3000
pnpm build            # production build (client + SSR)
pnpm preview          # preview production build
pnpm test             # vitest run
pnpm exec tsc --noEmit  # typecheck
pnpm generate-routes  # regenerate route tree
```

## Architecture (high level)

- **TanStack Start** + **TanStack Router** (file routes in `src/routes/`)
- **Vite 8**, **Tailwind CSS v4**, **Vitest**
- Entry: `src/router.tsx` (`getRouter()`), root shell in `src/routes/__root.tsx`
- Generated: `src/routeTree.gen.ts` (do not edit manually)

## TanStack Intent

Before substantial router/Start/devtools work, load relevant skills:

```bash
pnpm dlx @tanstack/intent@latest list
pnpm dlx @tanstack/intent@latest load @tanstack/start-client-core#start-core
```

Do not use Next.js patterns (`"use server"`, App Router layouts, etc.). Use `createServerFn` for server-only code.

## Notes for future work

- Server secrets (LLM API keys, vector DB) belong in `process.env` / server functions — never `VITE_*`.
- Default to latest Claude models for AI features (see `claude-api` skill for model IDs and SDK usage).
- Consult `@tanstack/start-client-core#start-core/execution-model` before adding data fetching or RAG pipelines.
