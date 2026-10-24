import { Link } from 'react-router'
import { useI18n } from '../i18n/I18nProvider'

export function NotFound() {
  const { t } = useI18n()
  return (
    <section className="flex flex-col items-start gap-4">
      <h1 className="text-2xl font-bold">{t('notFound.title')}</h1>
      <p className="text-muted">{t('notFound.body')}</p>
      <Link to="/" className="pressable inline-flex min-h-12 items-center rounded-xl bg-brand px-5 font-semibold text-white">
        {t('nav.home')}
      </Link>
    </section>
  )
}
