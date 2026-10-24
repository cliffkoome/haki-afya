import { useI18n } from '../i18n/I18nProvider'
import { Icon } from './Icon'

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div role="alert" className="flex items-start gap-3 rounded-xl border border-flag-free/25 bg-flag-free-soft p-4">
      <Icon name="info" className="mt-0.5 text-flag-free" />
      <div className="flex-1">
        <p className="leading-snug text-ink">{message ?? t('error.generic')}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="pressable mt-2 min-h-10 font-medium text-flag-free underline underline-offset-4">
            {t('error.retry')}
          </button>
        )}
      </div>
    </div>
  )
}
