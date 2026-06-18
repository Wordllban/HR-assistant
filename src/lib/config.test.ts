import { describe, expect, it } from 'vitest'
import { config, resolveChatModel } from './config'
import { CHAT_MODELS } from './models'

describe('resolveChatModel', () => {
  it('accepts a model id that is in the allowlist', () => {
    const known = CHAT_MODELS[1].id
    expect(resolveChatModel(known)).toBe(known)
  })

  it('falls back to the default for a slug not in the allowlist', () => {
    expect(resolveChatModel('evil/unlisted-model:free')).toBe(config.defaultChatModel)
  })

  it('falls back to the default for non-string input', () => {
    expect(resolveChatModel(undefined)).toBe(config.defaultChatModel)
    expect(resolveChatModel(42)).toBe(config.defaultChatModel)
    expect(resolveChatModel({ id: CHAT_MODELS[0].id })).toBe(config.defaultChatModel)
  })
})
