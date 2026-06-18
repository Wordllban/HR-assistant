import { FileText, Library } from 'lucide-react'
import type { KnowledgeBaseDocument } from '@/server/documents'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
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
  return (
    <Card className="flex h-full flex-col gap-3 p-5">
      <div className="flex items-center gap-2">
        <Library className="size-4 text-muted-foreground" />
        <h2 className="m-0 text-sm font-semibold tracking-tight">Knowledge base</h2>
        <Badge variant="secondary" className="ml-auto font-mono">
          {documents.length}
        </Badge>
      </div>
      <p className="m-0 text-xs text-muted-foreground">
        Answers are grounded only in these documents.
      </p>

      {documents.length === 0 ? (
        <p className="m-0 rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
          No documents indexed yet. Run <span className="font-mono">pnpm seed</span>.
        </p>
      ) : (
        <ScrollArea className="-mr-2 min-h-0 flex-1 pr-2">
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {documents.map((document) => (
              <li
                key={document.name}
                className="flex items-center gap-2.5 rounded-lg border bg-muted/30 px-3 py-2"
              >
                <FileText className="size-4 shrink-0 text-muted-foreground" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-xs font-medium">{prettyName(document.name)}</span>
                  <span className="truncate text-[11px] text-muted-foreground">
                    {document.sourceType.toUpperCase()} · {document.chunkCount} chunks
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    </Card>
  )
}
