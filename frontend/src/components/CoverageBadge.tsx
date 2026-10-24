import type { CoverageCounts } from '../api/types'
import { useI18n } from '../i18n/I18nProvider'

/** Coverage Report counts: patterns only, neutral colours, Verified and Unverified kept apart. */
export function CoverageBadge({ coverage }: { coverage: CoverageCounts }) {
  const { t } = useI18n()
  const paid = coverage.verified_paid + coverage.unverified_paid
  const free = coverage.verified_free + coverage.unverified_free
  const total = paid + free

  return (
    <div className="text-[0.875rem]">
      <p className="label mb-1.5">{t('results.reportsWindow', { n: coverage.window_days })}</p>
      {total === 0 ? (
        <p className="text-muted">{t('results.noReports')}</p>
      ) : (
        <>
          {/* Share of reports at a glance: free in green, paid in neutral ink. */}
          <div aria-hidden className="mb-2 flex h-1 overflow-hidden rounded-full bg-line">
            <span className="grow-x h-full bg-brand" style={{ width: `${(free / total) * 100}%` }} />
            <span className="h-full bg-ink/35" style={{ width: `${(paid / total) * 100}%` }} />
          </div>
          <ul className="flex flex-col gap-0.5 text-ink-soft">
            {free > 0 && <li>{t('results.free', { verified: coverage.verified_free, unverified: coverage.unverified_free })}</li>}
            {paid > 0 && <li>{t('results.paid', { verified: coverage.verified_paid, unverified: coverage.unverified_paid })}</li>}
          </ul>
        </>
      )}
    </div>
  )
}
