/**
 * The shared `ingest()` pipeline (DECISIONS.md §8, §9): extract → chunk → batched embed
 * → atomic per-document store. Written once with the seed script as its first caller; a
 * future runtime upload handler will be the second (out of scope here).
 *
 * Guarantees:
 * - **Idempotent** — a document is keyed by the SHA-256 of its raw bytes/text. A second
 *   run over already-`ready` content embeds nothing and inserts nothing.
 * - **Atomic per document** — embeddings for ALL chunks are computed before any write;
 *   the document row and its chunks are then inserted in a single transaction. A
 *   mid-batch embedding failure writes no chunks and records the document as `failed`.
 */
import { createHash } from 'node:crypto'
import { sql as dsql } from 'drizzle-orm'
import { config } from '#/lib/config'
import { db } from '#/lib/db'
import { chunks as chunksTable, documents } from '#/lib/db/schema'
import { logger } from '#/lib/logger'
import { embedTexts } from '#/lib/openrouter'
import { chunkText } from './chunk'
import { extractPdf, extractText_, type SourceType } from './extract'

/** Max chunks per embedding request — keeps individual calls within free-tier limits. */
const EMBED_BATCH_SIZE = 32
/** Transient-failure retries per batch (free tier 429s a lot). */
const EMBED_MAX_RETRIES = 4

export interface IngestSource {
  /** Display name (also the citation label), e.g. `01-dress-code.pdf`. */
  name: string
  /** PDF bytes or raw text. */
  data: Uint8Array | string
  /** Defaults to `pdf` when `data` is bytes, `text` when it is a string. */
  sourceType?: SourceType
}

export type IngestStatus = 'ready' | 'skipped' | 'failed'

export interface IngestResult {
  name: string
  status: IngestStatus
  chunks: number
  error?: string
}

/** Ingest a batch of sources sequentially. Never throws — failures are per-source. */
export async function ingest(sources: IngestSource[]): Promise<IngestResult[]> {
  const results: IngestResult[] = []
  for (const source of sources) {
    results.push(await ingestOne(source))
  }
  return results
}

async function ingestOne(source: IngestSource): Promise<IngestResult> {
  const log = logger.child({ document: source.name })
  const sourceType: SourceType =
    source.sourceType ?? (typeof source.data === 'string' ? 'text' : 'pdf')
  const contentHash = hashContent(source.data)

  // Idempotency: ready → no-op; a prior failed/processing row is cleared and retried.
  const existing = await db
    .select({ id: documents.id, status: documents.status })
    .from(documents)
    .where(dsql`${documents.contentHash} = ${contentHash}`)
    .limit(1)

  if (existing[0]?.status === 'ready') {
    log.info('skip (already ingested)')
    return { name: source.name, status: 'skipped', chunks: 0 }
  }
  if (existing[0]) {
    await db.delete(documents).where(dsql`${documents.id} = ${existing[0].id}`)
  }

  // Extract + chunk (cheap, no network).
  const extracted =
    typeof source.data === 'string'
      ? extractText_(source.data)
      : await extractPdf(source.data)

  const pieces = chunkText(extracted.text, extracted.pageBoundaries, {
    maxTokens: config.chunkSize,
    overlap: config.chunkOverlap,
  })

  if (pieces.length === 0) {
    log.warn('no extractable content')
    return { name: source.name, status: 'skipped', chunks: 0 }
  }

  // Embed everything BEFORE any write, so a failure never leaves partial chunks.
  let vectors: number[][]
  try {
    vectors = await embedAll(pieces.map((piece) => piece.content))
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    log.error({ err: message }, 'embedding failed — marking document failed')
    await db.insert(documents).values({
      name: source.name,
      sourceType,
      status: 'failed',
      error: message,
      contentHash,
    })
    return { name: source.name, status: 'failed', chunks: 0, error: message }
  }

  // Atomic store: document(ready) + all chunks in one transaction.
  await db.transaction(async (tx) => {
    const [doc] = await tx
      .insert(documents)
      .values({ name: source.name, sourceType, status: 'ready', contentHash })
      .returning({ id: documents.id })

    await tx.insert(chunksTable).values(
      pieces.map((piece, index) => ({
        documentId: doc.id,
        chunkIndex: piece.chunkIndex,
        content: piece.content,
        page: piece.page,
        embedding: vectors[index],
      })),
    )
  })

  log.info({ chunks: pieces.length }, 'ingested')
  return { name: source.name, status: 'ready', chunks: pieces.length }
}

/** Embed all texts in batches, with bounded exponential-backoff retry per batch. */
async function embedAll(texts: string[]): Promise<number[][]> {
  const out: number[][] = []
  for (let index = 0; index < texts.length; index += EMBED_BATCH_SIZE) {
    const batch = texts.slice(index, index + EMBED_BATCH_SIZE)
    out.push(...(await embedWithRetry(batch)))
  }
  return out
}

async function embedWithRetry(batch: string[]): Promise<number[][]> {
  let lastError: unknown
  for (let attempt = 0; attempt < EMBED_MAX_RETRIES; attempt++) {
    try {
      return await embedTexts(batch)
    } catch (err) {
      lastError = err
      const delay = 500 * 2 ** attempt
      logger.warn({ attempt: attempt + 1, delay }, 'embedding batch failed, retrying')
      await sleep(delay)
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}

function hashContent(data: Uint8Array | string): string {
  return createHash('sha256')
    .update(typeof data === 'string' ? data : Buffer.from(data))
    .digest('hex')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
