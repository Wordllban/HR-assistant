import { createFileRoute } from '@tanstack/react-router'
import {
  chat,
  chatParamsFromRequest,
  toServerSentEventsResponse,
  type CustomEvent,
  type ModelMessage,
  type StreamChunk,
  type UIMessage,
} from '@tanstack/ai'
import { config, hasApiKey, resolveChatModel } from '#/lib/config'
import { chatAdapter, complete, embedText } from '#/lib/openrouter'
import { searchChunks } from '#/lib/retrieval'
import { applyFloor, buildGroundedMessages, toCitations } from '#/lib/grounding'
import { buildCondensePrompt, condenseQuery, type ConversationTurn } from '#/lib/condense'
import { buildTurnLog, extractUsage, type TurnTimings } from '#/lib/observability'
import { logger } from '#/lib/logger'

/** Plain text of a message, whether it arrives as a UIMessage (parts) or ModelMessage. */
function messageText(message: UIMessage | ModelMessage): string {
  if ('parts' in message) {
    return message.parts
      .filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')
      .map((part) => part.content)
      .join('')
  }
  if (typeof message.content === 'string') return message.content
  if (Array.isArray(message.content)) {
    return message.content
      .filter((part): part is Extract<typeof part, { type: 'text' }> => part.type === 'text')
      .map((part) => part.content)
      .join('')
  }
  return ''
}

/**
 * Grounded streaming chat endpoint (SSE).
 *
 * Pipeline (#3): embed the latest question → retrieve top-k chunks → apply the similarity
 * floor (the off-corpus guardrail) → build a grounded prompt that answers only from the
 * retrieved context. The answer streams as normal AG-UI text events; the citations backing
 * it ride out as a trailing `citations` CUSTOM event the client renders as source cards.
 *
 * Conversational condensation (#5): when prior history exists, a single free-model call
 * rewrites the follow-up + a capped history window into a standalone query, which is what
 * we embed and retrieve on — so "what about part-time employees?" finds the right chunks.
 * The first message has no history and skips this. Generation still answers the user's
 * actual question; only retrieval uses the rewritten query.
 *
 * Observability (#6): every turn emits one structured pino log keyed by a requestId —
 * query, condensation flag, retrieved chunk ids + scores, model, token usage and
 * per-stage latency (condense / embed / retrieve / generate). Token usage and turn latency
 * also ride out as a trailing `usage` CUSTOM event the client renders as a per-message
 * readout.
 */
export const Route = createFileRoute('/api/chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!hasApiKey()) {
          return Response.json(
            {
              error: 'missing_api_key',
              message: 'OPENROUTER_API_KEY is not configured. Add it to .env and restart.',
            },
            { status: 503 },
          )
        }

        const { messages, forwardedProps } = await chatParamsFromRequest(request)

        // The picker's choice arrives as untrusted client data — clamp it to the allowlist.
        const model = resolveChatModel(forwardedProps?.model)

        let lastUserIndex = -1
        for (let index = messages.length - 1; index >= 0; index--) {
          if (messages[index].role === 'user') {
            lastUserIndex = index
            break
          }
        }
        const question = lastUserIndex >= 0 ? messageText(messages[lastUserIndex]) : ''

        // Everything before the current question is the conversation history fed to
        // condensation (free model, independent of the picker). A failed rewrite must not
        // sink the whole turn, so fall back to retrieving on the bare question.
        const history: ConversationTurn[] = messages
          .slice(0, Math.max(0, lastUserIndex))
          .filter((message) => message.role === 'user' || message.role === 'assistant')
          .map((message) => ({
            role: message.role === 'user' ? 'user' : 'assistant',
            content: messageText(message),
          }))

        // One id correlates every line of this turn; per-stage timers feed the turn log.
        const requestId = crypto.randomUUID()
        const turnStart = performance.now()
        const timings: TurnTimings = { embedMs: 0, retrieveMs: 0, totalMs: 0 }

        let retrievalQuery = question
        if (history.length > 0) {
          const condenseStart = performance.now()
          try {
            retrievalQuery = await condenseQuery(history, question, (windowed, followUp) =>
              complete(buildCondensePrompt(windowed, followUp), config.condenseModel),
            )
          } catch (err) {
            logger.warn(
              { requestId, err: err instanceof Error ? err.message : String(err) },
              'condensation failed — retrieving on the raw question',
            )
          }
          timings.condenseMs = performance.now() - condenseStart
        }

        const embedStart = performance.now()
        const vector = await embedText(retrievalQuery)
        timings.embedMs = performance.now() - embedStart

        const retrieveStart = performance.now()
        const retrieved = await searchChunks(vector)
        timings.retrieveMs = performance.now() - retrieveStart

        const { inScope, chunks } = applyFloor(retrieved, config.retrievalMinScore)
        const citations = toCitations(chunks)
        const condensed = history.length > 0 && retrievalQuery !== question

        // ModelMessage has no `system` role — the grounded system prompt goes via
        // `systemPrompts`, the user question via `messages`.
        const grounded = buildGroundedMessages(question, chunks)
        const systemPrompts = grounded
          .filter((message) => message.role === 'system')
          .map((message) => message.content)
        const userMessages: ModelMessage[] = grounded
          .filter((message) => message.role === 'user')
          .map((message) => ({ role: 'user', content: message.content }))

        const generateStart = performance.now()
        const stream = chat({ adapter: chatAdapter(model), systemPrompts, messages: userMessages })

        // Wrap the model stream so the citations + usage follow as trailing CUSTOM frames
        // (consumed client-side via useChat's onCustomEvent). Token usage rides out on the
        // terminal RUN_FINISHED frame; we capture it, then emit the per-turn structured log
        // here — once generate latency and usage are both known.
        async function* withTrailers(): AsyncGenerator<StreamChunk> {
          let usage: ReturnType<typeof extractUsage>
          for await (const chunk of stream) {
            usage ??= extractUsage(chunk)
            yield chunk
          }
          timings.generateMs = performance.now() - generateStart
          timings.totalMs = performance.now() - turnStart

          const latencyMs = Math.round(timings.totalMs)
          yield {
            type: 'CUSTOM',
            name: 'usage',
            value: {
              promptTokens: usage?.promptTokens,
              completionTokens: usage?.completionTokens,
              totalTokens: usage?.totalTokens,
              latencyMs,
            },
          } as CustomEvent
          yield { type: 'CUSTOM', name: 'citations', value: citations } as CustomEvent

          logger.info(
            buildTurnLog({
              requestId,
              question,
              retrievalQuery,
              condensed,
              historyTurns: history.length,
              model,
              retrieved,
              kept: chunks,
              inScope,
              timings,
              usage,
            }),
            'grounded chat',
          )
        }

        return toServerSentEventsResponse(withTrailers())
      },
    },
  },
})
