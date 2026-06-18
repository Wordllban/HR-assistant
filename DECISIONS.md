# Decision Log — HR Assistant (Classic RAG Chat)

A running record of architectural decisions, the alternatives considered, and the
reasoning behind each. Source material for the README. Captured during a grilling
session before implementation.

> Stack baseline (locked pre-grilling): TanStack Start (React 19) · TanStack Router/Query ·
> `@tanstack/ai` (OpenRouter adapter) · Postgres + pgvector · Drizzle ORM · OpenRouter
> (one `OPENROUTER_API_KEY` for chat + embeddings) · `unpdf` · pino · Vitest · Tailwind.
> No LangChain — hand-written, legible RAG pipeline.

---

## 1. Default chat model: free by default, env-swappable
**Decision:** Default to a free OpenRouter `:free` chat slug during development. Expose a
`DEFAULT_CHAT_MODEL` env var so the default can be swapped to a reliable paid model on
release without code changes.
**Alternatives:** Ship a paid-reliable default from the start.
**Why:** Keeps development and grading zero-cost; the env var makes the release swap a
one-line change. Free-tier rate limits + slug-stability documented as a known limitation.

## 2. Authentication: bring-your-own-key + graceful missing-key UI
**Decision:** Grader supplies their own free `OPENROUTER_API_KEY` (README prerequisite,
~60s). No key is committed to the repo. If the key is missing/invalid, the app still boots
and the chat UI shows a clear inline banner instead of a 500.
**Alternatives:** Ship a funded key in the repo; host a public demo.
**Why:** Committing a secret to a public repo reads as poor engineering judgment regardless
of intent. Graceful no-key/bad-key handling is itself a rubric-positive signal.

## 3. Embeddings provider/model: free NVIDIA Nemotron, env-swappable
**Decision:** Default embedder = `nvidia/llama-nemotron-embed-vl-1b-v2:free` (free on a $0
key), behind the `embed.ts` seam with a `DEFAULT_EMBEDDING_MODEL` swap, mirroring the chat
model pattern.
**Alternatives:** (A) OpenRouter paid embeddings (`text-embedding-3-small`) — rejected:
OpenRouter has NO $0 embedding models and requires a ~$5 minimum top-up, so a fresh BYO key
could not ingest at all. (B) Local in-process embeddings (fastembed/transformers.js) —
rejected once a free hosted slug was found: keeps the "one OpenRouter key for everything"
elegance.
**Why:** Only path that is end-to-end free on a fresh key AND single-provider.
**Caveats logged:** `:free` slug = shared rate limits + stability risk (mitigated by
batching); model is tuned for *multimodal* QA retrieval, not pure-text SOTA — swap-via-env
to a cheap text model (e.g. Qwen3-8B) on release if retrieval quality is weak.

## 4. Embedding batching
**Decision:** Use OpenRouter's batched `input: [...]` array to embed many chunks per request.
**Why:** A whole-handbook ingest becomes a handful of calls — free-tier rpm limits become a
non-issue. (Verified supported.)

## 5. Vector storage: `halfvec(2048)` + HNSW
**Decision:** Store/index embeddings as `halfvec(2048)` with an HNSW index; cast at query time.
**Alternatives:** `vector(2048)` + HNSW (impossible — pgvector indexes cap at 2000 dims on
`vector`); exact search / no index (kept as fallback); Matryoshka truncation to ≤2000
(rejected — model not confirmed MRL; silent quality loss).
**Why:** Nemotron outputs 2048-d, which exceeds pgvector's 2000-d `vector` index ceiling.
`halfvec` raises the index limit to 4000 dims, halves storage, negligible recall loss.

## 6. Conversational memory: lazy query condensation
**Decision:** Conversational RAG. When prior history exists, run one LLM call to rewrite the
follow-up + history into a standalone query, THEN embed/retrieve on that. First message in a
thread skips condensation (no extra call/latency). History window configurable (default: last
3 messages). Hard caps on both message count and replayed-history tokens to protect free quota.
**Alternatives:** Nothing / one-shot (fails follow-ups); history-in-prompt only (reads
coherent but still retrieves on the bare follow-up → wrong chunks).
**Why:** Makes natural follow-ups ("what about part-time employees?") actually retrieve
correctly — the standard conversational-RAG pattern; lazy application keeps the common case
fast and cheap.

