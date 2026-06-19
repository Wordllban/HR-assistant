import { describe, expect, it, vi } from 'vitest'
import { buildCondensePrompt, condenseQuery, type ConversationTurn } from './condense'

describe('condenseQuery', () => {
  const history: ConversationTurn[] = [
    { role: 'user', content: 'How many days a week can I work remotely?' },
    { role: 'assistant', content: 'Full-time employees may work remotely two days a week.' },
  ]

  it('skips the rewrite on the first message (no history) and returns the question as-is', async () => {
    const rewrite = vi.fn()
    const result = await condenseQuery([], 'How many remote days do I get?', rewrite)
    expect(result).toBe('How many remote days do I get?')
    expect(rewrite).not.toHaveBeenCalled()
  })

  it('rewrites a follow-up into a standalone query when history exists', async () => {
    const rewrite = vi.fn(async () => '  How many remote days can part-time employees work?  ')
    const result = await condenseQuery(history, 'what about part-time employees?', rewrite)
    expect(rewrite).toHaveBeenCalledOnce()
    expect(result).toBe('How many remote days can part-time employees work?')
  })

  it('falls back to the original question when the rewrite is empty', async () => {
    const rewrite = vi.fn(async () => '   ')
    const result = await condenseQuery(history, 'what about part-time employees?', rewrite)
    expect(result).toBe('what about part-time employees?')
  })

  it('passes only the last `window` turns to the rewrite', async () => {
    const longHistory: ConversationTurn[] = Array.from({ length: 6 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `turn ${index}`,
    }))
    let received: ConversationTurn[] = []
    const rewrite = vi.fn(async (windowed: ConversationTurn[]) => {
      received = windowed
      return 'standalone query'
    })
    await condenseQuery(longHistory, 'follow up', rewrite, 2)
    expect(received).toEqual([
      { role: 'user', content: 'turn 4' },
      { role: 'assistant', content: 'turn 5' },
    ])
  })
})

describe('buildCondensePrompt', () => {
  const history: ConversationTurn[] = [
    { role: 'user', content: 'How many days a week can I work remotely?' },
    { role: 'assistant', content: 'Full-time employees may work remotely two days a week.' },
  ]

  it('includes the follow-up question and the recent history', () => {
    const prompt = buildCondensePrompt(history, 'what about part-time employees?')
    expect(prompt).toContain('what about part-time employees?')
    expect(prompt).toContain('two days a week')
  })

  it('drops the oldest turns to stay under the replayed-token cap', () => {
    const longHistory: ConversationTurn[] = Array.from({ length: 8 }, (_, index) => ({
      role: index % 2 === 0 ? 'user' : 'assistant',
      content: `Turn number ${index} with some filler words to spend tokens.`,
    }))
    const prompt = buildCondensePrompt(longHistory, 'follow up', 20)
    // The newest turn survives; the oldest is dropped under a tight budget.
    expect(prompt).toContain('Turn number 7')
    expect(prompt).not.toContain('Turn number 0')
  })
})
