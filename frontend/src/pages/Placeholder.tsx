import type { StringKey } from '../i18n/en'
import { useI18n } from '../i18n/I18nProvider'

/** Stand-in for pages not built yet, so every route in frontend.md resolves. */
export function Placeholder({ title }: { title: StringKey }) {
  const { t } = useI18n()
  return (
    <section>
      <h1 className="text-2xl font-bold">{t(title)}</h1>
      <p className="mt-2 text-muted">
        {t('placeholder.title')}. {t('placeholder.body')}
      </p>
    </section>
  )
}
