import { useState } from 'react'
import { ChevronDown, FileText } from 'lucide-react'
import type { Citation } from '@/lib/citation'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface CitationsProps {
  citations: Array<Citation>
}

/**
 * Source cards rendered under a grounded assistant answer (DECISIONS.md §8), collapsed
 * into a drawer that's closed by default so answers stay clean — one click reveals the
 * documents and relevance scores the answer was grounded in.
 */
export function Citations({ citations }: CitationsProps) {
  const [open, setOpen] = useState(false)

  if (citations.length === 0) return null

  return (
    <div className="rounded-xl border border-border/70 bg-muted/30">
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground transition hover:text-[var(--sea-ink)]"
      >
        <FileText className="size-3.5 shrink-0" />
        <span>Sources</span>
        <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 font-mono text-[0.65rem] text-primary">
          {citations.length}
        </span>
        <ChevronDown
          className={cn(
            'ml-auto size-4 shrink-0 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <ul className="m-0 flex list-none flex-col gap-1.5 px-2 pb-2 pt-0">
          {citations.map((citation, index) => (
            <li
              key={`${citation.documentName}-${citation.page}-${index}`}
              className="rounded-lg border border-border/70 bg-card/60 px-3 py-2.5 text-xs"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary/10 font-mono text-[0.7rem] font-semibold text-primary">
                  {index + 1}
                </span>
                <span className="flex min-w-0 flex-1 items-center gap-1.5 font-medium text-[var(--sea-ink)]">
                  <FileText className="size-3 shrink-0 text-muted-foreground" />
                  <span className="truncate">{citation.documentName}</span>
                  {citation.page !== null && (
                    <span className="shrink-0 text-muted-foreground">p.{citation.page}</span>
                  )}
                </span>
                <Badge variant="secondary" className="shrink-0 font-mono text-[0.7rem]">
                  {citation.score.toFixed(2)}
                </Badge>
              </div>
              <p className="m-0 mt-1.5 line-clamp-2 pl-7 text-muted-foreground">
                {citation.snippet}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
