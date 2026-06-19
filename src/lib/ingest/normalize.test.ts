import { describe, expect, it } from 'vitest'
import { normalizePdfPages } from './normalize'

describe('normalizePdfPages — de-hyphenation', () => {
  it('joins a word split by a hyphen across a line break', () => {
    const [page] = normalizePdfPages(['Employees may work re-\nmotely two days per week.'])
    expect(page).toContain('remotely')
    expect(page).not.toContain('re-')
  })

  it('keeps a genuine hyphenated compound intact', () => {
    const [page] = normalizePdfPages(['Our part-time staff and full-time staff differ.'])
    expect(page).toContain('part-time')
    expect(page).toContain('full-time')
  })
})

describe('normalizePdfPages — whitespace collapse', () => {
  it('collapses runs of spaces and trims line-trailing whitespace', () => {
    const [page] = normalizePdfPages(['Vacation    accrues   monthly.  \nReview annually.'])
    expect(page).toContain('Vacation accrues monthly.')
    expect(page).not.toMatch(/ {2,}/)
    expect(page).not.toMatch(/ \n/)
  })

  it('collapses three or more newlines into a paragraph break', () => {
    const [page] = normalizePdfPages(['First paragraph.\n\n\n\nSecond paragraph.'])
    expect(page).toBe('First paragraph.\n\nSecond paragraph.')
  })
})

describe('normalizePdfPages — boilerplate stripping', () => {
  it('strips a running header repeated on every page', () => {
    const pages = normalizePdfPages([
      'Acme Corp — Employee Handbook\nRemote work is allowed two days a week.',
      'Acme Corp — Employee Handbook\nExpenses are reimbursed within 30 days.',
      'Acme Corp — Employee Handbook\nPTO accrues at 1.5 days per month.',
    ])
    expect(pages.join('\n')).not.toContain('Acme Corp — Employee Handbook')
    expect(pages[0]).toContain('Remote work is allowed')
    expect(pages[2]).toContain('PTO accrues')
  })

  it('strips a running footer repeated on every page', () => {
    const pages = normalizePdfPages([
      'Remote work is allowed two days a week.\nConfidential — Do not distribute',
      'Expenses are reimbursed within 30 days.\nConfidential — Do not distribute',
      'PTO accrues at 1.5 days per month.\nConfidential — Do not distribute',
    ])
    expect(pages.join('\n')).not.toContain('Confidential — Do not distribute')
    expect(pages[1]).toContain('Expenses are reimbursed')
  })

  it('strips bare page-number lines', () => {
    const pages = normalizePdfPages([
      'Remote work policy applies firm-wide.\n1',
      'Page 2\nExpenses are reimbursed within 30 days.\n- 2 -',
    ])
    expect(pages[0]).toBe('Remote work policy applies firm-wide.')
    expect(pages[1]).toContain('Expenses are reimbursed within 30 days.')
    expect(pages[1]).not.toMatch(/Page 2/)
    expect(pages[1]).not.toMatch(/- 2 -/)
  })

  it('keeps a unique first line that is not boilerplate', () => {
    const pages = normalizePdfPages([
      'Introduction to the handbook.\nShared closing line.',
      'A different opening sentence.\nShared closing line.',
    ])
    expect(pages[0]).toContain('Introduction to the handbook.')
    expect(pages[1]).toContain('A different opening sentence.')
    expect(pages.join('\n')).not.toContain('Shared closing line.')
  })
})
