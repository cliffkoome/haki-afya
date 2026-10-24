import type { Lang } from '../api/types'
import { useI18n } from '../i18n/I18nProvider'

const OPTIONS: Lang[] = ['en', 'sw']

export function LanguageToggle() {
  const { lang, setLang, t } = useI18n()

  return (
    <div role="radiogroup" aria-label={t('lang.label')} className="relative grid grid-cols-2 rounded-full bg-brand-soft p-1">
      {/* The pill slides to the active language instead of jumping. */}
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-brand shadow-sm transition-transform duration-300 ease-[var(--ease-out)] motion-reduce:transition-none"
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
            className={`pressable relative min-h-10 min-w-12 rounded-full px-3 text-sm font-semibold transition-colors duration-300 ${
              active ? 'text-white' : 'text-brand-strong'
            }`}
          >
            {t(option === 'en' ? 'lang.en' : 'lang.sw')}
          </button>
        )
      })}
    </div>
  )
}
