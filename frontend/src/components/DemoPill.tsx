import { useI18n } from '../i18n/I18nProvider'

/** Marks a Demo Facility: fictional, for demonstration only. */
export function DemoPill() {
  const { t } = useI18n()
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dashed border-flag-above/50 px-2 py-0.5 text-[0.75rem] font-medium text-flag-above">
      <span aria-hidden className="size-1.5 rounded-full bg-flag-above" />
      {t('common.demo')}
    </span>
  )
}
