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
    <div className="mx-auto flex min-h-0 w-full max-w-[1400px] flex-1 gap-4 px-4 py-4 sm:px-6 sm:py-5">
      <aside className="hidden w-72 shrink-0 lg:flex xl:w-80">
        <KnowledgeBasePanel documents={documents} />
      </aside>
      <section className="flex min-w-0 flex-1">
        <ChatPanel hasKey={hasKey} />
      </section>
    </div>
  )
}
