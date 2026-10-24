import { Link } from 'react-router'
import { useI18n } from '../i18n/I18nProvider'

export function Home() {
  const { t } = useI18n()

  return (
    <section className="flex flex-col gap-6 pt-4">
      <h1 className="rise text-[2rem] leading-[1.1] font-bold text-balance">{t('app.tagline')}</h1>

      <div className="flex flex-col gap-3">
        <HomeAction i={1} to="/check" title={t('home.check')} hint={t('home.checkHint')} primary icon={<BillIcon />} />
        <HomeAction i={2} to="/find" title={t('home.find')} hint={t('home.findHint')} icon={<PinIcon />} />
      </div>

      <Link to="/about" style={{ '--i': 3 } as React.CSSProperties} className="rise self-start font-medium text-brand-strong underline underline-offset-2">
        {t('home.how')}
      </Link>
    </section>
  )
}

function HomeAction(props: { i: number; to: string; title: string; hint: string; primary?: boolean; icon: React.ReactNode }) {
  const tone = props.primary
    ? 'bg-brand text-white shadow-md hover:bg-brand-strong'
    : 'border-2 border-brand bg-surface text-ink hover:bg-brand-soft'
  return (
    <Link
      to={props.to}
      style={{ '--i': props.i } as React.CSSProperties}
      className={`rise pressable group flex min-h-24 items-center gap-4 rounded-2xl px-5 py-4 ${tone}`}
    >
      <span className={`grid size-12 shrink-0 place-items-center rounded-xl ${props.primary ? 'bg-white/15' : 'bg-brand-soft text-brand-strong'}`}>
        {props.icon}
      </span>
      <span className="flex flex-col">
        <span className="text-xl font-bold">{props.title}</span>
        <span className={props.primary ? 'text-white/85' : 'text-muted'}>{props.hint}</span>
      </span>
      <span aria-hidden className="ml-auto text-2xl transition-transform duration-300 ease-[var(--ease-out)] group-hover:translate-x-1 group-active:translate-x-1">→</span>
    </Link>
  )
}

function BillIcon() {
  return (
    <svg aria-hidden width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2z" />
      <path d="M9 7h6M9 11h6M9 15h3" />
    </svg>
  )
}

function PinIcon() {
  return (
    <svg aria-hidden width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  )
}
