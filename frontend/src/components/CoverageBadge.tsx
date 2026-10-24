import type { CoverageCounts } from '../api/types'
import { useI18n } from '../i18n/I18nProvider'

/** Coverage Report counts: patterns only, neutral colours, Verified and Unverified kept apart. */
export function CoverageBadge({ coverage }: { coverage: CoverageCounts }) {
  const { t } = useI18n()
  const paid = coverage.verified_paid + coverage.unverified_paid
  const free = coverage.verified_free + coverage.unverified_free

  return (
    <div className="rounded-xl bg-canvas p-3 text-sm">
      <p className="mb-1.5 font-semibold text-muted">{t('results.reportsWindow', { n: coverage.window_days })}</p>
      {paid + free === 0 ? (
        <p className="text-muted">{t('results.noReports')}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {paid > 0 && (
            <li className="flex gap-2">
              <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-flag-unclear" />
              {t('results.paid', { verified: coverage.verified_paid, unverified: coverage.unverified_paid })}
            </li>
          )}
          {free > 0 && (
            <li className="flex gap-2">
              <span aria-hidden className="mt-1.5 size-2 shrink-0 rounded-full bg-brand" />
              {t('results.free', { verified: coverage.verified_free, unverified: coverage.unverified_free })}
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
