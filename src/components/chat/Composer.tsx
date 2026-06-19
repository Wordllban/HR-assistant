import { useState } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface ComposerProps {
  onSend: (text: string) => void
  onStop: () => void
  disabled: boolean
  isLoading: boolean
}

export function Composer({ onSend, onStop, disabled, isLoading }: ComposerProps) {
  const [value, setValue] = useState('')
  const canSend = value.trim().length > 0 && !disabled && !isLoading

  function submit() {
    const text = value.trim()
    if (!text || disabled || isLoading) return
    onSend(text)
    setValue('')
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
    >
      <div
        className={cn(
          'flex items-end gap-2 rounded-2xl border border-input bg-card/60 px-2.5 py-2 shadow-sm transition focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/40',
          disabled && 'opacity-70',
        )}
      >
        <Textarea
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              submit()
            }
          }}
          rows={1}
          disabled={disabled}
          placeholder={disabled ? 'Add an API key to start chatting…' : 'Ask about HR policies…'}
          className="max-h-40 min-h-[2.25rem] flex-1 resize-none border-0 bg-transparent px-1.5 py-1.5 shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent"
        />
        {isLoading ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop generating"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground transition hover:bg-accent"
          >
            <Square className="size-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={!canSend}
            aria-label="Send message"
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-40"
          >
            <ArrowUp className="size-[18px]" />
          </button>
        )}
      </div>
      <p className="mt-2 px-1 text-[0.7rem] text-muted-foreground">
        <kbd className="font-sans font-medium text-[var(--sea-ink-soft)]">Enter</kbd> to send ·{' '}
        <kbd className="font-sans font-medium text-[var(--sea-ink-soft)]">Shift</kbd> +{' '}
        <kbd className="font-sans font-medium text-[var(--sea-ink-soft)]">Enter</kbd> for a new line
      </p>
    </form>
  )
}
