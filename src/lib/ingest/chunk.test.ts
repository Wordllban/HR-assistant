import { describe, expect, it } from 'vitest'
import { chunkText, countTokens } from './chunk'

/** Build paragraph text with `n` paragraphs of `wordsPer` filler words each. */
function paragraphs(n: number, wordsPer: number): string {
  const para = Array.from({ length: wordsPer }, (_, i) => `word${i}`).join(' ')
  return Array.from({ length: n }, () => para).join('\n\n')
}

describe('countTokens', () => {
  it('returns 0 for empty input', () => {
    expect(countTokens('')).toBe(0)
  })

  it('grows with text length', () => {
    expect(countTokens('hello world')).toBeGreaterThan(0)
    expect(countTokens(paragraphs(10, 50))).toBeGreaterThan(countTokens('hello world'))
  })
})

describe('chunkText', () => {
  const opts = { maxTokens: 50, overlap: 0.2 }

  it('returns no chunks for empty or whitespace-only text', () => {
    expect(chunkText('', null, opts)).toEqual([])
    expect(chunkText('   \n\n  \t ', null, opts)).toEqual([])
  })

  it('keeps short text as a single chunk', () => {
    const out = chunkText('Employees may work remotely two days per week.', null, opts)
    expect(out).toHaveLength(1)
    expect(out[0].chunkIndex).toBe(0)
    expect(out[0].content).toContain('remotely')
    expect(out[0].page).toBeNull()
  })

  it('splits long text into multiple chunks, each within the token cap', () => {
    const out = chunkText(paragraphs(12, 40), null, opts)
    expect(out.length).toBeGreaterThan(1)
    for (const chunk of out) {
      expect(countTokens(chunk.content)).toBeLessThanOrEqual(opts.maxTokens)
    }
  })

  it('numbers chunks sequentially from 0', () => {
    const out = chunkText(paragraphs(12, 40), null, opts)
    expect(out.map((c) => c.chunkIndex)).toEqual(out.map((_, i) => i))
  })

  it('overlaps consecutive chunks when overlap > 0', () => {
    // Distinct paragraphs so we can detect shared content across the boundary.
    const text = Array.from({ length: 10 }, (_, p) =>
      Array.from({ length: 20 }, (_, w) => `p${p}w${w}`).join(' '),
    ).join('\n\n')
    const out = chunkText(text, null, { maxTokens: 40, overlap: 0.3 })
    expect(out.length).toBeGreaterThan(1)

    const tail = out[0].content.split(/\s+/).slice(-3)
    // At least one of the previous chunk's trailing tokens reappears in the next chunk.
    expect(tail.some((tok) => out[1].content.includes(tok))).toBe(true)
  })

  it('produces no overlap when overlap = 0', () => {
    const out = chunkText(paragraphs(12, 40), null, { maxTokens: 50, overlap: 0 })
    const firstWords = out[0].content.split(/\s+/)
    const lastOfFirst = firstWords[firstWords.length - 1]
    // The very last token of chunk 0 should not begin chunk 1 (no carried tail).
    expect(out[1].content.startsWith(lastOfFirst)).toBe(false)
  })
})

describe('chunkText page provenance', () => {
  it('maps each chunk start offset to its 1-based source page', () => {
    // Three "pages" concatenated; record where each begins.
    const page1 = paragraphs(4, 30)
    const page2 = paragraphs(4, 30)
    const page3 = paragraphs(4, 30)
    const sep = '\n\n'
    const boundaries = [
      0,
      page1.length + sep.length,
      page1.length + sep.length + page2.length + sep.length,
    ]
    const text = [page1, page2, page3].join(sep)

    const out = chunkText(text, boundaries, { maxTokens: 60, overlap: 0.15 })

    // Pages are 1-based, non-decreasing, and within range.
    expect(out[0].page).toBe(1)
    for (const chunk of out) {
      expect(chunk.page).toBeGreaterThanOrEqual(1)
      expect(chunk.page).toBeLessThanOrEqual(3)
    }
    const pages = out.map((c) => c.page!)
    expect(pages).toEqual([...pages].sort((a, b) => a - b))
    // All three pages should be represented given the volume of text.
    expect(new Set(pages)).toEqual(new Set([1, 2, 3]))
  })

  it('assigns null pages when no boundary map is given', () => {
    const out = chunkText(paragraphs(8, 30), null, { maxTokens: 50, overlap: 0.15 })
    expect(out.every((c) => c.page === null)).toBe(true)
  })
})
