import { useNavigate } from 'react-router'
import type { StringKey } from '../i18n/en'
import { useI18n } from '../i18n/I18nProvider'

/** Back button, "Step n of 3" and the page title for the Bill Check wizard. */
export function StepHeader({ step, title }: { step: number; title: StringKey }) {
  const { t } = useI18n()
  const navigate = useNavigate()

  return (
    <div className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="pressable -ml-2 flex min-h-10 items-center gap-1 rounded-lg px-2 font-medium text-brand-strong"
        >
          <span aria-hidden>←</span> {t('nav.back')}
        </button>
        <span className="text-sm font-medium text-muted">{t('check.step', { n: step })}</span>
      </div>
      <div className="mb-4 flex gap-1.5" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span key={n} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
            {n <= step && <span className={`block h-full rounded-full bg-brand ${n === step ? 'grow-x' : ''}`} />}
          </span>
        ))}
      </div>
      <h1 className="text-2xl font-bold">{t(title)}</h1>
    </div>
  )
}
