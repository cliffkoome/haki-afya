import type { CSSProperties } from 'react'
import { Link } from 'react-router'
import { Icon } from '../components/Icon'
import type { StringKey } from '../i18n/en'
import { useI18n } from '../i18n/I18nProvider'

const STEPS: StringKey[] = ['about.how1', 'about.how2', 'about.how3']
const at = (i: number) => ({ '--i': i }) as CSSProperties

export function Home() {
  const { t } = useI18n()

  return (
    <section className="flex flex-1 flex-col pt-6">
      <h1 className="rise display text-[2.875rem]" style={at(0)}>
        {t('home.title')} <em className="text-brand">{t('home.titleEm')}</em>
      </h1>
      <p className="rise mt-4 max-w-[34ch] text-[1.0625rem] leading-relaxed text-ink-soft" style={at(1)}>
        {t('home.lede')}
      </p>

      <div className="rise mt-8 flex flex-col gap-3" style={at(2)}>
        <Link to="/check" className="btn btn-primary w-full justify-between rounded-2xl py-4 pr-4 pl-5 text-[1.125rem]">
          <span className="flex items-center gap-3">
            <Icon name="camera" size={22} />
            {t('home.check')}
          </span>
          <Icon name="arrowRight" size={20} className="text-white/60" />
        </Link>

        <Link to="/find" className="row-hover pressable flex min-h-14 items-center justify-between gap-3 rounded-2xl border border-line-strong bg-surface px-5 py-4">
          <span className="flex items-center gap-3 font-medium">
            <Icon name="pin" size={22} className="text-brand" />
            {t('home.findRow')}
          </span>
          <Icon name="arrowRight" size={20} className="row-arrow text-muted" />
        </Link>
      </div>

      <div className="rise mt-12" style={at(3)}>
        <h2 className="label mb-1">{t('home.howTitle')}</h2>
        <ol>
          {STEPS.map((key, i) => (
            <li key={key} className="flex gap-4 border-b border-line py-3.5 last:border-b-0">
              <span className="money pt-0.5 text-[0.8125rem] text-muted">0{i + 1}</span>
              <span className="leading-snug text-ink-soft">{t(key)}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
