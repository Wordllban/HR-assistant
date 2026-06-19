/**
 * Per-turn observability for the chat pipeline (DECISIONS.md §13, Layer #6).
 *
 * One structured pino log per chat turn, correlated by a requestId, capturing what was
 * asked, whether condensation ran, which chunks were retrieved (id + doc + score), the
 * model, token usage and per-stage latency (condense / embed / retrieve / generate). The
 * record is assembled here as a pure function so it is unit-testable without a live stream
 * or DB; the chat route feeds it the measured timings and the usage pulled off the stream.
 */
import type { StreamChunk, TokenUsage } from '@tanstack/ai'
import type { RetrievedChunk } from '#/lib/retrieval'

/** Per-stage wall-clock latency in milliseconds. `condenseMs`/`generateMs` are optional
 * because the first message skips condensation and an off-corpus turn may not generate. */
export interface TurnTimings {
  condenseMs?: number
  embedMs: number
  retrieveMs: number
  generateMs?: number
  totalMs: number
}

export interface TurnLogInput {
  requestId: string
  question: string
  retrievalQuery: string
  condensed: boolean
  historyTurns: number
  model: string
  /** All chunks returned by retrieval (pre-floor), highest score first. */
  retrieved: RetrievedChunk[]
  /** Chunks that cleared the similarity floor. */
  kept: RetrievedChunk[]
  inScope: boolean
  timings: TurnTimings
  usage?: TokenUsage
}

/** Token usage rides out on the terminal RUN_FINISHED frame; pull it off when present. */
export function extractUsage(chunk: StreamChunk): TokenUsage | undefined {
  if (chunk.type === 'RUN_FINISHED' && 'usage' in chunk) {
    return (chunk as { usage?: TokenUsage }).usage
  }
  return undefined
}

/** Round to whole milliseconds — sub-ms precision is noise in a turn-level log. */
function ms(value: number): number {
  return Math.round(value)
}

/** Round a similarity score to three decimals for a readable log. */
function score(value: number): number {
  return Math.round(value * 1000) / 1000
}

/**
 * Assemble the single structured record logged for a chat turn. Retrieved chunks are
 * flattened to `{ id, doc, page, score }` so the log shows the ranking and the floor
 * decision (retrieved vs kept) without dumping chunk text.
 */
export function buildTurnLog(input: TurnLogInput): Record<string, unknown> {
  const timings: Record<string, number> = {
    embedMs: ms(input.timings.embedMs),
    retrieveMs: ms(input.timings.retrieveMs),
    totalMs: ms(input.timings.totalMs),
  }
  if (input.timings.condenseMs !== undefined) timings.condenseMs = ms(input.timings.condenseMs)
  if (input.timings.generateMs !== undefined) timings.generateMs = ms(input.timings.generateMs)

  return {
    requestId: input.requestId,
    question: input.question,
    retrievalQuery: input.retrievalQuery,
    condensed: input.condensed,
    historyTurns: input.historyTurns,
    model: input.model,
    retrieved: input.retrieved.length,
    kept: input.kept.length,
    inScope: input.inScope,
    chunks: input.retrieved.map((hit) => ({
      id: `${hit.documentId}#${hit.chunkIndex}`,
      doc: hit.documentName,
      page: hit.page,
      score: score(hit.score),
    })),
    timings,
    usage: input.usage
      ? {
          promptTokens: input.usage.promptTokens,
          completionTokens: input.usage.completionTokens,
          totalTokens: input.usage.totalTokens,
        }
      : undefined,
  }
}
