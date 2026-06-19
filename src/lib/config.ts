/**
 * Centralized, env-driven configuration. Every tunable RAG/model knob lives here
 * so it can be changed without touching pipeline code (see DECISIONS.md §1, §3, §7).
 *
 * Server-only: reads process.env. Do not import into client-only modules.
 */
import { CHAT_MODELS } from '#/lib/models'

function str(key: string, fallback: string): string {
  const value = process.env[key]
  return value === undefined || value === '' ? fallback : value
}

function num(key: string, fallback: number): number {
  const value = process.env[key]
  if (value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

// gpt-oss-120b:free is a strong, instruction-following free model that is actually
// serving (the older llama-3.3-70b:free free endpoint is frequently rate-limited
// upstream). Swap via DEFAULT_CHAT_MODEL on release (DECISIONS.md §1, §3, §15).
const defaultChatModel = str('DEFAULT_CHAT_MODEL', 'openai/gpt-oss-120b:free')

export const config = {
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? '',
  databaseUrl: str('DATABASE_URL', 'postgres://postgres:postgres@localhost:5432/hr_assistant'),

  // Models — free by default; env-swappable on release (DECISIONS.md §1, §3, §15).
  defaultChatModel,
  defaultEmbeddingModel: str('DEFAULT_EMBEDDING_MODEL', 'nvidia/llama-nemotron-embed-vl-1b-v2:free'),
  // Condensation runs on the free default regardless of the user's picker choice.
  condenseModel: str('CONDENSE_MODEL', defaultChatModel),

  // The embedder's output dimension. MUST match the chunks.embedding halfvec(N) column.
  // nvidia/llama-nemotron-embed-vl-1b-v2 → 2048 (exceeds pgvector's 2000-d `vector`
  // index ceiling, hence halfvec — DECISIONS.md §5).
  embeddingDimensions: 2048,

  // Retrieval / chunking (DECISIONS.md §7, §12).
  retrievalTopK: num('RETRIEVAL_TOP_K', 5),
  retrievalMinScore: num('RETRIEVAL_MIN_SCORE', 0.2),
  chunkSize: num('CHUNK_SIZE', 600),
  chunkOverlap: num('CHUNK_OVERLAP', 0.15),
  // Condensation history caps (DECISIONS.md §6): last N turns AND a replayed-token ceiling,
  // both protecting free-tier quota. Older turns are dropped first when over the token cap.
  historyWindow: num('HISTORY_WINDOW', 3),
  condenseMaxHistoryTokens: num('CONDENSE_MAX_HISTORY_TOKENS', 800),

  // OpenRouter attribution headers (shown on their dashboard).
  appTitle: 'HR Assistant',
  appUrl: str('APP_URL', 'http://localhost:3000'),
} as const

export function hasApiKey(): boolean {
  return config.openRouterApiKey.length > 0
}

/**
 * Resolve a client-supplied model id to a model we will actually call. The picker
 * lets users choose, but the wire value is untrusted — anything not in `CHAT_MODELS`
 * (a garbage slug, an arbitrary model the client tried to smuggle in, a non-string)
 * falls back to the configured default. This is the allowlist guard for the chat route.
 */
export function resolveChatModel(requested: unknown): string {
  return CHAT_MODELS.some((model) => model.id === requested)
    ? (requested as string)
    : config.defaultChatModel
}
