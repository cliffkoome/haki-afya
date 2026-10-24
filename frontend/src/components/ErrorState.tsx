import { useI18n } from '../i18n/I18nProvider'

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div role="alert" className="rounded-xl border border-flag-free/30 bg-flag-free-soft p-4">
      <p className="font-medium text-flag-free">{message ?? t('error.generic')}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="pressable mt-3 min-h-11 rounded-lg bg-surface px-4 font-semibold text-flag-free shadow-sm"
        >
          {t('error.retry')}
        </button>
      )}
    </div>
  )
}
