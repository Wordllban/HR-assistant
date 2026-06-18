import { createFileRoute } from '@tanstack/react-router'
import { ChatPanel } from '#/components/chat/ChatPanel'
import { getReadiness } from '#/server/readiness'

export const Route = createFileRoute('/')({
  loader: async () => getReadiness(),
  component: Home,
})

function Home() {
  const { hasKey } = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <div className="mb-5">
        <p className="island-kicker mb-2">HR Assistant</p>
        <h1 className="display-title text-2xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-3xl">
          Ask about your HR policies
        </h1>
      </div>
      <ChatPanel hasKey={hasKey} />
    </main>
  )
}
