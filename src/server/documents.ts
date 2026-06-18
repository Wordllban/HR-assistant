import { createServerFn } from '@tanstack/react-start'
import { sql as dsql } from 'drizzle-orm'
import { db } from '#/lib/db'
import { chunks, documents } from '#/lib/db/schema'

/** One row in the read-only knowledge-base panel. */
export interface KnowledgeBaseDocument {
  name: string
  sourceType: string
  chunkCount: number
}

/**
 * List the seeded, ready documents with their chunk counts for the read-only
 * Knowledge Base panel (DECISIONS.md §8). Only `ready` documents are surfaced —
 * a `processing`/`failed` row is not part of the answerable corpus. Read-only:
 * the serving layer never writes (DECISIONS.md §9).
 */
export const listDocuments = createServerFn({ method: 'GET' }).handler(
  async (): Promise<KnowledgeBaseDocument[]> => {
    const rows = await db
      .select({
        name: documents.name,
        sourceType: documents.sourceType,
        chunkCount: dsql<number>`count(${chunks.id})::int`,
      })
      .from(documents)
      .leftJoin(chunks, dsql`${chunks.documentId} = ${documents.id}`)
      .where(dsql`${documents.status} = 'ready'`)
      .groupBy(documents.id, documents.name, documents.sourceType)
      .orderBy(documents.name)

    return rows.map((row) => ({
      name: row.name,
      sourceType: row.sourceType,
      chunkCount: Number(row.chunkCount),
    }))
  },
)
