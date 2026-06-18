# HR Assistant — Classic RAG Chat (Plan v2)

> Supersedes `plan_v1.md`. Reflects decisions made during the grilling session.
> Decision rationale + alternatives live in `DECISIONS.md` (the README source material).

## Context

Greenfield TanStack Start app. Goal (Assignment v3 → Option 1 "Chat With Your Docs"): a
chat-based HR assistant that answers employee questions grounded in a **pre-seeded** document
collection (PDF + text), with verifiable citations. Graded on: working RAG, UI/UX creativity,
RAG reasoning, engineering excellence (clean/containerized/tested/observable), and how AI
tools were used. Philosophy: **simple + well-engineered > complex + broken**; document what's
deferred.

## Locked decisions (summary — see `DECISIONS.md`)

| Area | Decision |
|---|---|
| **App** | TanStack Start (React 19), one full-stack TS app, single image |
| **LLM/embeddings provider** | OpenRouter, one `OPENROUTER_API_KEY` for both |
| **Chat transport** | `@tanstack/ai` + OpenRouter adapter, SSE streaming |
| **Default chat model** | free `:free` slug (dev), `DEFAULT_CHAT_MODEL` env-swap for release |
| **Embeddings** | `nvidia/llama-nemotron-embed-vl-1b-v2:free` (2048-d), batched, env-swappable |
| **Vector store** | Postgres + pgvector, **`halfvec(2048)` + HNSW**, Drizzle ORM |
| **Auth** | bring-your-own-key; graceful missing/bad-key UI banner |
| **Ingestion trigger** | pre-seeded synthetic corpus only (upload = future seam) |
| **Ingestion arch** | decoupled idempotent job; stateless serving; persistent DB |
| **Conversation** | lazy query condensation (history → standalone query), capped |
| **Guardrail** | prompt-primary "I don't know" + low calibrated similarity floor |
| **Citations** | chunk + snippet + score + page (PDFs); click-to-highlight backlogged |
| **Chunking** | recursive boundary-aware split + PDF normalization, page provenance |
| **Model picker** | free + premium (marked "requires credit", graceful 402) |
| **Observability** | per-turn structured pino log, `/health`, in-UI token/latency |
| **Testing** | CI-safe unit tests (stubbed boundaries) + 1 local-only integration test |
| **README** | Claude drafts prose, author edits; `DECISIONS.md` = source of truth |

## Stack

TanStack Start · TanStack Router/Query · `@tanstack/ai` (+ OpenRouter adapter) · Postgres +
pgvector · Drizzle ORM · `unpdf` (PDF text) · `gpt-tokenizer` (approx token counts) · pino ·
Vitest · Tailwind (+ a few shadcn-style components). TypeScript strict. **No LangChain** —
hand-written, legible pipeline.

## Architecture

```
                 ┌─────────────────────────── decoupled ───────────────────────────┐
                 │  pnpm seed  →  ingest()                                           │
 corpus/*.pdf,md │  parse → normalize(PDF) → recursive chunk → batch-embed → store   │  ← writes
                 │  (idempotent, content-hash; per-doc atomic transaction)           │
                 └──────────────────────────────────┬───────────────────────────────┘
                                                     ▼
                                          Postgres + pgvector
                                     documents(status) · chunks(halfvec(2048), HNSW)
                                                     ▲
                 ┌───────────────────────────────────┴──────────────────────────────┐
 browser  ◄────► │  app (stateless, read-only)                                       │
   SSE           │  /api/chat route: [condense?] → embed q → retrieve top-k → floor  │  ← reads
                 │    → grounded prompt → @tanstack/ai stream → +citations frame      │
                 │  server fns: list documents, /health                              │
                 └───────────────────────────────────────────────────────────────────┘
```

**Local:** docker-compose `db` (persistent volume) + one-shot `migrate-seed` init service +
`app` (`depends_on: service_completed_successfully`). First `up` seeds once; later `up`
instant (idempotent).
**Prod:** same `ingest()` command as a CI-triggered one-off job (Cloud Run Job / ECS RunTask /
K8s Job) after migrations, against managed pgvector. App service stateless + autoscaling.

## RAG pipeline

1. **Ingest** (`src/lib/rag/{parse,normalize,chunk,embed}.ts`, `src/lib/ingest.ts`):
   extract (unpdf per-page / raw text) → PDF normalize (de-hyphenate, collapse whitespace,
   strip running headers/footers + bare page numbers) → recursive boundary-aware chunk
   (~600 tok / ~15% overlap; paragraph→line→sentence→token-cap) with offset→start-page
   mapping → batch-embed via OpenRouter → store. Per-document atomic transaction; on any
   embedding failure mark `failed`, persist nothing partial. Content-hash idempotency.
2. **Retrieve** (`src/lib/rag/retrieve.ts`): embed query → pgvector cosine (`<=>`, HNSW over
   `halfvec`) → top-k (default 5) → low similarity floor; all-below-floor → empty-state.
3. **Condense** (`src/lib/rag/condense.ts`): only when history exists → one free-model call
   rewrites follow-up + windowed history (default last 3 msgs, token-capped) into a
   standalone query used for retrieval.
