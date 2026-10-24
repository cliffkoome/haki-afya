import type { Lang } from '../api/types'
import { useI18n } from '../i18n/I18nProvider'

const OPTIONS: Lang[] = ['en', 'sw']

export function LanguageToggle() {
  const { lang, setLang, t } = useI18n()

  return (
    <div role="radiogroup" aria-label={t('lang.label')} className="relative grid grid-cols-2 rounded-full border border-line-strong bg-surface p-0.5">
      {/* The pill slides to the active language instead of jumping. */}
      <span
        aria-hidden
        className="absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-full bg-ink transition-transform duration-200 ease-[var(--ease-out)] motion-reduce:transition-none"
        style={{ transform: `translateX(${OPTIONS.indexOf(lang) * 100}%)` }}
      />
      {OPTIONS.map((option) => {
        const active = option === lang
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setLang(option)}
            className={`pressable relative min-h-9 min-w-11 rounded-full px-3 text-[0.8125rem] font-semibold tracking-wide transition-colors duration-200 ${
              active ? 'text-white' : 'text-muted'
            }`}
          >
            {t(option === 'en' ? 'lang.en' : 'lang.sw')}
          </button>
        )
      })}
    </div>
  )
}
