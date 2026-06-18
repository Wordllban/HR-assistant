/**
 * Chat model catalogue — pure data, safe to import from client components.
 *
 * Kept out of `config.ts` (which reads `process.env` and is server-only) so the
 * picker UI can render the list without pulling server config into the client
 * bundle. The server's allowlist guard (`resolveChatModel`) validates against the
 * same list (DECISIONS.md §15).
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
