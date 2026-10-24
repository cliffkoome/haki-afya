import type { Facility } from '../api/types'
import { useI18n } from '../i18n/I18nProvider'
import { facilityName } from '../lib/format'
import { CoverageBadge } from './CoverageBadge'
import { DemoPill } from './DemoPill'
import { Icon } from './Icon'

/** One facility in Find results: an editorial row, not a boxed card. */
export function FacilityCard({ facility, onGo }: { facility: Facility; onGo: (f: Facility) => void }) {
  const { t } = useI18n()

  return (
    <article className="flex flex-col gap-3 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[1.1875rem] leading-snug font-semibold tracking-[-0.01em] [overflow-wrap:anywhere]">{facilityName(facility.name)}</h3>
          <p className="money mt-0.5 text-[0.8125rem] text-muted">
            {t('results.km', { n: facility.distance_km.toFixed(1) })} · {t('common.level', { n: facility.level })}
            {facility.google && (
              <>
                {' '}· ★ {facility.google.rating.toFixed(1)} ({facility.google.user_rating_count.toLocaleString('en-KE')} {t('results.google')})
              </>
            )}
          </p>
        </div>
        {facility.is_demo && <DemoPill />}
      </div>

      {facility.benefit_summary && <p className="text-[0.9375rem] leading-relaxed text-ink-soft">{facility.benefit_summary}</p>}

      <CoverageBadge coverage={facility.coverage} />

      <button type="button" onClick={() => onGo(facility)} className="btn btn-primary mt-1 self-start rounded-full pr-4 pl-5">
        {t('results.goHere')}
        <Icon name="arrowRight" size={18} />
      </button>
    </article>
  )
}
