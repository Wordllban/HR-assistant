import { describe, expect, it } from 'vitest'
import type { StreamChunk } from '@tanstack/ai'
import type { RetrievedChunk } from '#/lib/retrieval'
import { buildTurnLog, extractUsage } from './observability'

/** Minimal retrieved chunk; only the fields the log records need to be real. */
function chunk(over: Partial<RetrievedChunk> = {}): RetrievedChunk {
  return {
    documentId: 'doc-1',
    documentName: 'handbook.pdf',
    chunkIndex: 0,
    page: 1,
    content: 'some policy text',
    score: 0.5,
    ...over,
  }
}

describe('extractUsage', () => {
  it('returns token usage from a RUN_FINISHED chunk', () => {
    const finished = {
      type: 'RUN_FINISHED',
      usage: { promptTokens: 120, completionTokens: 40, totalTokens: 160 },
    } as unknown as StreamChunk

    expect(extractUsage(finished)).toEqual({
      promptTokens: 120,
      completionTokens: 40,
      totalTokens: 160,
    })
  })

  it('returns undefined for non-finish chunks', () => {
    const content = { type: 'TEXT_MESSAGE_CONTENT', delta: 'hello' } as unknown as StreamChunk
    expect(extractUsage(content)).toBeUndefined()
  })

  it('returns undefined when a RUN_FINISHED chunk carries no usage', () => {
    const finished = { type: 'RUN_FINISHED' } as unknown as StreamChunk
    expect(extractUsage(finished)).toBeUndefined()
  })
})

describe('buildTurnLog', () => {
  const base = {
    requestId: 'req-123',
    question: 'what about part-time employees?',
    retrievalQuery: 'how many remote days can part-time employees work?',
    condensed: true,
    historyTurns: 2,
    model: 'openai/gpt-oss-120b:free',
    retrieved: [chunk({ score: 0.51 }), chunk({ chunkIndex: 1, score: 0.18 })],
    kept: [chunk({ score: 0.51 })],
    inScope: true,
    timings: { condenseMs: 210.4, embedMs: 88.9, retrieveMs: 12.2, generateMs: 1340.7, totalMs: 1660.9 },
  }

  it('records the request id, model, query and condensation flag', () => {
    const record = buildTurnLog(base)
    expect(record).toMatchObject({
      requestId: 'req-123',
      model: 'openai/gpt-oss-120b:free',
      retrievalQuery: 'how many remote days can part-time employees work?',
      condensed: true,
      historyTurns: 2,
      inScope: true,
    })
  })

  it('records retrieved chunk ids, docs and scores plus the kept count', () => {
    const record = buildTurnLog(base)
    expect(record.retrieved).toBe(2)
    expect(record.kept).toBe(1)
    expect(record.chunks).toEqual([
      { id: 'doc-1#0', doc: 'handbook.pdf', page: 1, score: 0.51 },
      { id: 'doc-1#1', doc: 'handbook.pdf', page: 1, score: 0.18 },
    ])
  })

  it('rounds per-stage latencies to whole milliseconds', () => {
    const record = buildTurnLog(base)
    expect(record.timings).toEqual({
      condenseMs: 210,
      embedMs: 89,
      retrieveMs: 12,
      generateMs: 1341,
      totalMs: 1661,
    })
  })

  it('includes token usage when present and omits it otherwise', () => {
    const withUsage = buildTurnLog({
      ...base,
      usage: { promptTokens: 900, completionTokens: 120, totalTokens: 1020 },
    })
    expect(withUsage.usage).toEqual({ promptTokens: 900, completionTokens: 120, totalTokens: 1020 })
    expect(buildTurnLog(base).usage).toBeUndefined()
  })
})
