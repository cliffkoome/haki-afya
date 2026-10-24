import { useI18n } from '../i18n/I18nProvider'

/** Marks a Demo Facility: fictional, for demonstration only. */
export function DemoPill() {
  const { t } = useI18n()
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-flag-above/30 bg-flag-above-soft px-2 py-0.5 text-xs font-semibold text-flag-above">
      {t('common.demo')}
    </span>
  )
}
