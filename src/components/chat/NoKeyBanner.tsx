import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

/** Shown when OPENROUTER_API_KEY is missing, so the app degrades gracefully (DECISIONS.md §2). */
export function NoKeyBanner() {
  const chip =
    'rounded bg-amber-200/70 px-1 font-mono text-amber-900 dark:bg-amber-400/20 dark:text-amber-100'
  return (
    <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-200">
      <AlertTitle>No OpenRouter key configured</AlertTitle>
      <AlertDescription className="text-amber-800 dark:text-amber-300/90">
        <span>
          Add <span className={chip}>OPENROUTER_API_KEY</span> to your <span className={chip}>.env</span> and
          restart. Grab a free key at{' '}
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline"
          >
            openrouter.ai/keys
          </a>
          .
        </span>
      </AlertDescription>
    </Alert>
  )
}
