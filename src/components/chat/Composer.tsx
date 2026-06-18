import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

interface ComposerProps {
  onSend: (text: string) => void
  onStop: () => void
  disabled: boolean
  isLoading: boolean
}

export function Composer({ onSend, onStop, disabled, isLoading }: ComposerProps) {
  const [value, setValue] = useState('')

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
      className="flex items-end gap-2"
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
        className="max-h-40 min-h-[2.75rem] flex-1 resize-none"
      />
      {isLoading ? (
        <Button type="button" variant="outline" onClick={onStop}>
          Stop
        </Button>
      ) : (
        <Button type="submit" disabled={disabled || !value.trim()}>
          Send
        </Button>
      )}
    </form>
  )
}
