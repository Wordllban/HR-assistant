/**
 * Local-only integration test (DECISIONS.md §14, Layer #6): exercises the real
 * ingest → retrieve path against the compose Postgres + pgvector and a live embedder.
 *
 * Unlike the rest of the suite (pure, zero network/DB), this needs infrastructure and the
 * OpenRouter key, so it is env-guarded and SKIPPED by default — CI never runs it. To run:
 *
 *   docker compose up -d            # Postgres + pgvector
 *   pnpm db:migrate                 # schema
 *   RUN_DB_TESTS=1 pnpm test        # with OPENROUTER_API_KEY in .env / the environment
 */
import { afterAll, describe, expect, it } from 'vitest'
import { sql as dsql } from 'drizzle-orm'
import { db } from '#/lib/db'
import { documents } from '#/lib/db/schema'
import { ingest } from './ingest'
import { retrieve } from '#/lib/retrieval'

const enabled = process.env.RUN_DB_TESTS === '1' && Boolean(process.env.OPENROUTER_API_KEY)

// A unique marker keeps each run's content distinct (so the idempotency guard never skips)
// and makes the retrieved chunk unambiguous to assert on.
const marker = `itest-${Date.now()}`
const docName = `${marker}.txt`

describe.skipIf(!enabled)('ingest → retrieve (integration)', () => {
  afterAll(async () => {
    await db.delete(documents).where(dsql`${documents.name} = ${docName}`)
  })

  it('ingests a document and retrieves its content by semantic query', async () => {
    const body = [
      `Reference code ${marker}.`,
      'Employees accrue twenty-five days of paid annual leave per calendar year.',
      'Unused leave may carry over for up to three months into the next year.',
    ].join(' ')

    const [result] = await ingest([{ name: docName, data: body, sourceType: 'text' }])
    expect(result.status).toBe('ready')
    expect(result.chunks).toBeGreaterThan(0)

    const hits = await retrieve('How many vacation days do I get each year?')
    expect(hits.length).toBeGreaterThan(0)

    const fromDoc = hits.find((hit) => hit.documentName === docName)
    expect(fromDoc).toBeDefined()
    expect(fromDoc!.content).toContain('annual leave')
    expect(fromDoc!.score).toBeGreaterThan(0)
  }, 60_000)
})