## 7. Retrieval & the "I don't know" guardrail
**Decision:** Prompt-driven guardrail is the PRIMARY "I don't know" mechanism, backed by a
LOW, permissive similarity floor (`RETRIEVAL_MIN_SCORE`, env-configurable) that only drops
obvious garbage and drives the empty-state UX. Always retrieve top-k (`RETRIEVAL_TOP_K`,
default 5, configurable); only when ALL hits are below floor show a distinct empty-state.
Floor is **empirically calibrated** against the real embedder on a sample corpus at build
time; methodology documented in README.
**Alternatives:** High hard floor as the gate (brittle — over-filters good questions, the
worst demo failure); model-only with no floor (free models hallucinate from weak context).
**Why:** False "I don't know" on a valid question is a far worse demo failure than passing a
weak chunk to a model that then declines. The number can't be hardcoded from a blog — it's
embedder-specific.

## 8. Ingestion trigger: pre-seeded corpus only (Option A)
**Decision:** Ship a bundled synthetic HR corpus; a seed step ingests it. No runtime upload
UI for now. Architecture leaves room for interactive upload (B) as a future third caller of
the shared `ingest()` function.
**Alternatives:** Interactive upload only (app empty/useless on first boot); both.
**Why:** Guarantees an instant, content-rich working demo (protects the #1 "working RAG"
criterion). With upload cut, the entire UI/UX-creativity score now rests on the chat surface
(see #10).

## 9. Ingestion architecture: decoupled, idempotent job; stateless serving
**Decision:** Ingestion is a standalone, idempotent command (`pnpm seed` → shared `ingest()`),
NEVER run by the app server. Vector DB is persistent. Serving layer only reads.
- **Per-document atomicity:** embed all chunks (retry/backoff on transient errors), commit
  document + chunks in a single transaction only if ALL embeddings succeed; on failure mark
  doc `failed` with error, persist nothing partial. `documents.status` = processing|ready|failed.
- **Idempotency:** content-hash guard so re-runs are no-ops (no re-embedding, no duplicates).
- **Local:** docker-compose `db` (persistent volume) + one-shot `migrate-seed` init service
  (runs migrations + seed, exits) + `app` (`depends_on: service_completed_successfully`).
  First `up` seeds once (few seconds); every later `up` is instant.
- **Prod (hyperscaler):** same command as a decoupled one-off job (Cloud Run Job / ECS
  RunTask / K8s Job), CI-triggered after migrations, writing to managed pgvector
  (RDS/Cloud SQL/AlloyDB). App service stateless, autoscales, never seeds.
**Alternatives:** Seed-on-app-startup (anti-pattern: autoscaled replicas race, cold starts
balloon, serving coupled to embedding API); bake vectors into image at build (stale,
image-coupled data, weaker prod story).
**Why:** No app-boot ingestion → no startup downtime; clean horizontal scaling; same code
path local and prod; future upload drops in cleanly.

## 10. UI component set; "creativity" = legible grounding, not flash
**Decision:** Chat panel (streaming via `@tanstack/ai`, composer w/ send/stop) · expandable
source citations · read-only knowledge-base panel (lists seeded docs from DB) · suggested
starter questions (derived from the known corpus) · model picker · full state coverage
(empty / streaming / no-key banner / per-message error+retry). Visual direction via the
`frontend-design` skill to avoid templated defaults.
**Why:** With upload gone, creativity is scored on making the RAG *legible*: trustworthy
inline grounding + visible knowledge base + suggested questions + polished states beats
visual flair (assignment says "tasteful, not flashy").

## 11. Citations: chunk + snippet + score, page numbers for PDFs (B+C)
**Decision:** Each citation shows doc name · page (PDFs) · exact retrieved snippet ·
similarity-score badge. Chunk metadata schema locked:
`{ documentId, documentName, chunkIndex, page?, content, embedding }`.
**Alternatives:** Document-level only (weak/unverifiable); click-to-highlight exact span in a
doc viewer (D) — **backlogged** for time.
**Why:** Verifiable grounding at modest cost. Forces page provenance into chunking (#12).

## 12. Chunking
**Decision:**
- Size/overlap: ~600 tokens / ~15% overlap, both configurable (`CHUNK_SIZE`, `CHUNK_OVERLAP`).
- Token counting: pure-JS tokenizer (`gpt-tokenizer`) as a consistent *approximation*
  (documented — real model tokenizers differ; exactness unneeded for sizing).
- Page provenance: parse PDF page-by-page, concatenate while recording page-boundary char
  offsets, chunk the stream, map each chunk's START offset → page number (store start page;
  `.md`/`.txt` → null).
- "Proper" PDF chunking (PDF-first focus): (1) hand-written recursive boundary-aware splitter
  (paragraph → line → sentence → token cap, with overlap); (2) PDF extraction normalization
  BEFORE chunking — de-hyphenation across line breaks, whitespace/newline collapse, repeated
  header/footer + bare page-number stripping. Normalization runs only on the PDF path.
**Stretch:** heading/section-title metadata to enrich citations.
**Deferred (README known limitations):** table reconstruction, multi-column layout, OCR for
scanned PDFs.

## 13. Observability
**Decision:** Per-turn structured pino log (requestId correlating: query · condensation
ran? · retrieval chunk ids+scores+docs · model · token usage · per-stage latency
embed/retrieve/generate). `/health` = liveness + DB connectivity/index-populated check.
Small in-UI per-message token + latency readout (doubles as observability + creativity).
Token usage read from `@tanstack/ai`'s stream usage event (verify at build; fallback =
OpenRouter final-chunk `usage`).
**Deferred (README productionize):** OpenTelemetry spans/traces, metrics backend
(Prometheus/Grafana), eval dashboard.

