/**
 * Seed the vector store from the bundled corpus (DECISIONS.md §9). Thin CLI wrapper over
 * the shared `ingest()` pipeline — reads every file in `corpus/`, classifies by
 * extension, and ingests. Idempotent: re-running re-embeds nothing already `ready`.
 *
 * Run via `pnpm seed` (after `pnpm db:migrate`). In the decoupled deployment model this
 * runs as a one-off job before serving, never on the app's hot path.
 */
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { ingest, type IngestSource } from '#/lib/ingest/ingest'
import { logger } from '#/lib/logger'
import { sql } from '#/lib/db'

const CORPUS_DIR = path.join(process.cwd(), 'corpus')
const TEXT_EXTENSIONS = new Set(['.txt', '.md'])

async function main() {
  const entries = (await readdir(CORPUS_DIR)).filter((file) => !file.startsWith('.')).sort()
  if (entries.length === 0) {
    logger.warn({ dir: CORPUS_DIR }, 'corpus is empty — nothing to seed')
    return
  }

  const sources: IngestSource[] = []
  for (const file of entries) {
    const ext = path.extname(file).toLowerCase()
    const abs = path.join(CORPUS_DIR, file)
    if (ext === '.pdf') {
      sources.push({ name: file, data: new Uint8Array(await readFile(abs)), sourceType: 'pdf' })
    } else if (TEXT_EXTENSIONS.has(ext)) {
      sources.push({ name: file, data: await readFile(abs, 'utf8'), sourceType: 'text' })
    } else {
      logger.warn({ file }, 'unsupported extension, skipping')
    }
  }

  logger.info({ count: sources.length }, 'seeding corpus')
  const results = await ingest(sources)

  const totals = results.reduce(
    (acc, result) => {
      acc[result.status] += 1
      acc.chunks += result.chunks
      return acc
    },
    { ready: 0, skipped: 0, failed: 0, chunks: 0 },
  )

  for (const result of results) {
    const line = `${result.status.padEnd(7)} ${result.name}${result.chunks ? ` (${result.chunks} chunks)` : ''}`
    if (result.status === 'failed') logger.error({ err: result.error }, line)
    else logger.info(line)
  }
  logger.info(totals, 'seed complete')

  if (totals.failed > 0) process.exitCode = 1
}

main()
  .catch((err) => {
    logger.error({ err }, 'seed failed')
    process.exitCode = 1
  })
  .finally(() => sql.end())
