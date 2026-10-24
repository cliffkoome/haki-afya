import type { Flag, FlagType, LineItem } from '../api/types'
import { useI18n } from '../i18n/I18nProvider'
import { kes } from '../lib/format'

const STYLE: Record<FlagType, { icon: string; card: string; text: string }> = {
  should_be_free: { icon: '🔴', card: 'border-flag-free/40 bg-flag-free-soft', text: 'text-flag-free' },
  above_tariff: { icon: '🟡', card: 'border-flag-above/40 bg-flag-above-soft', text: 'text-flag-above' },
  unclear: { icon: '⚪', card: 'border-flag-unclear/40 bg-flag-unclear-soft', text: 'text-flag-unclear' },
  payable: { icon: '🟢', card: 'border-flag-payable/40 bg-flag-payable-soft', text: 'text-flag-payable' },
}

/** Display order on the result page: 🔴 → 🟡 → ⚪ → 🟢. */
export const FLAG_ORDER: FlagType[] = ['should_be_free', 'above_tariff', 'unclear', 'payable']

export function FlagCard({ flag, item }: { flag: Flag; item: LineItem | undefined }) {
  const { t } = useI18n()
  const style = STYLE[flag.flag]

  return (
    <article className={`rounded-2xl border-2 p-4 ${style.card}`}>
      <p className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wide ${style.text}`}>
        <span aria-hidden>{style.icon}</span>
        {t(`flag.${flag.flag}`)}
      </p>
      <div className="mt-2 flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 text-lg font-semibold [overflow-wrap:anywhere]">{item?.description ?? '—'}</h3>
        <span className="shrink-0 text-lg font-bold tabular-nums">{kes(flag.charged_kes)}</span>
      </div>
      {flag.tariff_kes != null && (
        <p className="mt-1 text-sm text-muted">
          {t('result.tariff')}: <span className="font-semibold tabular-nums text-ink">{kes(flag.tariff_kes)}</span>
          {item && item.quantity > 1 && <> · {t('result.charged')}: {item.quantity} × {kes(item.unit_price_kes)}</>}
        </p>
      )}
      <p className="mt-3 leading-relaxed">{flag.message}</p>
      {flag.source_url && (
        <a
          href={flag.source_url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-sm font-medium text-brand-strong underline underline-offset-2"
        >
          {t('result.source')} ↗
        </a>
      )}
    </article>
  )
}
