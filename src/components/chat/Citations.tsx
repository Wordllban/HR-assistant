import { FileText } from 'lucide-react'
import type { Citation } from '@/lib/citation'
import { Badge } from '@/components/ui/badge'

interface CitationsProps {
  citations: Array<Citation>
}

/** Source cards rendered under a grounded assistant answer (DECISIONS.md §8). */
export function Citations({ citations }: CitationsProps) {
  if (citations.length === 0) return null

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <p className="m-0 text-xs font-medium text-muted-foreground">Sources</p>
      <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
        {citations.map((citation, index) => (
          <li
            key={`${citation.documentName}-${citation.page}-${index}`}
            className="rounded-lg border bg-muted/40 px-3 py-2 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-1.5 font-medium">
                <FileText className="size-3 shrink-0 text-muted-foreground" />
                <span className="truncate">{citation.documentName}</span>
                {citation.page !== null && (
                  <span className="shrink-0 text-muted-foreground">p.{citation.page}</span>
                )}
              </span>
              <Badge variant="secondary" className="shrink-0 font-mono">
                {citation.score.toFixed(2)}
              </Badge>
            </div>
            <p className="m-0 mt-1 line-clamp-2 text-muted-foreground">{citation.snippet}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
