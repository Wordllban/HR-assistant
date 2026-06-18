import { createServerFn } from '@tanstack/react-start'
import { hasApiKey } from '#/lib/config'

/**
 * Reports whether the app is usable, so the UI can show a friendly banner instead of
 * letting requests fail cryptically (DECISIONS.md §2). Grows in #2 to also report
 * whether the knowledge base has been seeded.
 */
export const getReadiness = createServerFn({ method: 'GET' }).handler(async () => {
  return {
    hasKey: hasApiKey(),
  }
})
