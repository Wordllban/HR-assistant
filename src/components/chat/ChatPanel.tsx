import { useRef, useState } from 'react'
import { fetchServerSentEvents, useChat } from '@tanstack/ai-react'
import type { UIMessage } from '@tanstack/ai'
import type { Citation } from '@/lib/citation'
import { Card } from '@/components/ui/card'
import { Composer } from './Composer'
import { MessageList } from './MessageList'
import { NoKeyBanner } from './NoKeyBanner'

interface ChatPanelProps {
  hasKey: boolean
}

export function ChatPanel({ hasKey }: ChatPanelProps) {
  const [citationsByMessage, setCitationsByMessage] = useState<
    Record<string, Array<Citation>>
  >({})
  // Citations arrive as a trailing CUSTOM event before the run's terminal frame, with no
  // message id of their own — stash them, then bind to the assistant message in onFinish.
  const pendingCitations = useRef<Array<Citation>>([])

  const { messages, sendMessage, isLoading, stop, error } = useChat({
    connection: fetchServerSentEvents('/api/chat'),
    onCustomEvent: (eventType, data) => {
      if (eventType === 'citations') {
        pendingCitations.current = (data as Array<Citation>) ?? []
      }
    },
    onFinish: (message: UIMessage) => {
      const citations = pendingCitations.current
      pendingCitations.current = []
      setCitationsByMessage((prev) => ({ ...prev, [message.id]: citations }))
    },
  })

  return (
    <Card className="flex h-[calc(100vh-12rem)] min-h-[28rem] flex-col gap-3 p-5 sm:p-6">
      {!hasKey && <NoKeyBanner />}

      <MessageList
        messages={messages}
        isLoading={isLoading}
        citationsByMessage={citationsByMessage}
      />

      {error && hasKey && (
        <p className="m-0 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error.message}
        </p>
      )}

      <Composer onSend={sendMessage} onStop={stop} disabled={!hasKey} isLoading={isLoading} />
    </Card>
  )
}
