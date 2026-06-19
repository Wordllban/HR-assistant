import { createFileRoute } from '@tanstack/react-router'
import { sql } from '#/lib/db'
import { checkHealth, healthHttpStatus } from '#/lib/health'

/**
 * Liveness + readiness probe (DECISIONS.md §13). Liveness is implicit — the handler
 * responding at all proves the process is up. Readiness probes the vector index for a
 * chunk count: reachable + populated → 200 ok; reachable + empty → 503 degraded;
 * unreachable → 503 down. Suitable for a container/orchestrator health check.
 */
export const Route = createFileRoute('/health')({
  server: {
    handlers: {
      GET: async () => {
        const report = await checkHealth(async () => {
          const rows = await sql<Array<{ count: number }>>`
            SELECT count(*)::int AS count FROM chunks
          `
          return rows[0]?.count ?? 0
        })
        return Response.json(report, { status: healthHttpStatus(report) })
      },
    },
  },
})
