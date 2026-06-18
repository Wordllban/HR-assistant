import { createFileRoute } from '@tanstack/react-router'
import { chat, chatParamsFromRequest, toServerSentEventsResponse } from '@tanstack/ai'
import { hasApiKey } from '#/lib/config'
import { chatAdapter } from '#/lib/openrouter'

/**
 * Streaming chat endpoint (SSE). Walking-skeleton version: streams the model's reply
 * directly. Retrieval, grounded prompting, and citations are layered on in #2/#3.
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

        const { messages } = await chatParamsFromRequest(request)
        const stream = chat({ adapter: chatAdapter(), messages })
        return toServerSentEventsResponse(stream)
      },
    },
  },
})
