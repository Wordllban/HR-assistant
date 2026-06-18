/**
 * Source-text extraction (DECISIONS.md §12).
 *
 * PDFs are extracted page-by-page (unpdf), then concatenated into one stream while
 * recording the char offset at which each page begins — so the chunker can map a
 * chunk's start offset back to a page number. Plain text is passed through verbatim
 * with no page map.
 *
 * No normalization happens here (de-hyphenation, header/footer stripping) — that is the
 * PDF-quality pass in #5.
 */
import { extractText } from 'unpdf'

export type SourceType = 'pdf' | 'text'

export interface Extracted {
  sourceType: SourceType
  /** The full concatenated document text fed to the chunker. */
  text: string
  /** Ascending char offsets where each page starts (index 0 → page 1); null for text. */
  pageBoundaries: number[] | null
}

/** Separator inserted between PDF pages in the concatenated stream. */
const PAGE_SEPARATOR = '\n\n'

/** Extract a PDF's text page-by-page, tracking page-start offsets for provenance. */
export async function extractPdf(data: Uint8Array): Promise<Extracted> {
  const { text: pages } = await extractText(data, { mergePages: false })

  const boundaries: number[] = []
  let cursor = 0
  const parts: string[] = []
  for (const page of pages) {
    boundaries.push(cursor)
    parts.push(page)
    cursor += page.length + PAGE_SEPARATOR.length
  }

  return {
    sourceType: 'pdf',
    text: parts.join(PAGE_SEPARATOR),
    pageBoundaries: boundaries,
  }
}

/** Wrap raw text as an extraction result (no pagination). */
export function extractText_(text: string): Extracted {
  return { sourceType: 'text', text, pageBoundaries: null }
}
