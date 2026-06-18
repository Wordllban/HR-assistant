import pino from 'pino'

/** Structured logger. Per-turn RAG logs are built on this (DECISIONS.md §13). */
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
})
