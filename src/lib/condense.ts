/**
 * Lazy conversational query condensation (DECISIONS.md §6, Layer #5).
 *
 * A bare follow-up ("what about part-time employees?") retrieves the wrong chunks because
 * it has no standalone meaning. When prior history exists we run one free-model call to
 * rewrite the follow-up + a capped history window into a self-contained query, then embed
 * and retrieve on that. The first message in a thread has no history, so it skips the call
 * entirely — keeping the common case fast and free.
 *
 * The actual model call is injected (`rewrite`) so this stays a pure, network-free unit;
 * the chat route wires in the real OpenRouter completion.
 */
import { config } from '#/lib/config'
import { countTokens } from '#/lib/ingest/chunk'

export interface ConversationTurn {
  role: 'user' | 'assistant'
  content: string
}

/** Rewrites a follow-up + windowed history into a standalone query. */
export type Rewrite = (history: ConversationTurn[], question: string) => Promise<string>

/**
 * Produce the retrieval query for `question`. With no prior history the question is
 * returned unchanged (no model call). Otherwise the last `window` turns and the question
 * are rewritten into a standalone query; an empty rewrite falls back to the question.
 */
export async function condenseQuery(
  history: ConversationTurn[],
  question: string,
  rewrite: Rewrite,
  window: number = config.historyWindow,
): Promise<string> {
  if (history.length === 0) return question
  const windowed = window > 0 ? history.slice(-window) : history
  const rewritten = (await rewrite(windowed, question)).trim()
  return rewritten.length > 0 ? rewritten : question
}

/**
 * Build the single-shot prompt handed to the condensing model. The transcript keeps the
 * most recent turns that fit `maxHistoryTokens` (oldest dropped first) — the second cap,
 * after the message-count window, that protects free-tier quota. The newest turn is always
 * kept even if it alone exceeds the budget.
 */
export function buildCondensePrompt(
  history: ConversationTurn[],
  question: string,
  maxHistoryTokens: number = config.condenseMaxHistoryTokens,
): string {
  const kept: ConversationTurn[] = []
  let tokens = 0
  for (let index = history.length - 1; index >= 0; index--) {
    const turn = history[index]
    const cost = countTokens(turn.content)
    if (kept.length > 0 && tokens + cost > maxHistoryTokens) break
    kept.unshift(turn)
    tokens += cost
  }

  const transcript = kept
    .map((turn) => `${turn.role === 'user' ? 'User' : 'Assistant'}: ${turn.content}`)
    .join('\n')

  return [
    'Given the conversation so far and a follow-up question, rewrite the follow-up as a',
    'standalone question understandable without the conversation. Preserve the original',
    'intent and keep it concise. Reply with ONLY the rewritten question, nothing else.',
    '',
    'Conversation:',
    transcript,
    '',
    `Follow-up question: ${question}`,
    '',
    'Standalone question:',
  ].join('\n')
}
