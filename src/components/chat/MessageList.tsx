import type { UIMessage } from '@tanstack/ai'
import type { Citation, MessageMeta as MessageMetaData } from '@/lib/citation'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { AnswerMarkdown } from './AnswerMarkdown'
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
    <ScrollArea className="min-h-0 flex-1">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-6 sm:px-6">
        {messages.map((message) => {
          const isUser = message.role === 'user'
          const citations = citationsByMessage[message.id] ?? []
          const meta = metaByMessage[message.id]
          return (
            <div
              key={message.id}
              className={cn('flex gap-3', isUser ? 'justify-end' : 'justify-start')}
            >
              {!isUser && (
                <span className="brand-mark mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[0.55rem]">
                  <span className="size-2 rotate-45 rounded-[2px] bg-white/90" />
                </span>
              )}
              <div className={cn('flex min-w-0 flex-col gap-2', isUser ? 'items-end' : 'items-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed sm:max-w-[40rem]',
                    isUser
                      ? 'rounded-br-md bg-primary text-primary-foreground shadow-sm'
                      : 'rounded-bl-md border border-border bg-card text-card-foreground shadow-sm',
                  )}
                >
                  {isUser ? (
                    <p className="m-0 whitespace-pre-wrap">{messageText(message)}</p>
                  ) : (
                    <AnswerMarkdown>{messageText(message)}</AnswerMarkdown>
                  )}
                </div>
                {!isUser && citations.length > 0 && (
                  <div className="w-full max-w-[85%] sm:max-w-[40rem]">
                    <Citations citations={citations} />
                  </div>
                )}
                {!isUser && <MessageMeta meta={meta} />}
              </div>
            </div>
          )
        })}
        {isLoading && (
          <div className="flex justify-start gap-3">
            <span className="brand-mark mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[0.55rem]">
              <span className="size-2 rotate-45 rounded-[2px] bg-white/90" />
            </span>
            <div className="rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
              <span className="inline-flex gap-1">
                <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
                <span className="size-1.5 animate-bounce rounded-full bg-current" />
              </span>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
}
