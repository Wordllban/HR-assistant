/**
 * Minimal, transparent migration runner: applies every `drizzle/*.sql` file once, in
 * filename order, tracked in a `_migrations` table. Idempotent — re-running is a no-op.
 *
 * Run via `pnpm db:migrate`. In the decoupled deployment model this runs as a one-off
 * job before serving (DECISIONS.md §9), never on the app's hot path.
 */
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import postgres from 'postgres'

const databaseUrl = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/hr_assistant'

async function main() {
  const sql = postgres(databaseUrl, { max: 1 })
  try {
    await sql`CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`

    const dir = path.join(process.cwd(), 'drizzle')
    const files = (await readdir(dir)).filter((file) => file.endsWith('.sql')).sort()

    for (const file of files) {
      const [{ exists }] = await sql<{ exists: boolean }[]>`
        SELECT EXISTS(SELECT 1 FROM _migrations WHERE name = ${file}) AS exists
      `
      if (exists) {
        console.log(`↳ skip   ${file} (already applied)`)
        continue
      }
      const contents = await readFile(path.join(dir, file), 'utf8')
      await sql.begin(async (tx) => {
        await tx.unsafe(contents)
        await tx`INSERT INTO _migrations (name) VALUES (${file})`
      })
      console.log(`✓ apply  ${file}`)
    }
    console.log('Migrations up to date.')
  } finally {
    await sql.end()
  }
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
