import { FileText, Library } from 'lucide-react'
import type { KnowledgeBaseDocument } from '@/server/documents'
import { ScrollArea } from '@/components/ui/scroll-area'

interface KnowledgeBasePanelProps {
  documents: Array<KnowledgeBaseDocument>
}

/** Strip the leading numeric prefix and extension for a readable title. */
function prettyName(name: string): string {
  return name
    .replace(/\.[^.]+$/, '')
    .replace(/^\d+[-_]?/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

/**
 * Read-only view of the seeded corpus the assistant answers from. Makes the
 * grounding boundary visible: these are the only documents in scope (DECISIONS.md §8).
 */
export function KnowledgeBasePanel({ documents }: KnowledgeBasePanelProps) {
  const totalChunks = documents.reduce((sum, document) => sum + document.chunkCount, 0)

  return (
    <div className="panel flex h-full w-full flex-col overflow-hidden">
      <div className="flex flex-col gap-1 border-b border-border/60 px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Library className="size-4" />
          </span>
          <h2 className="m-0 text-sm font-semibold tracking-tight text-[var(--sea-ink)]">
            Knowledge base
          </h2>
          <span className="ml-auto rounded-full bg-secondary px-2 py-0.5 font-mono text-[11px] font-medium text-secondary-foreground">
            {documents.length}
          </span>
        </div>
        <p className="m-0 text-xs leading-relaxed text-muted-foreground">
          Answers are grounded only in these {documents.length} documents
          {totalChunks > 0 && <> · {totalChunks} indexed chunks</>}.
        </p>
      </div>

      {documents.length === 0 ? (
        <p className="m-3 rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
          No documents indexed yet. Run <span className="font-mono">pnpm seed</span>.
        </p>
      ) : (
        <ScrollArea className="min-h-0 flex-1">
          <ul className="m-0 flex list-none flex-col gap-1.5 p-3">
            {documents.map((document) => (
              <li
                key={document.name}
                className="flex items-center gap-2.5 rounded-xl border border-border/70 bg-card/50 px-3 py-2.5 transition hover:border-primary/30 hover:bg-accent/60"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <FileText className="size-4" />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-medium text-[var(--sea-ink)]">
                    {prettyName(document.name)}
                  </span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {document.sourceType.toUpperCase()} · {document.chunkCount} chunks
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </div>
  )
}
