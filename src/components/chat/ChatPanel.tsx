import { fetchServerSentEvents, useChat } from '@tanstack/ai-react'
import { Card } from '@/components/ui/card'
import { Composer } from './Composer'
import { MessageList } from './MessageList'
import { NoKeyBanner } from './NoKeyBanner'

interface ChatPanelProps {
  hasKey: boolean
}

export function ChatPanel({ hasKey }: ChatPanelProps) {
  const { messages, sendMessage, isLoading, stop, error } = useChat({
    connection: fetchServerSentEvents('/api/chat'),
  })

  return (
    <Card className="flex h-[calc(100vh-12rem)] min-h-[28rem] flex-col gap-3 p-5 sm:p-6">
      {!hasKey && <NoKeyBanner />}

      <MessageList messages={messages} isLoading={isLoading} />

      {error && hasKey && (
        <p className="m-0 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error.message}
        </p>
      )}

      <Composer onSend={sendMessage} onStop={stop} disabled={!hasKey} isLoading={isLoading} />
    </Card>
  )
}
