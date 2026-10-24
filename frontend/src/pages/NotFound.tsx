import { Link } from 'react-router'
import { Icon } from '../components/Icon'
import { useI18n } from '../i18n/I18nProvider'

export function NotFound() {
  const { t } = useI18n()
  return (
    <section className="flex flex-col items-start gap-4 pt-10">
      <p className="money text-muted">404</p>
      <h1 className="display text-[2.75rem]">{t('notFound.title')}</h1>
      <p className="text-ink-soft">{t('notFound.body')}</p>
      <Link to="/" className="btn btn-primary mt-2">
        <Icon name="arrowLeft" size={18} />
        {t('nav.home')}
      </Link>
    </section>
  )
}
