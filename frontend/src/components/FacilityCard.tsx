import type { Facility } from '../api/types'
import { useI18n } from '../i18n/I18nProvider'
import { CoverageBadge } from './CoverageBadge'
import { DemoPill } from './DemoPill'

/** Full card for Find results. Emergency uses its own minimal row. */
export function FacilityCard({ facility, onGo }: { facility: Facility; onGo: (f: Facility) => void }) {
  const { t } = useI18n()

  return (
    <article className="flex flex-col gap-3 rounded-2xl border-2 border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg leading-snug font-bold">{facility.name}</h3>
          <p className="text-sm text-muted">
            {t('common.level', { n: facility.level })} · {t('results.km', { n: facility.distance_km.toFixed(1) })}
          </p>
        </div>
        {facility.is_demo && <DemoPill />}
      </div>

      {facility.benefit_summary && <p className="leading-relaxed">{facility.benefit_summary}</p>}

      <CoverageBadge coverage={facility.coverage} />

      {facility.google && (
        <p className="text-sm text-muted">
          <span className="font-semibold text-ink">★ {facility.google.rating.toFixed(1)}</span> (
          {facility.google.user_rating_count.toLocaleString('en-KE')}) · {t('results.google')}
        </p>
      )}

      <button
        type="button"
        onClick={() => onGo(facility)}
        className="pressable min-h-12 rounded-xl bg-brand px-4 font-semibold text-white hover:bg-brand-strong"
      >
        {t('results.goHere')} →
      </button>
    </article>
  )
}
