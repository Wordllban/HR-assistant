/**
 * Grounding: turn ranked retrieval hits into a grounded answer (DECISIONS.md §8).
 *
 * The retrieval layer (`retrieve`) ranks chunks by cosine similarity but never decides
 * whether any are *relevant enough* to answer from. This module applies the similarity
 * floor — the guardrail that keeps the assistant from answering off-corpus questions.
 */
import type { RetrievedChunk } from '#/lib/retrieval'
import type { Citation } from '#/lib/citation'

export type { Citation }

export interface FloorResult {
  /** True when at least one chunk cleared the floor. */
  inScope: boolean
  /** Chunks at or above the floor, in the input order (highest score first). */
  chunks: RetrievedChunk[]
}

/** Keep chunks scoring at or above `minScore`; in-scope when any survive. */
export function applyFloor(scored: RetrievedChunk[], minScore: number): FloorResult {
  const chunks = scored.filter((chunk) => chunk.score >= minScore)
  return { inScope: chunks.length > 0, chunks }
}

/** A chat message in the grounded prompt sent to the model. */
export interface GroundedMessage {
  role: 'system' | 'user'
  content: string
}

const GROUNDED_SYSTEM_PROMPT = [
  'You are an HR assistant. Answer the employee question using ONLY the numbered context',
  'passages below. Cite the sources you used with their bracketed numbers, e.g. [1].',
  'If the context does not contain the answer, say you do not have that information in the',
  'HR documents — do not use outside knowledge or guess.',
].join(' ')

// When retrieval surfaces nothing above the floor, the model gets no context at all and
// is told to decline outright. This is the off-corpus guardrail (DECISIONS.md §8).
const NO_CONTEXT_SYSTEM_PROMPT = [
  'You are an HR assistant. No relevant passages were found in the HR documents for this',
  'question. Tell the employee you do not have that information in the HR documents and',
  'cannot answer it. Do not use outside knowledge or guess.',
].join(' ')

/** Render retrieved chunks as a numbered, citable context block. */
function contextBlock(chunks: RetrievedChunk[]): string {
  return chunks
    .map((chunk, index) => {
      const where =
        chunk.page === null ? chunk.documentName : `${chunk.documentName} (p.${chunk.page})`
      return `[${index + 1}] ${where}: ${chunk.content}`
    })
    .join('\n\n')
}

/**
 * Assemble the grounded prompt: a system message stating the grounding rules and the
 * retrieved context, followed by the user's question.
 */
export function buildGroundedMessages(
  question: string,
  chunks: RetrievedChunk[],
): GroundedMessage[] {
  const system =
    chunks.length === 0
      ? NO_CONTEXT_SYSTEM_PROMPT
      : `${GROUNDED_SYSTEM_PROMPT}\n\nContext:\n${contextBlock(chunks)}`
  return [
    { role: 'system', content: system },
    { role: 'user', content: question },
  ]
}

/** Max characters of chunk content shown in a citation card before truncation. */
const SNIPPET_MAX_CHARS = 240

/** Collapse whitespace and cap to `SNIPPET_MAX_CHARS`, appending an ellipsis if cut. */
function toSnippet(content: string): string {
  const text = content.replace(/\s+/g, ' ').trim()
  if (text.length <= SNIPPET_MAX_CHARS) return text
  return `${text.slice(0, SNIPPET_MAX_CHARS).trimEnd()}…`
}

/**
 * Build citation cards from retrieved chunks, deduped by document + page so the same
 * page never appears twice. The highest-scoring chunk wins the slot (its snippet and
 * score), and the original (score-descending) order is preserved.
 */
export function toCitations(chunks: RetrievedChunk[]): Citation[] {
  const byKey = new Map<string, Citation>()
  for (const chunk of chunks) {
    const key = `${chunk.documentName} :: ${chunk.page}`
    const existing = byKey.get(key)
    if (!existing || chunk.score > existing.score) {
      byKey.set(key, {
        documentName: chunk.documentName,
        page: chunk.page,
        snippet: toSnippet(chunk.content),
        score: chunk.score,
      })
    }
  }
  return [...byKey.values()]
}
