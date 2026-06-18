import { describe, expect, it } from 'vitest'
import type { RetrievedChunk } from '#/lib/retrieval'
import { applyFloor, buildGroundedMessages, toCitations } from './grounding'

/** Minimal retrieved chunk for tests; only score matters to the floor. */
function chunk(score: number, over: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    documentId: 'doc-1',
    documentName: 'handbook.pdf',
    chunkIndex: 0,
    page: 1,
    content: 'some policy text',
    score,
    ...over,
  }
}

describe('applyFloor', () => {
  it('drops chunks scoring below the floor and keeps the rest', () => {
    const result = applyFloor([chunk(0.5), chunk(0.1), chunk(0.3)], 0.25)

    expect(result.inScope).toBe(true)
    expect(result.chunks.map((chunk) => chunk.score)).toEqual([0.5, 0.3])
  })

  it('reports out-of-scope with no chunks when none clear the floor', () => {
    const result = applyFloor([chunk(0.2), chunk(0.15)], 0.25)

    expect(result.inScope).toBe(false)
    expect(result.chunks).toEqual([])
  })

  it('keeps a chunk scoring exactly at the floor', () => {
    const result = applyFloor([chunk(0.25)], 0.25)

    expect(result.inScope).toBe(true)
    expect(result.chunks).toHaveLength(1)
  })
})

describe('toCitations', () => {
  it('turns a chunk into a citation carrying source name, page and score', () => {
    const cites = toCitations([
      chunk(0.42, { documentName: 'remote-work.pdf', page: 2, content: 'Employees may work from home.' }),
    ])

    expect(cites).toHaveLength(1)
    expect(cites[0]).toMatchObject({
      documentName: 'remote-work.pdf',
      page: 2,
      score: 0.42,
    })
    expect(cites[0].snippet).toContain('work from home')
  })

  it('dedups chunks from the same document and page, keeping the best score', () => {
    const cites = toCitations([
      chunk(0.5, { documentName: 'a.pdf', page: 1, content: 'first hit on page one' }),
      chunk(0.3, { documentName: 'a.pdf', page: 1, content: 'second hit on page one' }),
      chunk(0.4, { documentName: 'a.pdf', page: 2, content: 'hit on page two' }),
    ])

    expect(cites).toHaveLength(2)
    expect(cites[0]).toMatchObject({ documentName: 'a.pdf', page: 1, score: 0.5 })
    expect(cites[0].snippet).toContain('first hit')
    expect(cites[1]).toMatchObject({ documentName: 'a.pdf', page: 2, score: 0.4 })
  })

  it('truncates long content into a bounded snippet with an ellipsis', () => {
    const long = 'word '.repeat(200).trim()
    const [cite] = toCitations([chunk(0.5, { content: long })])

    expect(cite.snippet.length).toBeLessThan(long.length)
    expect(cite.snippet.endsWith('…')).toBe(true)
  })
})

describe('buildGroundedMessages', () => {
  it('puts the context in a system message and the question in a user message', () => {
    const messages = buildGroundedMessages('Can I work from home?', [
      chunk(0.5, { documentName: 'remote-work.pdf', page: 2, content: 'Employees may work from home two days a week.' }),
    ])

    const system = messages.find((message) => message.role === 'system')
    const user = messages.find((message) => message.role === 'user')

    expect(system).toBeDefined()
    expect(system!.content).toContain('remote-work.pdf')
    expect(system!.content).toContain('work from home two days a week')
    expect(user!.content).toContain('Can I work from home?')
  })

  it('instructs the model to decline when there is no context', () => {
    const messages = buildGroundedMessages('What is the capital of France?', [])
    const system = messages.find((message) => message.role === 'system')!

    expect(system.content).toMatch(/no relevant|do not have|cannot answer/i)
    // No numbered passages when nothing was retrieved.
    expect(system.content).not.toContain('[1]')
  })
})
