import { Clock, Coins } from 'lucide-react'
import type { MessageMeta as MessageMetaData } from '@/lib/citation'

interface MessageMetaProps {
  meta: MessageMetaData | undefined
}

/** Format milliseconds as a compact "1.8s" / "640ms" readout. */
function formatLatency(latencyMs: number): string {
  return latencyMs >= 1000 ? `${(latencyMs / 1000).toFixed(1)}s` : `${Math.round(latencyMs)}ms`
}

/**
 * Per-message observability readout (#6): turn latency and, when the provider reports it,
 * total token usage. Rendered under a finished assistant answer.
 */
export function MessageMeta({ meta }: MessageMetaProps) {
  if (!meta) return null

  return (
    <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1">
        <Clock className="size-3" />
        {formatLatency(meta.latencyMs)}
      </span>
      {meta.totalTokens !== undefined && (
        <span className="inline-flex items-center gap-1">
          <Coins className="size-3" />
          {meta.totalTokens.toLocaleString()} tokens
          {meta.promptTokens !== undefined && meta.completionTokens !== undefined && (
            <span className="opacity-70">
              ({meta.promptTokens.toLocaleString()} in / {meta.completionTokens.toLocaleString()} out)
            </span>
          )}
        </span>
      )}
    </div>
  )
}
