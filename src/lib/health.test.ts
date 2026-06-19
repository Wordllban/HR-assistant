import { describe, expect, it, vi } from 'vitest'
import { checkHealth, healthHttpStatus } from './health'

describe('checkHealth', () => {
  it('reports ok when the database is reachable and the index is populated', async () => {
    const probe = vi.fn(async () => 1280)
    const report = await checkHealth(probe)
    expect(report).toMatchObject({ status: 'ok', database: 'up', chunks: 1280 })
  })

  it('reports degraded when the database is up but the index is empty', async () => {
    const probe = vi.fn(async () => 0)
    const report = await checkHealth(probe)
    expect(report).toMatchObject({ status: 'degraded', database: 'up', chunks: 0 })
  })

  it('reports down with the error message when the probe throws', async () => {
    const probe = vi.fn(async () => {
      throw new Error('connection refused')
    })
    const report = await checkHealth(probe)
    expect(report).toMatchObject({ status: 'down', database: 'down', chunks: 0 })
    expect(report.error).toContain('connection refused')
  })
})

describe('healthHttpStatus', () => {
  it('maps ok to 200 and any unhealthy state to 503', () => {
    expect(healthHttpStatus({ status: 'ok', database: 'up', chunks: 5 })).toBe(200)
    expect(healthHttpStatus({ status: 'degraded', database: 'up', chunks: 0 })).toBe(503)
    expect(healthHttpStatus({ status: 'down', database: 'down', chunks: 0 })).toBe(503)
  })
})
