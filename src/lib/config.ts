/**
 * Centralized, env-driven configuration. Every tunable RAG/model knob lives here
 * so it can be changed without touching pipeline code (see DECISIONS.md §1, §3, §7).
 *
 * Server-only: reads process.env. Do not import into client-only modules.
 */

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
  historyWindow: num('HISTORY_WINDOW', 3),

  // OpenRouter attribution headers (shown on their dashboard).
  appTitle: 'HR Assistant',
  appUrl: str('APP_URL', 'http://localhost:3000'),
} as const

export function hasApiKey(): boolean {
  return config.openRouterApiKey.length > 0
}

/**
 * Models surfaced in the in-UI picker. `free` models work on a $0 key; `premium`
 * ones require OpenRouter credit and are marked as such in the UI (DECISIONS.md §15).
 */
export interface ChatModelOption {
  id: string
  label: string
  tier: 'free' | 'premium'
}

export const CHAT_MODELS: ChatModelOption[] = [
  { id: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B (free)', tier: 'free' },
  { id: 'openai/gpt-oss-20b:free', label: 'GPT-OSS 20B (free)', tier: 'free' },
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)', tier: 'free' },
  { id: 'qwen/qwen3-next-80b-a3b-instruct:free', label: 'Qwen3 Next 80B (free)', tier: 'free' },
  { id: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super 120B (free)', tier: 'free' },
  { id: 'anthropic/claude-sonnet-4.6', label: 'Claude Sonnet 4.6', tier: 'premium' },
  { id: 'openai/gpt-5', label: 'GPT-5', tier: 'premium' },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', tier: 'premium' },
]
