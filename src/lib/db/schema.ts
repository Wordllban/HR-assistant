import { customType, integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

/**
 * pgvector `halfvec` column (16-bit floats). We use halfvec, not `vector`, because the
 * Nemotron embedder outputs 2048-d which exceeds pgvector's 2000-d index ceiling on
 * `vector`; halfvec indexes up to 4000 dims (DECISIONS.md §5).
 *
 * Stored/queried as the pgvector text form `[0.1,0.2,...]`.
 */
export const halfvec = customType<{ data: number[]; driverData: string; config: { dimensions: number } }>({
  dataType(config) {
    return `halfvec(${config?.dimensions ?? 2048})`
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`
  },
  fromDriver(value: string): number[] {
    return value
      .slice(1, -1)
      .split(',')
      .map(Number)
  },
})

/** One ingested source document. A document is either fully indexed (`ready`) or not present. */
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  sourceType: text('source_type').notNull(), // 'pdf' | 'text'
  status: text('status').notNull().default('processing'), // 'processing' | 'ready' | 'failed'
  error: text('error'),
  contentHash: text('content_hash').notNull(), // idempotency guard (DECISIONS.md §9)
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

/** A retrievable chunk with its embedding and citation metadata (DECISIONS.md §11). */
export const chunks = pgTable('chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .notNull()
    .references(() => documents.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  page: integer('page'), // start page for PDFs; null for text (DECISIONS.md §12)
  embedding: halfvec('embedding', { dimensions: 2048 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
export type Chunk = typeof chunks.$inferSelect
export type NewChunk = typeof chunks.$inferInsert
