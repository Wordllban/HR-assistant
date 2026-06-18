import { createFileRoute } from '@tanstack/react-router'
import { ChatPanel } from '#/components/chat/ChatPanel'
import { KnowledgeBasePanel } from '#/components/chat/KnowledgeBasePanel'
import { getReadiness } from '#/server/readiness'
import { listDocuments } from '#/server/documents'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [readiness, documents] = await Promise.all([getReadiness(), listDocuments()])
    return { ...readiness, documents }
  },
  component: Home,
})

function Home() {
  const { hasKey, documents } = Route.useLoaderData()

  return (
    <main className="page-wrap px-4 pb-8 pt-14">
      <div className="mb-5">
        <p className="island-kicker mb-2">HR Assistant</p>
        <h1 className="display-title text-2xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-3xl">
          Ask about your HR policies
        </h1>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <ChatPanel hasKey={hasKey} />
        <aside className="hidden lg:block">
          <KnowledgeBasePanel documents={documents} />
        </aside>
      </div>
    </main>
  )
}
