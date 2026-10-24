import type { Lang } from '../api/types'
import { useI18n } from '../i18n/I18nProvider'

const OPTIONS: Lang[] = ['en', 'sw']

export function LanguageToggle() {
  const { lang, setLang, t } = useI18n()

  return (
    <div role="radiogroup" aria-label={t('lang.label')} className="flex rounded-full bg-brand-soft p-1">
      {OPTIONS.map((option) => {
        const active = option === lang
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setLang(option)}
            className={`pressable min-h-10 min-w-12 rounded-full px-3 text-sm font-semibold ${
              active ? 'bg-brand text-white shadow-sm' : 'text-brand-strong'
            }`}
          >
            {t(option === 'en' ? 'lang.en' : 'lang.sw')}
          </button>
        )
      })}
    </div>
  )
}
