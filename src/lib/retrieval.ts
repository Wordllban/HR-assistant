/**
 * Top-k cosine retrieval over the HNSW `halfvec` index (DECISIONS.md §7, §11).
 *
 * Embeds the query with the same model used at ingest, then ranks chunks by cosine
 * similarity. This module stops at returning ranked chunks — the similarity floor and
 * grounded prompting that turn these into grounded answers land in #3.
 */
import { config } from '#/lib/config'
import { sql } from '#/lib/db'
import { embedText } from '#/lib/openrouter'

export interface RetrievedChunk {
  documentId: string
  documentName: string
  chunkIndex: number
  /** Start page for PDF chunks; null for plain-text sources. */
  page: number | null
  content: string
  /** Cosine similarity in [0, 1] (1 = identical direction). */
  score: number
}

/** Retrieve the `topK` chunks most similar to `query`, highest score first. */
export async function retrieve(
  query: string,
  topK: number = config.retrievalTopK,
): Promise<RetrievedChunk[]> {
  const vector = await embedText(query)
  const literal = `[${vector.join(',')}]`

  // `<=>` is pgvector cosine distance; similarity = 1 - distance. Ordering by the raw
  // distance lets the HNSW index serve the query.
  const rows = await sql<
    Array<{
      document_id: string
      document_name: string
      chunk_index: number
      page: number | null
      content: string
      score: number
    }>
  >`
    SELECT
      c.document_id,
      d.name AS document_name,
      c.chunk_index,
      c.page,
      c.content,
      1 - (c.embedding <=> ${literal}::halfvec) AS score
    FROM chunks c
    JOIN documents d ON d.id = c.document_id
    ORDER BY c.embedding <=> ${literal}::halfvec
    LIMIT ${topK}
  `

  return rows.map((row) => ({
    documentId: row.document_id,
    documentName: row.document_name,
    chunkIndex: row.chunk_index,
    page: row.page,
    content: row.content,
    score: Number(row.score),
  }))
}
