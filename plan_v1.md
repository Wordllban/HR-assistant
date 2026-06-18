# HR Assistant — Classic RAG Chat (TanStack Start + OpenRouter + pgvector)

## Context

This repo is greenfield (only `README.md`, `LICENSE`, `.gitignore`, the assignment PDF, `CLAUDE.md`). The goal, per **Assignment v3.pdf → Option 1 "Chat With Your Docs"**, is a classic Retrieval-Augmented-Generation chat application: a **chat-based HR assistant** that answers common employee questions grounded in an uploaded document collection (PDFs + text files).

The assignment grades: (1) a **working RAG** with a simple, well-designed UI; (2) **creativity in UI/UX**; (3) the **reasoning** behind chunking / embedding / model / retrieval / prompting / guardrails / quality / observability; (4) **engineering excellence** — clean, readable, containerized, tested, observable code; and (5) **how AI tools were used**. Stated philosophy: *start simple with great engineering > complex but broken; don't over-engineer; document what you'd add next.* The README must read as the author's own reasoning (not raw LLM output) and cover setup, architecture, productionization on a hyperscaler, and every stack decision.

**Locked decisions (from discussion):**
- **App shape:** TanStack Start — one full-stack TypeScript app (React + TanStack Router/Query + server functions). Single image to run/containerize.
- **LLM + embeddings provider:** **OpenRouter** for *both* chat and embeddings, via the OpenAI-compatible SDK pointed at `https://openrouter.ai/api/v1`. **One `OPENROUTER_API_KEY`** for everything. Verified: OpenRouter exposes `POST /api/v1/chat/completions` (streaming) and `POST /api/v1/embeddings` (`openai/text-embedding-3-small`, `text-embedding-3-large`, `qwen/qwen3-embedding-0.6b`, …).
- **Default chat model:** a **free** open-weight instruct model — default to a Gemma `:free` slug (e.g. `google/gemma-4-26b-a4b-it:free`, confirmed against the live model list at build), with an in-UI **model picker** exposing other free models (Llama/Qwen/DeepSeek `:free`) and premium ones (Claude Sonnet 4.6 `anthropic/claude-sonnet-4.6`, Opus, GPT, Gemini). Free-tier rate limits (~20 rpm, small daily cap) documented as a known limitation.
- **Embeddings model:** default a cheap/near-free OpenRouter embedding model (default `openai/text-embedding-3-small`, 1536-d); configurable. Vector dimension is fixed by the chosen model — swapping embedders requires re-indexing (documented tradeoff).
- **Vector store:** **Postgres + pgvector** via docker-compose (HNSW index). Best productionization/scalability story for the README.

## Approach

Build a thin, readable RAG pipeline behind a polished chat UI, all in one TanStack Start app, backed by Postgres/pgvector, talking to OpenRouter through a single OpenAI-SDK client. Favor a small amount of well-structured hand-written code over heavy frameworks (no LangChain) so the reasoning is legible — which is exactly what the rubric rewards.

### Stack
- **TanStack Start** (React 19, Vite, TanStack Router + Query), TypeScript strict. Scaffold from the official TanStack Start starter, then adapt.
- **`openai` SDK** → `baseURL: https://openrouter.ai/api/v1`, `apiKey: OPENROUTER_API_KEY` — used for both `.chat.completions.create({ stream: true })` and `.embeddings.create()`.
- **Postgres + pgvector** with **Drizzle ORM** (typed schema + migrations; Drizzle has native `vector()` column support).
- **`unpdf`** for PDF text extraction (pure JS, no native deps — container-friendly); plain read for `.txt`/`.md`.
- **`pino`** structured logging. **Vitest** for tests. **Tailwind** (+ a few shadcn-style components) for a clean UI.

### RAG pipeline (the core)
1. **Ingest** (`src/lib/rag/parse.ts`, `chunk.ts`, `embed.ts` + `src/server/ingest.ts`): upload → extract text (unpdf / raw) → **recursive, token-aware chunking** (~600 tokens, ~15% overlap; split on paragraph→sentence boundaries) → embed each chunk via OpenRouter → store `documents` + `chunks(content, embedding vector(1536), metadata)`.
2. **Retrieve** (`src/lib/rag/retrieve.ts`): embed the query → pgvector cosine search (`<=>`, HNSW index) → top-k (default 5) with a similarity floor.
3. **Generate** (`src/lib/rag/prompt.ts` + `src/server/chat.ts`): assemble a grounded system prompt (HR-assistant persona; answer **only** from retrieved context; cite sources by document/chunk; say "I don't know / not in the provided documents" when context is insufficient — **guardrail**) → stream the LLM answer to the UI → return **citations** (source doc names + snippets).

