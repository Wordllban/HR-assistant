import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
      <section className="panel p-6 sm:p-8">
        <p className="island-kicker mb-2">About</p>
        <h1 className="display-title mb-3 text-3xl font-bold text-[var(--sea-ink)] sm:text-4xl">
          A RAG assistant for your HR policies.
        </h1>
        <p className="m-0 max-w-2xl text-base leading-8 text-[var(--sea-ink-soft)]">
          Ask questions in plain language and get answers grounded only in your own HR
          documents — each one cited back to the source page it came from. Retrieval runs
          over a pgvector knowledge base, so the assistant never answers from outside the
          corpus you seed.
        </p>
      </section>
    </div>
  )
}
