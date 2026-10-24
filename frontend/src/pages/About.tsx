import type { ReactNode } from 'react'
import { useI18n } from '../i18n/I18nProvider'

const GITHUB_URL = 'https://github.com/cliffkoome/haki-afya'

export function About() {
  const { t } = useI18n()

  return (
    <section className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold">{t('page.about')}</h1>

      <Block title={t('about.what')}>
        <p>{t('about.whatBody')}</p>
      </Block>

      <Block title={t('about.privacy')} icon="🔒">
        <p>{t('about.privacyBody')}</p>
      </Block>

      <Block title={t('about.how')}>
        <ol className="flex flex-col gap-3">
          {(['about.how1', 'about.how2', 'about.how3'] as const).map((key, i) => (
            <li key={key} className="flex gap-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">{i + 1}</span>
              <span className="pt-0.5">{t(key)}</span>
            </li>
          ))}
        </ol>
      </Block>

      <Block title={t('about.advice')} icon="⚖️">
        <p>{t('about.adviceBody')}</p>
      </Block>

      <Block title={t('about.demo')}>
        <p>{t('about.demoBody')}</p>
      </Block>

      <Block title={t('about.open')}>
        <p>{t('about.openBody')}</p>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className="pressable mt-3 inline-flex min-h-12 items-center rounded-xl bg-ink px-5 font-semibold text-white"
        >
          {t('about.github')} ↗
        </a>
      </Block>
    </section>
  )
}

function Block({ title, icon, children }: { title: string; icon?: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-4 leading-relaxed">
      <h2 className="mb-2 text-lg font-bold">
        {icon && <span aria-hidden className="mr-2">{icon}</span>}
        {title}
      </h2>
      {children}
    </div>
  )
}
