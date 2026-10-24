import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router'
import { api } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'
import { LanguageToggle } from './LanguageToggle'
import { ReportPromptHost } from './ReportPromptHost'

export function AppShell() {
  const { t } = useI18n()
  const { pathname } = useLocation()

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-canvas/95 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur">
        <Link to="/" className="pressable flex min-h-10 items-center gap-2 rounded-lg text-lg font-bold text-brand-strong">
          <Logo />
          {t('app.name')}
        </Link>
        <LanguageToggle />
      </header>

      {/* key re-runs the enter transition on every navigation */}
      <main key={pathname} className="page-enter flex flex-1 flex-col px-4 py-5">
        <Outlet />
      </main>

      <footer className="flex items-center justify-between gap-3 border-t border-line px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-sm text-muted">
        <span className="min-w-0">{t('footer.disclaimer')}</span>
        <span className="flex items-center gap-2">
          {import.meta.env.DEV && <ApiStatusDot />}
          <Link to="/about" className="font-medium whitespace-nowrap text-brand-strong underline underline-offset-2">
            {t('footer.about')}
          </Link>
        </span>
      </footer>

      <ReportPromptHost />
    </div>
  )
}

function Logo() {
  return (
    <svg aria-hidden width="26" height="26" viewBox="0 0 26 26" className="shrink-0">
      <rect width="26" height="26" rx="7" fill="var(--color-brand)" />
      <path d="M13 6.5v13M6.5 13h13" stroke="white" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  )
}

/** Dev only: green when the backend answers /api/health through the proxy. */
function ApiStatusDot() {
  const [ok, setOk] = useState<boolean | null>(null)

  useEffect(() => {
    api.health().then((r) => setOk(r.ok), () => setOk(false))
  }, [])

  const color = ok == null ? 'bg-line' : ok ? 'bg-flag-payable' : 'bg-flag-free'
  return <span title={ok ? 'API connected' : 'API not reachable'} className={`size-2.5 rounded-full ${color}`} />
}
