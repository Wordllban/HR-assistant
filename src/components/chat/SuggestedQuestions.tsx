import { ArrowUpRight, Sparkles } from 'lucide-react'
import { SUGGESTED_QUESTIONS } from '@/lib/suggested-questions'

interface SuggestedQuestionsProps {
  onPick: (question: string) => void
  disabled?: boolean
}

/** Clickable starter prompts for the empty state; picking one sends it. */
export function SuggestedQuestions({ onPick, disabled }: SuggestedQuestionsProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 text-center">
      <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Sparkles className="size-5" />
      </span>
      <div>
        <p className="m-0 text-sm font-medium">Ask about your HR policies</p>
        <p className="m-0 text-xs text-muted-foreground">
          Grounded answers with citations from the knowledge base.
        </p>
      </div>
      <ul className="m-0 flex w-full list-none flex-col gap-1.5 p-0">
        {SUGGESTED_QUESTIONS.map((question) => (
          <li key={question}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(question)}
              className="group flex w-full items-center gap-2 rounded-lg border bg-card px-3 py-2 text-left text-xs transition hover:border-primary/40 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex-1">{question}</span>
              <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground transition group-hover:text-primary" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
