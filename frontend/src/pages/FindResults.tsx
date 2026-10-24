import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { api } from '../api/client'
import { SERVICE_CATEGORIES, type Facility, type ServiceCategory } from '../api/types'
import { AreaPicker } from '../components/AreaPicker'
import { ErrorState } from '../components/ErrorState'
import { FacilityCard } from '../components/FacilityCard'
import { Icon } from '../components/Icon'
import { useI18n } from '../i18n/I18nProvider'
import { useUserLocation } from '../lib/location'
import { directionsUrl } from '../lib/maps'
import { saveVisit } from '../lib/visits'

const FacilityMap = lazy(() => import('../components/FacilityMap'))

type Load = { status: 'loading' } | { status: 'done'; facilities: Facility[] } | { status: 'error' }

export function FindResults() {
  const { t, lang } = useI18n()
  const [params] = useSearchParams()
  const service = params.get('service') as ServiceCategory | null
  const location = useUserLocation()
  const [load, setLoad] = useState<Load>({ status: 'loading' })
  const [view, setView] = useState<'list' | 'map'>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const coords = location.state.status === 'ready' ? location.state.coords : null

  useEffect(() => {
    if (!coords || !service) return
    let cancelled = false
    setLoad({ status: 'loading' })
    api.facilities({ service_category: service, lat: coords.lat, lng: coords.lng, lang }).then(
      (r) => !cancelled && setLoad({ status: 'done', facilities: r.facilities }),
      () => !cancelled && setLoad({ status: 'error' }),
    )
    return () => {
      cancelled = true
    }
  }, [coords, service, lang, attempt])

  if (!service || !SERVICE_CATEGORIES.includes(service)) return <Navigate to="/find" replace />
  if (service === 'emergency') return <Navigate to="/emergency" replace />

  function goHere(f: Facility) {
    saveVisit({ facility_id: f.id, facility_name: f.name, facility_level: f.level, is_demo: f.is_demo, service_category: service! })
    window.open(directionsUrl(f.lat, f.lng), '_blank', 'noopener')
  }

  const facilities = load.status === 'done' ? load.facilities : []
  // "for maternity" mid-sentence in the Coverage wording.
  const categoryLabel = t(`service.${service}`).replace(/^./, (c) => c.toLowerCase())
  const selected = facilities.find((f) => f.id === selectedId)

  return (
    <section className="flex flex-col">
      <div className="mb-2 flex items-end justify-between gap-3">
        <h1 className="display text-[2.375rem]">{t('results.title', { service: t(`service.${service}`) })}</h1>
        {coords && load.status === 'done' && facilities.length > 0 && (
          <div role="radiogroup" className="relative mb-1 grid shrink-0 grid-cols-2 rounded-full border border-line-strong bg-surface p-0.5">
            <span
              aria-hidden
              className="absolute inset-y-0.5 left-0.5 w-[calc(50%-0.125rem)] rounded-full bg-ink transition-transform duration-200 ease-[var(--ease-out)] motion-reduce:transition-none"
              style={{ transform: `translateX(${view === 'map' ? 100 : 0}%)` }}
            />
            {(['list', 'map'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={view === v}
                aria-label={t(v === 'list' ? 'results.list' : 'results.map')}
                onClick={() => setView(v)}
                className={`pressable relative grid size-9 place-items-center rounded-full transition-colors duration-200 ${
                  view === v ? 'text-white' : 'text-muted'
                }`}
              >
                <Icon name={v} size={17} />
              </button>
            ))}
          </div>
        )}
      </div>

      {coords?.area && (
        <p className="mb-2 flex items-center gap-1.5 text-[0.875rem] text-muted">
          <Icon name="pin" size={15} />
          {t('location.near', { area: coords.area })} ·
          <button type="button" onClick={location.changeArea} className="font-medium text-ink underline decoration-line-strong underline-offset-4">
            {t('location.change')}
          </button>
        </p>
      )}

      {location.state.status === 'locating' && <p className="py-8 text-muted">{t('location.locating')}</p>}
      {location.state.status === 'denied' && (
        <div className="mt-4">
          <AreaPicker onPick={location.chooseArea} onRetry={location.request} />
        </div>
      )}

      {coords && load.status === 'loading' && <p className="py-8 text-muted">{t('results.loading')}</p>}
      {coords && load.status === 'error' && <ErrorState onRetry={() => setAttempt((n) => n + 1)} />}
      {coords && load.status === 'done' && facilities.length === 0 && (
        <div className="flex flex-col items-start gap-3 py-6">
          <p className="text-[1.0625rem] leading-relaxed text-ink-soft">{t('results.empty')}</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={location.changeArea} className="btn btn-primary rounded-full">
              <Icon name="pin" size={18} />
              {t('results.otherArea')}
            </button>
            <Link to="/find" className="btn btn-secondary rounded-full">
              {t('results.emptyBack')}
            </Link>
          </div>
        </div>
      )}

      {coords && facilities.length > 0 && view === 'list' && (
        <div>
          {facilities.map((f, i) => (
            <div key={f.id} className="rise border-b border-line last:border-b-0" style={{ '--i': Math.min(i, 8) } as React.CSSProperties}>
              <FacilityCard facility={f} category={categoryLabel} onGo={goHere} />
            </div>
          ))}
        </div>
      )}

      {coords && facilities.length > 0 && view === 'map' && (
        <div className="mt-2">
          <Suspense fallback={<div className="h-[55dvh] animate-pulse rounded-2xl bg-paper" />}>
            <FacilityMap facilities={facilities} center={coords} selectedId={selectedId} onSelect={setSelectedId} />
          </Suspense>
          {selected && (
            <div key={selected.id} className="rise">
              <FacilityCard facility={selected} category={categoryLabel} onGo={goHere} />
            </div>
          )}
        </div>
      )}
    </section>
  )
}
