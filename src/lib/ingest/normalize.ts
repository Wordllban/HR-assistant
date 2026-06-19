/**
 * PDF extraction normalization (DECISIONS.md §12, Layer #5). Runs on the PDF path only,
 * BEFORE chunking, to clean up the artifacts that page-by-page PDF text extraction leaves
 * behind: words hyphenated across line breaks, ragged extraction whitespace, and the
 * running headers/footers + bare page numbers that repeat on every page.
 *
 * Page-aware by design: it takes the per-page text array (before concatenation) and
 * returns a normalized array of the same length, so `extractPdf` can rebuild page-boundary
 * char offsets from the cleaned pages and keep citation page-provenance correct.
 */

/** Join words split by a hyphen at a line break: `re-\nmotely` → `remotely`. */
function dehyphenate(text: string): string {
  return text.replace(/([A-Za-z])-\n(\p{Ll})/gu, '$1$2')
}

/**
 * Collapse ragged extraction whitespace without destroying paragraph structure (the
 * chunker splits on blank lines): squeeze runs of spaces/tabs, drop line-trailing spaces,
 * and cap blank-line runs at a single paragraph break.
 */
function collapseWhitespace(text: string): string {
  return text
    .replace(/[ \t]+/g, ' ')
    .replace(/ \n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Drop empty newline runs left behind by line removal and trim the edges. */
function tidy(text: string): string {
  return text.replace(/\n{3,}/g, '\n\n').trim()
}

/**
 * A line that is nothing but a page marker: `1`, `Page 2`, `Page 2 of 10`, `- 2 -`.
 * These repeat per page and add noise to chunks/citations, so they are dropped wherever
 * they appear.
 */
function isBarePageNumber(line: string): boolean {
  return /^(page\s+)?[-–—•\s]*\d+[-–—•\s]*(\s+of\s+\d+)?$/i.test(line)
}

/** Remove bare page-number lines from a single page. */
function stripPageNumbers(page: string): string {
  const kept = page.split('\n').filter((line) => !isBarePageNumber(line.trim()))
  return tidy(kept.join('\n'))
}

/**
 * Find running headers/footers: the first and last non-empty line of each page are the
 * boilerplate candidates; any candidate that recurs on a majority of pages (and at least
 * two) is treated as a running header/footer to strip. Single-page docs never strip.
 */
function findBoilerplate(pages: string[]): Set<string> {
  if (pages.length < 2) return new Set()

  const threshold = Math.max(2, Math.ceil(pages.length / 2))
  const counts = new Map<string, number>()
  for (const page of pages) {
    const lines = page
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
    if (lines.length === 0) continue
    const boundary = new Set<string>([lines[0], lines[lines.length - 1]])
    for (const line of boundary) {
      counts.set(line, (counts.get(line) ?? 0) + 1)
    }
  }

  const boilerplate = new Set<string>()
  for (const [line, count] of counts) {
    if (count >= threshold) boilerplate.add(line)
  }
  return boilerplate
}

/** Remove any line matching a detected boilerplate string from a single page. */
function stripBoilerplate(page: string, boilerplate: Set<string>): string {
  if (boilerplate.size === 0) return page
  const kept = page.split('\n').filter((line) => !boilerplate.has(line.trim()))
  return tidy(kept.join('\n'))
}

/** Normalize a batch of extracted PDF pages. Returns one cleaned page per input page. */
export function normalizePdfPages(pages: string[]): string[] {
  const cleaned = pages
    .map((page) => collapseWhitespace(dehyphenate(page)))
    .map(stripPageNumbers)
  const boilerplate = findBoilerplate(cleaned)
  return cleaned.map((page) => stripBoilerplate(page, boilerplate))
}
