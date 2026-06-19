import { useRef, useState } from 'react'
import { fetchServerSentEvents, useChat } from '@tanstack/ai-react'
import type { UIMessage } from '@tanstack/ai'
import { AlertTriangle } from 'lucide-react'
import type { Citation, MessageMeta } from '@/lib/citation'
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
  const [metaByMessage, setMetaByMessage] = useState<Record<string, MessageMeta>>({})
  // Citations and the usage readout ride out as trailing CUSTOM events with no message id of
  // their own. By design they arrive AFTER the run's RUN_FINISHED, which is exactly when
  // useChat fires onFinish — so onFinish has already run by the time they land. We capture
  // the finished assistant message's id there and bind each trailer to it as it arrives. The
  // pending refs are the fallback for the reverse order, should a trailer ever beat onFinish.
  const lastAssistantId = useRef<string | undefined>(undefined)
  const pendingCitations = useRef<Array<Citation> | undefined>(undefined)
  const pendingMeta = useRef<MessageMeta | undefined>(undefined)

  // `body` is spread into the AG-UI forwardedProps the chat route reads (and clamps to
  // the allowlist). Created once so the client instance — and its messages — persist.
  const [connection] = useState(() =>
    fetchServerSentEvents('/api/chat', () => ({ body: { model: modelRef.current } })),
  )

  const { messages, sendMessage, isLoading, stop, error } = useChat({
    connection,
    onCustomEvent: (eventType, data) => {
      if (eventType === 'citations') {
        const citations = (data as Array<Citation>) ?? []
        if (lastAssistantId.current) {
          const messageId = lastAssistantId.current
          setCitationsByMessage((prev) => ({ ...prev, [messageId]: citations }))
        } else {
          pendingCitations.current = citations
        }
      } else if (eventType === 'usage') {
        const meta = data as MessageMeta
        if (lastAssistantId.current) {
          const messageId = lastAssistantId.current
          setMetaByMessage((prev) => ({ ...prev, [messageId]: meta }))
        } else {
          pendingMeta.current = meta
        }
      }
    },
    onFinish: (message: UIMessage) => {
      lastAssistantId.current = message.id
      // Fallback: bind anything that somehow arrived before this turn's onFinish.
      if (pendingCitations.current) {
        const citations = pendingCitations.current
        pendingCitations.current = undefined
        setCitationsByMessage((prev) => ({ ...prev, [message.id]: citations }))
      }
      if (pendingMeta.current) {
        const meta = pendingMeta.current
        pendingMeta.current = undefined
        setMetaByMessage((prev) => ({ ...prev, [message.id]: meta }))
      }
    },
  })

  function send(text: string) {
    // A fresh turn: forget the previous assistant id so trailers can't bind to it before
    // this turn's onFinish captures the new one.
    lastAssistantId.current = undefined
    pendingCitations.current = undefined
    pendingMeta.current = undefined
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
          metaByMessage={metaByMessage}
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
