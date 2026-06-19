import { ArrowUpRight } from 'lucide-react'
import { SUGGESTED_QUESTIONS } from '@/lib/suggested-questions'

interface SuggestedQuestionsProps {
  onPick: (question: string) => void
  disabled?: boolean
}

/** Clickable starter prompts for the empty state; picking one sends it. */
export function SuggestedQuestions({ onPick, disabled }: SuggestedQuestionsProps) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="brand-mark flex size-12 items-center justify-center rounded-2xl">
          <span className="size-4 rotate-45 rounded-[3px] bg-white/90" />
        </span>
        <div>
          <h2 className="m-0 text-xl font-bold tracking-tight text-[var(--sea-ink)]">
            How can I help with HR?
          </h2>
          <p className="m-0 mt-1.5 text-sm text-muted-foreground">
            Ask anything about company policies — every answer is grounded in your knowledge
            base and cites its sources.
          </p>
        </div>
      </div>

      <ul className="m-0 grid w-full list-none grid-cols-1 gap-2 p-0 sm:grid-cols-2">
        {SUGGESTED_QUESTIONS.map((question) => (
          <li key={question}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(question)}
              className="group flex h-full w-full items-center gap-2 rounded-xl border border-border bg-card/70 px-3.5 py-3 text-left text-sm text-[var(--sea-ink)] shadow-sm transition hover:border-primary/40 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="flex-1 leading-snug">{question}</span>
              <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
