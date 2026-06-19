import { Link } from '@tanstack/react-router'
import { Github } from 'lucide-react'
import ThemeToggle from './ThemeToggle'

/**
 * Slim product bar for the app shell: brand identity on the left, quiet utility
 * links and the theme toggle on the right. Sticky so it stays put while the chat
 * column scrolls underneath.
 */
export function TopBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-[var(--header-bg)] backdrop-blur-lg">
      <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-4 py-2.5 sm:px-6">
        <Link
          to="/"
          className="group inline-flex items-center gap-2.5 no-underline"
          aria-label="HR Assistant home"
        >
          <span className="brand-mark flex size-7 items-center justify-center rounded-[0.6rem]">
            <span className="size-2.5 rotate-45 rounded-[2px] bg-white/90" />
          </span>
          <span className="flex flex-col leading-none">
            <span className="display-title text-[0.95rem] font-bold tracking-tight text-[var(--sea-ink)]">
              HR Assistant
            </span>
            <span className="mt-0.5 text-[0.66rem] font-medium uppercase tracking-[0.14em] text-[var(--sea-ink-soft)]">
              Policy knowledge base
            </span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link
            to="/about"
            className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-[var(--sea-ink-soft)] no-underline transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
            activeProps={{ className: 'rounded-lg px-2.5 py-1.5 text-sm font-medium text-[var(--sea-ink)] no-underline bg-[var(--link-bg-hover)]' }}
          >
            About
          </Link>
          <a
            href="https://github.com/Wordllban/HR-assistant"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg p-2 text-[var(--sea-ink-soft)] transition hover:bg-[var(--link-bg-hover)] hover:text-[var(--sea-ink)]"
          >
            <span className="sr-only">View the source on GitHub</span>
            <Github className="size-[18px]" />
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  )
}
