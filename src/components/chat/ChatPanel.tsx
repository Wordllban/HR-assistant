import { useRef, useState } from 'react'
import { fetchServerSentEvents, useChat } from '@tanstack/ai-react'
import type { UIMessage } from '@tanstack/ai'
import { AlertTriangle } from 'lucide-react'
import type { Citation } from '@/lib/citation'
import { CHAT_MODELS } from '@/lib/models'
import { Card } from '@/components/ui/card'
import { Composer } from './Composer'
import { MessageList } from './MessageList'
import { ModelPicker } from './ModelPicker'
import { NoKeyBanner } from './NoKeyBanner'
import { SuggestedQuestions } from './SuggestedQuestions'

interface ChatPanelProps {
  hasKey: boolean
}

/**
 * A premium model on a $0 key fails with an OpenRouter 402 — translate that into a
 * plain hint instead of a raw upstream error string (DECISIONS.md §15).
 */
function friendlyError(message: string): string {
  if (/402|credit|insufficient|requires? more/i.test(message)) {
    return 'That model needs OpenRouter credit. Switch back to a free model, or add credit to your key.'
  }
  return message
}

export function ChatPanel({ hasKey }: ChatPanelProps) {
  const [model, setModel] = useState(CHAT_MODELS[0].id)
  // The connection must stay referentially stable (a new one recreates the chat client
  // and drops history), so the per-request body reads the model through a ref instead.
  const modelRef = useRef(model)
  modelRef.current = model

  const [citationsByMessage, setCitationsByMessage] = useState<
    Record<string, Array<Citation>>
  >({})
  // Citations arrive as a trailing CUSTOM event before the run's terminal frame, with no
  // message id of their own — stash them, then bind to the assistant message in onFinish.
  const pendingCitations = useRef<Array<Citation>>([])

  // `body` is spread into the AG-UI forwardedProps the chat route reads (and clamps to
  // the allowlist). Created once so the client instance — and its messages — persist.
  const [connection] = useState(() =>
    fetchServerSentEvents('/api/chat', () => ({ body: { model: modelRef.current } })),
  )

  const { messages, sendMessage, isLoading, stop, error } = useChat({
    connection,
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

  function send(text: string) {
    void sendMessage(text)
  }

  const isEmpty = messages.length === 0

  return (
    <Card className="flex h-[calc(100vh-12rem)] min-h-[28rem] flex-col gap-3 p-5 sm:p-6">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">Chat</span>
        <ModelPicker value={model} onChange={setModel} disabled={!hasKey} />
      </div>

      {!hasKey && <NoKeyBanner />}

      {isEmpty ? (
        <div className="flex flex-1 items-center justify-center">
          <SuggestedQuestions onPick={send} disabled={!hasKey} />
        </div>
      ) : (
        <MessageList
          messages={messages}
          isLoading={isLoading}
          citationsByMessage={citationsByMessage}
        />
      )}

      {error && hasKey && (
        <p className="m-0 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{friendlyError(error.message)}</span>
        </p>
      )}

      <Composer onSend={send} onStop={stop} disabled={!hasKey} isLoading={isLoading} />
    </Card>
  )
}
