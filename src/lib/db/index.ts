import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { config } from '#/lib/config'
import * as schema from './schema'

/**
 * Single shared postgres connection + Drizzle client. The serving layer only ever
 * reads; ingestion writes via the same client from the decoupled seed job
 * (DECISIONS.md §9).
 */
const client = postgres(config.databaseUrl)

export const db = drizzle(client, { schema })
export { client as sql }
export * from './schema'
