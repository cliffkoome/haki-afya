import { useNavigate } from 'react-router'
import type { StringKey } from '../i18n/en'
import { useI18n } from '../i18n/I18nProvider'
import { Icon } from './Icon'

/** Back, "Step n of 3" with a hairline progress, and the serif page title. */
export function StepHeader({ step, title }: { step: number; title: StringKey }) {
  const { t } = useI18n()
  const navigate = useNavigate()

  return (
    <div className="mb-7">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          aria-label={t('nav.back')}
          onClick={() => navigate(-1)}
          className="pressable -ml-1 grid size-10 place-items-center rounded-full border border-line-strong bg-surface"
        >
          <Icon name="arrowLeft" size={18} />
        </button>
        <div className="relative h-0.5 flex-1 overflow-hidden rounded-full bg-line" aria-hidden>
          <span
            className="grow-x absolute inset-y-0 left-0 rounded-full bg-brand"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
        <span className="money text-[0.8125rem] whitespace-nowrap text-muted">{t('check.step', { n: step })}</span>
      </div>
      <h1 className="display text-[2.375rem]">{t(title)}</h1>
    </div>
  )
}
