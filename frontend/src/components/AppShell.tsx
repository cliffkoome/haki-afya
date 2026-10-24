import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { api } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'
import { LanguageToggle } from './LanguageToggle'
import { ReportPromptHost } from './ReportPromptHost'

export function AppShell() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  const scrolled = useScrolled()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
      <header
        className={`material sticky top-0 z-10 flex items-center justify-between gap-3 px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 transition-shadow duration-200 ${
          scrolled ? 'shadow-[0_1px_0_var(--color-line)]' : ''
        }`}
      >
        <Link to="/" className="pressable -ml-1 flex min-h-10 items-center gap-2 rounded-lg px-1">
          <Mark />
          <span className="display text-[1.5rem] leading-none">{t('app.name')}</span>
        </Link>
        <LanguageToggle />
      </header>

      {/* key re-runs the enter transition on every navigation */}
      <main key={pathname} className="page-enter flex flex-1 flex-col px-5 pt-4 pb-8">
        <Outlet />
      </main>

      <footer className="flex items-center justify-between gap-3 px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[0.8125rem] text-muted">
        <span className="min-w-0">{t('footer.disclaimer')}</span>
        <span className="flex items-center gap-2">
          {import.meta.env.DEV && <ApiStatusDot />}
          <Link to="/about" className="font-medium whitespace-nowrap text-ink underline decoration-line-strong underline-offset-4">
            {t('footer.about')}
          </Link>
        </span>
      </footer>

      <ReportPromptHost />
    </div>
  )
}

/** Wordmark glyph: a green plus cut from a rounded square, matching the app icon. */
function Mark() {
  return (
    <svg aria-hidden width="22" height="22" viewBox="0 0 26 26" className="shrink-0">
      <rect width="26" height="26" rx="7" fill="var(--color-brand)" />
      <path d="M13 7.5v11M7.5 13h11" stroke="white" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

/** The header gains a hairline only once content scrolls under it. */
function useScrolled(): boolean {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return scrolled
}

/** Dev only: green when the backend answers /api/health through the proxy. */
function ApiStatusDot() {
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    api.health().then((r) => setOk(r.ok), () => setOk(false))
  }, [])

  const color = ok == null ? 'bg-line' : ok ? 'bg-flag-payable' : 'bg-flag-free'
  return <span title={ok ? 'API connected' : 'API not reachable'} className={`size-2 rounded-full ${color}`} />
}
