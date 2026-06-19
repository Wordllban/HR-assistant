/**
 * Health check for the `/health` route (DECISIONS.md §13, Layer #6).
 *
 * Liveness alone is cheap (the process is answering), but a RAG service is only useful
 * when its vector index is reachable AND populated — an empty index silently answers
 * "I don't have that information" to everything. So readiness probes the DB for a chunk
 * count: reachable + populated → ok; reachable + empty → degraded; unreachable → down.
 *
 * The DB probe is injected so this stays a pure, network-free unit; the route wires in the
 * real `SELECT count(*) FROM chunks`.
 */

export type HealthStatus = 'ok' | 'degraded' | 'down'

export interface HealthReport {
  status: HealthStatus
  database: 'up' | 'down'
  /** Number of indexed chunks; 0 when the DB is up but unseeded, or unreachable. */
  chunks: number
  error?: string
}

/** Probe returns the number of indexed chunks; rejects when the DB is unreachable. */
export type ChunkCountProbe = () => Promise<number>

/** Derive the readiness report from a chunk-count probe (never throws). */
export async function checkHealth(probe: ChunkCountProbe): Promise<HealthReport> {
  try {
    const chunks = await probe()
    return {
      status: chunks > 0 ? 'ok' : 'degraded',
      database: 'up',
      chunks,
    }
  } catch (err) {
    return {
      status: 'down',
      database: 'down',
      chunks: 0,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

/** 200 only when fully ready; any degraded/down state is 503 so probes can gate traffic. */
export function healthHttpStatus(report: HealthReport): number {
  return report.status === 'ok' ? 200 : 503
}