### UI/UX (creativity criterion)
Clean chat interface: drag-and-drop document upload with ingest status, a document list (with delete), streaming assistant responses, **expandable source citations** under each answer, an **OpenRouter model picker**, sensible empty/loading/error states. Tasteful, not flashy.

### Engineering standards
- TypeScript strict, ESLint + Prettier, small focused modules, a provider seam (`src/lib/openrouter.ts`, embedder/retriever interfaces) so models/embedders are swappable.
- **Tests (Vitest):** chunking boundaries + overlap, prompt/context assembly, retrieval ranking (with a stubbed embedder), an ingest integration test against a sample doc.
- **Observability:** structured request/timing logs, captured **token usage** from OpenRouter responses, retrieval scores logged, a `/health` route.
- **Containerization:** multi-stage `Dockerfile` + `docker-compose.yml` (app + `pgvector/pgvector` Postgres), `.env.example`, Drizzle migrations run on startup.

### Critical files to create
- `src/lib/openrouter.ts` — OpenAI SDK client → OpenRouter (chat + embeddings).
- `src/lib/config.ts` — env + model/embedder defaults + the model-picker list.
- `src/lib/db/schema.ts`, `src/lib/db/index.ts` — Drizzle schema (`documents`, `chunks` with `vector(1536)`), client; `drizzle/` migrations.
- `src/lib/rag/{parse,chunk,embed,retrieve,prompt}.ts` — the pipeline.
- `src/server/{ingest,chat,documents}.ts` — server functions (ingest, streaming chat, list/delete).
- `src/routes/{__root,index}.tsx` + `src/components/{ChatPanel,MessageList,Composer,SourceCitations,ModelPicker,UploadDropzone,DocumentList}.tsx` — UI.
- `src/lib/logger.ts`, health route, `tests/*`.
- `Dockerfile`, `docker-compose.yml`, `.env.example`, rewritten `README.md`.

### README (heavily weighted)
Author-voiced sections: quick setup; architecture overview (+ simple diagram); **RAG/LLM decisions** (why OpenRouter one-key, why a free default + picker, chunking strategy, embedding choice + dimension tradeoff, pgvector, prompt & context management, guardrails, quality, observability); key technical decisions; engineering standards followed *and* deliberately skipped; **productionization on a hyperscaler** (managed Postgres/pgvector e.g. RDS/Cloud SQL, container on ECS/Cloud Run, secrets, autoscaling, background ingest queue, eval harness); how AI tools were used; what I'd do next (reranking/MMR, hybrid search, auth/multi-tenant, eval suite, citation highlighting); known limitations (free-tier rate limits, single-tenant, re-index on embedder change). Plus screenshots.

## Build order
1. Scaffold TanStack Start app; add Tailwind, ESLint/Prettier, Vitest; strict TS.
2. Add Drizzle + pgvector schema + migrations; `docker-compose.yml` with pgvector Postgres; `.env.example`.
3. `openrouter.ts` + `config.ts`; verify exact free chat slug + embedding model/dim against OpenRouter's live list.
4. RAG pipeline: parse → chunk → embed → store; then retrieve; unit tests as I go.
5. Server functions: ingest, streaming chat (with citations + guardrail prompt), documents list/delete.
6. Chat UI: upload/doc list, streaming messages, citations, model picker, states.
7. Observability (pino, token usage, `/health`) + remaining tests.
8. Dockerfile; end-to-end run via docker-compose; capture screenshots.
9. Write the README.

## Verification
- `docker compose up` → app + Postgres/pgvector start; migrations apply.
- Upload a sample PDF + a `.txt` (e.g. a mock employee handbook) → confirm chunks + embeddings land in `chunks` (row count, non-null vectors).
- Ask an in-scope question → grounded, **streamed** answer with correct **citations**; token usage + retrieval scores appear in logs.
- Ask an out-of-scope question → assistant declines per guardrail ("not in the provided documents").
- Switch model in the picker → answer regenerates via the selected OpenRouter model.
- `npm test` (Vitest) green; `GET /health` returns OK; `npm run lint`/typecheck clean.

## Notes / assumptions
- Single-tenant, no auth (acknowledged in README as a "would add next").
- Exact OpenRouter slugs (free chat model, embedding model) and the embedding dimension are confirmed against the live model list during step 3; the `vector(N)` column is set to match.
- No LangChain/LlamaIndex — a small hand-written pipeline is clearer and defensible per the "don't over-engineer" guidance (alternatives noted in the README).
