import type { CSSProperties } from 'react'
import { Icon } from '../components/Icon'
import type { StringKey } from '../i18n/en'
import { useI18n } from '../i18n/I18nProvider'

const GITHUB_URL = 'https://github.com/cliffkoome/haki-afya'
const at = (i: number) => ({ '--i': i }) as CSSProperties

const SECTIONS: { title: StringKey; body: StringKey }[] = [
  { title: 'about.privacy', body: 'about.privacyBody' },
  { title: 'about.advice', body: 'about.adviceBody' },
  { title: 'about.demo', body: 'about.demoBody' },
]

export function About() {
  const { t } = useI18n()

  return (
    <section className="flex flex-col pt-2">
      <h1 className="rise display text-[2.75rem]" style={at(0)}>
        {t('page.about')}
      </h1>
      <p className="rise mt-4 text-[1.0625rem] leading-relaxed text-ink-soft" style={at(1)}>
        {t('about.whatBody')}
      </p>

      <div className="rise mt-10" style={at(2)}>
        <h2 className="label mb-1">{t('about.how')}</h2>
        <ol>
          {(['about.how1', 'about.how2', 'about.how3'] as const).map((key, i) => (
            <li key={key} className="flex gap-4 border-b border-line py-4 last:border-b-0">
              <span className="display w-5 text-[1.75rem] leading-none text-brand">{i + 1}</span>
              <span className="leading-relaxed">{t(key)}</span>
            </li>
          ))}
        </ol>
      </div>

      {SECTIONS.map((s, i) => (
        <div key={s.title} className="rise mt-6 border-t border-line pt-5" style={at(i + 3)}>
          <h2 className="text-[1.0625rem] font-semibold">{t(s.title)}</h2>
          <p className="mt-1.5 leading-relaxed text-ink-soft">{t(s.body)}</p>
        </div>
      ))}

      <div className="rise mt-10 rounded-2xl bg-ink p-6 text-white" style={at(6)}>
        <h2 className="display text-[1.75rem]">{t('about.open')}</h2>
        <p className="mt-2 leading-relaxed text-white/75">{t('about.openBody')}</p>
        <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="btn mt-5 bg-white text-ink">
          {t('about.github')}
          <Icon name="external" size={17} />
        </a>
      </div>
    </section>
  )
}
