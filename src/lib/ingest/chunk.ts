/**
 * Token-aware, boundary-respecting chunker (DECISIONS.md §12).
 *
 * Strategy: recursively split the text on a priority list of separators
 * (paragraph → line → sentence → word → character) into atomic *segments* that each
 * fit under the token cap, then greedily pack segments into chunks up to the cap, with
 * a configurable token overlap carried between consecutive chunks.
 *
 * Char offsets are preserved through every split so each chunk's START offset can be
 * mapped to a source page. Token counts use `gpt-tokenizer` (cl100k) purely as a
 * consistent *approximation* — the embedding model's real tokenizer differs, but exact
 * counts are unnecessary for sizing.
 *
 * PDF extraction normalization (de-hyphenation, header/footer stripping) is deliberately
 * NOT done here — it lands in #5 and only on the PDF path.
 */
import { encode } from 'gpt-tokenizer'

/** Separators in descending priority. '' is the final char-level fallback. */
const SEPARATORS = ['\n\n', '\n', '. ', ' ', ''] as const

/** A piece of the source text together with its absolute start offset in that text. */
interface Segment {
  text: string
  start: number
}

export interface ChunkResult {
  chunkIndex: number
  content: string
  /** 1-based start page for PDFs; null when no page map was supplied (plain text). */
  page: number | null
}

export interface ChunkOptions {
  /** Hard token cap per chunk. */
  maxTokens: number
  /** Overlap as a fraction of `maxTokens` (e.g. 0.15 → ~15% of the cap re-included). */
  overlap: number
}

/** Count tokens with the cl100k tokenizer (a stable approximation — see module docs). */
export function countTokens(text: string): number {
  if (text.length === 0) return 0
  return encode(text).length
}

/**
 * Split `text` into chunks. `pageBoundaries` is the ascending list of char offsets at
 * which each page begins (index 0 → page 1); pass `null` for non-paginated text.
 */
export function chunkText(
  text: string,
  pageBoundaries: number[] | null,
  options: ChunkOptions,
): ChunkResult[] {
  const maxTokens = Math.max(1, Math.floor(options.maxTokens))
  const overlapTokens = Math.max(0, Math.floor(maxTokens * options.overlap))

  const segments = splitToSegments(text, 0, maxTokens, SEPARATORS)
  const packed = packSegments(segments, maxTokens, overlapTokens)

  return packed.map((chunk, index) => ({
    chunkIndex: index,
    content: chunk.text,
    page: pageBoundaries ? pageForOffset(chunk.start, pageBoundaries) : null,
  }))
}

/**
 * Recursively break `text` into atomic segments that each fit within `maxTokens`,
 * splitting on the highest-priority separator that helps. Offsets are absolute
 * (relative to the original document), threaded through `baseOffset`.
 */
function splitToSegments(
  text: string,
  baseOffset: number,
  maxTokens: number,
  separators: readonly string[],
): Segment[] {
  if (text.trim().length === 0) return []
  if (countTokens(text) <= maxTokens) return [{ text, start: baseOffset }]

  const [separator, ...rest] = separators
  // Out of separators: hard-split on token windows (rare — a single capless run).
  if (separator === undefined) return hardSplit(text, baseOffset, maxTokens)

  const parts = splitKeepingOffsets(text, separator, baseOffset)
  const segments: Segment[] = []
  for (const part of parts) {
    if (countTokens(part.text) <= maxTokens) {
      if (part.text.trim().length > 0) segments.push(part)
    } else {
      segments.push(...splitToSegments(part.text, part.start, maxTokens, rest))
    }
  }
  return segments
}

/**
 * Split on `separator`, attaching the separator to the *preceding* part so the parts
 * concatenate back to the original and their start offsets stay contiguous.
 */
function splitKeepingOffsets(text: string, separator: string, baseOffset: number): Segment[] {
  if (separator === '') {
    return Array.from(text, (char, index) => ({ text: char, start: baseOffset + index }))
  }
  const parts: Segment[] = []
  let start = 0
  let idx: number
  while ((idx = text.indexOf(separator, start)) !== -1) {
    const end = idx + separator.length
    parts.push({ text: text.slice(start, end), start: baseOffset + start })
    start = end
  }
  if (start < text.length) parts.push({ text: text.slice(start), start: baseOffset + start })
  return parts
}

/** Last-resort split of an over-cap, separator-free run into token-sized windows. */
function hardSplit(text: string, baseOffset: number, maxTokens: number): Segment[] {
  const tokens = encode(text)
  const segments: Segment[] = []
  let charCursor = 0
  for (let tokenIndex = 0; tokenIndex < tokens.length; tokenIndex += maxTokens) {
    // Decode this window via a character-proportional slice. BPE doesn't expose char
    // spans, so approximate: this fallback is for pathological input only.
    const fraction = (tokenIndex + maxTokens) / tokens.length
    const end = Math.min(text.length, Math.round(text.length * fraction))
    const piece = text.slice(charCursor, end)
    if (piece.trim().length > 0) segments.push({ text: piece, start: baseOffset + charCursor })
    charCursor = end
  }
  return segments
}

/** Greedily pack segments into ≤maxTokens chunks, re-including a token overlap tail. */
function packSegments(
  segments: Segment[],
  maxTokens: number,
  overlapTokens: number,
): Segment[] {
  const chunks: Segment[] = []
  let current: Segment[] = []
  let currentTokens = 0

  for (const segment of segments) {
    const segTokens = countTokens(segment.text)
    if (currentTokens + segTokens > maxTokens && current.length > 0) {
      chunks.push(mergeSegments(current))
      current = overlapTokens > 0 ? takeOverlap(current, overlapTokens) : []
      currentTokens = current.reduce((sum, segment) => sum + countTokens(segment.text), 0)
    }
    current.push(segment)
    currentTokens += segTokens
  }
  if (current.length > 0) chunks.push(mergeSegments(current))

  return chunks
}

/** Trailing segments of `segments` whose tokens sum to ~`overlapTokens` (never all). */
function takeOverlap(segments: Segment[], overlapTokens: number): Segment[] {
  const overlap: Segment[] = []
  let tokens = 0
  for (let index = segments.length - 1; index >= 1; index--) {
    overlap.unshift(segments[index])
    tokens += countTokens(segments[index].text)
    if (tokens >= overlapTokens) break
  }
  return overlap
}

/** Concatenate segments into one chunk; start = first segment's offset. */
function mergeSegments(segments: Segment[]): Segment {
  return {
    text: segments.map((segment) => segment.text).join('').trim(),
    start: segments[0].start,
  }
}

/** Largest page whose start offset is ≤ `offset`; returns a 1-based page number. */
function pageForOffset(offset: number, pageBoundaries: number[]): number {
  let page = 1
  for (let index = 0; index < pageBoundaries.length; index++) {
    if (pageBoundaries[index] <= offset) page = index + 1
    else break
  }
  return page
}