## 14. Testing
**Decision:** CI-safe Vitest unit tests (pure, no heavy deps) concentrated on parsing:
chunking boundary/overlap/token-cap, PDF normalization, page-provenance mapping, prompt/
context assembly (history+token caps, condense-vs-skip), retrieval ranking + floor cutoff +
empty-state — all with stubbed embedder/LLM boundaries (provider seam). Plus ONE solid
integration test (ingest → retrieve) that runs LOCALLY against the compose DB only,
env-guarded so CI skips it (no Testcontainers).
**Deferred (README "would add"):** LLM answer-quality eval harness, UI E2E (Playwright).
**Why:** Genuine "well-tested" signal with zero flaky/network/cost-bearing tests in CI.

## 15. Model routing details
**Decision:** Model picker shows premium models (Claude Sonnet 4.6, GPT, Gemini) marked
"requires credit" with graceful 402/403 handling when selected on a $0 key. Condensation
(#6) ALWAYS runs on the free default model (`CONDENSE_MODEL`, defaults to `DEFAULT_CHAT_MODEL`),
independent of the picker, so premium picks don't double-charge every follow-up.
**Why:** Demonstrates the provider-agnostic architecture + error handling instead of hiding
capability; keeps follow-ups free even when the answer model is premium.

## 16. README & AI-tooling narrative
**Decision:** Claude drafts full README prose; author edits into their own voice later. This
decision log is the authentic source material (real choices + roads not taken). The "how I
used AI tools" section honestly documents this grill-driven workflow (drove architecture via
adversarial grilling, rejected/redirected recommendations, kept the pipeline hand-written vs
reaching for LangChain; do's/don'ts).
**Why:** Assignment emphasizes "your thoughts, not an LLM's output" three times — a generic
LLM README would *lower* the heavily-weighted README score.

---

## 17. Time budget, build order & cut line
**Time box:** ~1–2 days (finish today/tomorrow).
**Build order (strict priority, each layer demo-able before the next):**
1. Walking skeleton — TanStack Start + pgvector compose + Drizzle schema (`halfvec(2048)`)
   + `@tanstack/ai` chat route streaming. *(floor)*
2. Ingest + retrieve — shared `ingest()` (parse→chunk→batched embed→store) + seed script +
   decoupled init-service + basic retrieve. **True MVP / "working RAG".** *(floor)*
3. Grounded generation + calibrated guardrail + citations B+C. *(floor — assignment core)*
4. Chat polish — knowledge-base panel, suggested questions, model picker, all states,
   `frontend-design` pass. *(floor — the creativity score)*
5. PDF normalization (de-hyphenation/header-footer) + conversational condensation. *(stretch)*
6. Observability (logs, /health, in-UI token/latency) + tests (unit + one integration). *(stretch)*
7. Dockerfile finalize, screenshots, README draft. *(ALWAYS reserved — never cut)*

**Cut line:** 1–4 + 7 are the non-negotiable floor. Given ~1–2 days, **5–6 are the realistic
drop candidates** → move to README "what I'd do next" (the architecture already accommodates
them, which is the point). Do NOT sacrifice layer 4 (polish/creativity) or layer 7
(runnable + documented) to force layer 5 — "it runs and is documented" outranks one more feature.
High-ROI tests (chunking) are worth keeping even in a tight box; comprehensive coverage is not.
