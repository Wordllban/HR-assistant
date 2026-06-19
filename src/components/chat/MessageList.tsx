import type { UIMessage } from '@tanstack/ai'
import type { Citation, MessageMeta as MessageMetaData } from '@/lib/citation'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Citations } from './Citations'
import { MessageMeta } from './MessageMeta'

/** Concatenate the text parts of a message into a single string. */
function messageText(message: UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.content)
    .join('')
}

interface MessageListProps {
  messages: Array<UIMessage>
  isLoading: boolean
  /** Citations keyed by assistant message id, attached once a run finishes. */
  citationsByMessage: Record<string, Array<Citation>>
  /** Per-message token/latency readout keyed by assistant message id. */
  metaByMessage: Record<string, MessageMetaData>
}

export function MessageList({
  messages,
  isLoading,
  citationsByMessage,
  metaByMessage,
}: MessageListProps) {
  return (
    <ScrollArea className="min-h-0 flex-1 pr-3">
      <div className="flex flex-col gap-4 py-2">
        {messages.map((message) => {
          const isUser = message.role === 'user'
          const citations = citationsByMessage[message.id] ?? []
          const meta = metaByMessage[message.id]
          return (
            <div key={message.id} className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                  isUser
                    ? 'rounded-br-sm bg-primary text-primary-foreground'
                    : 'rounded-bl-sm border bg-card text-card-foreground shadow-sm',
                )}
              >
                <p className="m-0 whitespace-pre-wrap">{messageText(message)}</p>
                {!isUser && <Citations citations={citations} />}
                {!isUser && <MessageMeta meta={meta} />}
              </div>
            </div>
          )
        })}
        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm border bg-card px-4 py-2.5 text-sm text-muted-foreground shadow-sm">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-current" />
              </span>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
