import type { Flag, FlagType, LineItem } from '../api/types'
import { useI18n } from '../i18n/I18nProvider'
import { kes } from '../lib/format'
import { Icon } from './Icon'

export const FLAG_TONE: Record<FlagType, { dot: string; text: string }> = {
  should_be_free: { dot: 'bg-flag-free', text: 'text-flag-free' },
  above_tariff: { dot: 'bg-flag-above', text: 'text-flag-above' },
  unclear: { dot: 'bg-flag-unclear', text: 'text-flag-unclear' },
  payable: { dot: 'bg-flag-payable', text: 'text-flag-payable' },
}

/** Display order on the result page: Should Be Free → Above Tariff → Unclear → Payable. */
export const FLAG_ORDER: FlagType[] = ['should_be_free', 'above_tariff', 'unclear', 'payable']

/** One Line Item on the receipt, annotated with its Flag. */
export function FlagCard({ flag, item }: { flag: Flag; item: LineItem | undefined }) {
  const { t } = useI18n()
  const tone = FLAG_TONE[flag.flag]

  return (
    <div className="py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`flex items-center gap-2 text-[0.8125rem] font-medium ${tone.text}`}>
            <span aria-hidden className={`size-2 rounded-full ${tone.dot}`} />
            {t(`flag.${flag.flag}`)}
          </p>
          <h3 className="mt-1 text-[1.0625rem] leading-snug font-medium [overflow-wrap:anywhere]">{item?.description ?? '—'}</h3>
          {(flag.tariff_kes != null || (item && item.quantity > 1)) && (
            <p className="money mt-0.5 text-[0.8125rem] text-muted">
              {item && item.quantity > 1 && <span className="whitespace-nowrap">{`${item.quantity} × ${kes(item.unit_price_kes)}`}</span>}
              {flag.tariff_kes != null && (
                <span className="whitespace-nowrap">
                  {item && item.quantity > 1 && ' · '}
                  {`${t('result.tariff')} ${kes(flag.tariff_kes)}`}
                </span>
              )}
            </p>
          )}
        </div>
        <p className="money shrink-0 text-[1.0625rem] font-medium">{kes(flag.charged_kes)}</p>
      </div>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-soft">{flag.message}</p>
      {flag.source_url && (
        <a
          href={flag.source_url}
          target="_blank"
          rel="noreferrer"
          className="mt-1.5 inline-flex items-center gap-1 text-[0.8125rem] font-medium text-muted underline decoration-line-strong underline-offset-4"
        >
          {t('result.source')}
          <Icon name="external" size={13} />
        </a>
      )}
    </div>
  )
}