4. **Generate** (`src/lib/rag/prompt.ts` + `/api/chat`): grounded system prompt (HR persona;
   answer only from context; cite; decline when insufficient) → `@tanstack/ai` stream →
   citations as trailing frame/metadata (doc · page · snippet · score).

## Data model (Drizzle)

- `documents` — id, name, source_type (pdf|text), status (processing|ready|failed), error?,
  content_hash, created_at.
- `chunks` — id, document_id (fk, cascade delete), chunk_index, content, page (nullable),
  embedding `halfvec(2048)`, created_at. HNSW index on embedding (cosine).

## UI (`src/components/`)

`ChatPanel` · `MessageList` (streaming) · `Composer` (send/stop) · `SourceCitations`
(expandable: doc · page · snippet · score) · `KnowledgeBasePanel` (read-only seeded docs) ·
`SuggestedQuestions` (corpus-derived) · `ModelPicker` (premium marked "requires credit") ·
`UsageReadout` (token + latency) · states: empty / streaming / no-key banner / error+retry.
Visual direction via `frontend-design` skill.

## Observability

Per-turn pino log (requestId: query · condensed? · retrieval ids+scores+docs · model · token
usage · per-stage latency). `/health` (liveness + DB/index check). In-UI token+latency
readout. Token usage from `@tanstack/ai` stream (fallback: OpenRouter final-chunk `usage`).
*Deferred (README):* OTel, metrics backend, eval dashboard.

## Testing

CI-safe Vitest units (stubbed embedder/LLM via provider seam): chunking
boundaries/overlap/token-cap, PDF normalization, page-provenance mapping, prompt/context
assembly (history+token caps, condense-vs-skip), retrieval ranking + floor + empty-state.
Plus **one** local-only integration test (ingest→retrieve against compose DB, env-guarded,
CI skips). *Deferred:* answer-quality eval harness, Playwright E2E.

## Env vars (`.env.example`)

`OPENROUTER_API_KEY` (required) · `DATABASE_URL` · `DEFAULT_CHAT_MODEL` ·
`DEFAULT_EMBEDDING_MODEL` · `CONDENSE_MODEL` · `RETRIEVAL_TOP_K` · `RETRIEVAL_MIN_SCORE` ·
`CHUNK_SIZE` · `CHUNK_OVERLAP` · `HISTORY_WINDOW` · `INTEGRATION_DB_URL` (test-only).

## File layout (target)

```
src/
  lib/
    openrouter.ts        # @tanstack/ai chat adapter + embeddings client (one key)
    config.ts            # env + model/embedder defaults + picker list
    logger.ts
    db/{schema.ts,index.ts}; drizzle/ migrations
    rag/{parse,normalize,chunk,embed,retrieve,condense,prompt}.ts
    ingest.ts            # shared pipeline (seed + future upload caller)
  routes/
    __root.tsx, index.tsx
    api/chat.ts          # streaming SSE route
  server/{documents.ts,health.ts}  # server fns
  components/...         # see UI
scripts/seed.ts          # corpus → ingest()
corpus/                  # bundled synthetic HR docs
tests/...
Dockerfile · docker-compose.yml · .env.example · README.md · DECISIONS.md
```

## Build order & cut line (~1–2 days)

1. **Walking skeleton** — TanStack Start + pgvector compose + Drizzle schema (`halfvec(2048)`)
   + `@tanstack/ai` chat route streaming. *(floor)*
2. **Ingest + retrieve** — `ingest()` + seed script + init-service + basic retrieve. *(floor — true MVP)*
3. **Grounded gen + calibrated guardrail + citations B+C.** *(floor — assignment core)*
4. **Chat polish** — KB panel, suggested questions, model picker, states, design pass. *(floor — creativity)*
5. PDF normalization + conversational condensation. *(stretch)*
6. Observability + tests. *(stretch)*
7. **Dockerfile finalize, screenshots, README draft.** *(ALWAYS reserved)*

**Floor = 1–4 + 7.** 5–6 are the realistic drops → README "next steps". Never sacrifice
layer 4 (creativity) or 7 (runnable + documented) to force 5. Keep high-ROI chunking tests
even when tight.

## Verification

- `docker compose up` → db + migrate-seed (once) + app; corpus embedded into `chunks`
  (row count, non-null `halfvec`).
- In-scope question → grounded, **streamed** answer + correct citations (doc·page·snippet·score);
  token usage + retrieval scores in logs.
- Out-of-scope question → declines ("not in the provided documents").
- Follow-up question (if condensation built) → retrieves correctly via rewritten query.
- Model picker swap → regenerates via selected model; premium-on-$0-key → graceful message.
- Missing key → friendly banner, app still boots.
- `pnpm test` green (CI-safe); `/health` OK; typecheck + lint clean.

## README sections (Claude drafts, author edits)

Setup · architecture (+ diagram) · RAG/LLM decisions (from `DECISIONS.md`) · key technical
decisions · engineering standards followed/skipped · productionize on hyperscaler · how AI
tools were used (the grill-driven workflow) · what I'd do next (condensation, PDF
normalization, upload UI, click-to-highlight citations, reranking/MMR, hybrid search, auth/
multi-tenant, eval harness) · known limitations (free-tier limits, single-tenant, re-index on
embedder swap, table/multi-column PDF) · screenshots.
