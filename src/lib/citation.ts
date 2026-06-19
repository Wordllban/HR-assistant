/**
 * A source reference surfaced under a grounded answer. Lives in its own module (no
 * server imports) so both the server pipeline and client UI can share the shape.
 */
export interface Citation {
  documentName: string
  /** Start page for PDF sources; null for plain text. */
  page: number | null
  /** Short preview of the cited passage. */
  snippet: string
  /** Cosine similarity of the backing chunk, in [0, 1]. */
  score: number
}

/**
 * Per-message observability readout (#6), delivered as a trailing `usage` CUSTOM event.
 * Token counts are optional because a provider may not report usage on the final frame.
 */
export interface MessageMeta {
  promptTokens?: number
  completionTokens?: number
  totalTokens?: number
  /** End-to-end turn latency in milliseconds (retrieval + generation). */
  latencyMs: number
}
