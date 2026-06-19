/**
 * Single OpenRouter seam for the whole app, behind one OPENROUTER_API_KEY
 * (DECISIONS.md §3). Chat goes through the @tanstack/ai OpenRouter adapter (streaming);
 * embeddings go through a thin OpenAI-compatible fetch, because @tanstack/ai-openrouter
 * ships a chat adapter only — no embeddings adapter.
 */
import { createOpenRouterText } from '@tanstack/ai-openrouter'
import { config } from '#/lib/config'

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

/** The model-slug type the SDK accepts (a fixed union); derived from the function signature. */
type OpenRouterModelSlug = Parameters<typeof createOpenRouterText>[0]

/** Build a streaming chat adapter for the given model (defaults to the configured chat model). */
export function chatAdapter(model: string = config.defaultChatModel) {
  // The SDK types `model` as a fixed slug union; OpenRouter accepts many more (incl. any
  // `:free` slug), so we widen to that union to accept arbitrary configured slugs.
  return createOpenRouterText(model as OpenRouterModelSlug, config.openRouterApiKey, {
    httpReferer: config.appUrl,
    appTitle: config.appTitle,
  })
}

/**
 * One-shot, non-streaming chat completion (used by query condensation, DECISIONS.md §6).
 * The streaming adapter is for the user-facing answer; this is a short, deterministic
 * single-call rewrite, so a plain OpenAI-compatible fetch is simpler. Temperature 0 for a
 * stable rewrite; capped output tokens since a standalone question is short.
 */
export async function complete(
  prompt: string,
  model: string = config.defaultChatModel,
  maxTokens = 256,
): Promise<string> {
  const res = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': config.appUrl,
      'X-Title': config.appTitle,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: maxTokens,
    }),
  })

  if (!res.ok) {
    throw new Error(`Completion request failed (${res.status}): ${await res.text()}`)
  }

  const json = (await res.json()) as {
    choices: Array<{ message: { content: string | null } }>
  }
  return json.choices[0]?.message?.content ?? ''
}

/**
 * Embed one or more texts in a single batched request (DECISIONS.md §4). Returns one
 * vector per input, in order.
 */
export async function embedTexts(
  texts: string[],
  model: string = config.defaultEmbeddingModel,
): Promise<number[][]> {
  if (texts.length === 0) return []

  const res = await fetch(`${OPENROUTER_BASE_URL}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.openRouterApiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': config.appUrl,
      'X-Title': config.appTitle,
    },
    body: JSON.stringify({ model, input: texts }),
  })

  if (!res.ok) {
    throw new Error(`Embeddings request failed (${res.status}): ${await res.text()}`)
  }

  const json = (await res.json()) as { data: Array<{ embedding: number[]; index: number }> }
  return json.data
    .slice()
    .sort((first, second) => first.index - second.index)
    .map((item) => item.embedding)
}

/** Embed a single text and return its vector. */
export async function embedText(text: string, model?: string): Promise<number[]> {
  const [vector] = await embedTexts([text], model)
  return vector
}
