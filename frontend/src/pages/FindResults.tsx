import { lazy, Suspense, useEffect, useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router'
import { api } from '../api/client'
import { SERVICE_CATEGORIES, type Facility, type ServiceCategory } from '../api/types'
import { AreaPicker } from '../components/AreaPicker'
import { ErrorState } from '../components/ErrorState'
import { FacilityCard } from '../components/FacilityCard'
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
  const selected = facilities.find((f) => f.id === selectedId)

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl leading-tight font-bold">{t('results.title', { service: t(`service.${service}`) })}</h1>
        {coords && load.status === 'done' && facilities.length > 0 && (
          <div role="radiogroup" className="flex shrink-0 rounded-full bg-brand-soft p-1">
            {(['list', 'map'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={view === v}
                onClick={() => setView(v)}
                className={`pressable min-h-10 rounded-full px-3 text-sm font-semibold ${
                  view === v ? 'bg-brand text-white shadow-sm' : 'text-brand-strong'
                }`}
              >
                {t(v === 'list' ? 'results.list' : 'results.map')}
              </button>
            ))}
          </div>
        )}
      </div>

      {coords?.area && (
        <p className="-mt-2 text-muted">
          {t('location.near', { area: coords.area })} ·{' '}
          <button type="button" onClick={location.changeArea} className="font-medium text-brand-strong underline underline-offset-2">
            {t('location.change')}
          </button>
        </p>
      )}

      {location.state.status === 'locating' && <p className="py-6 text-center text-muted">{t('location.locating')}</p>}
      {location.state.status === 'denied' && <AreaPicker onPick={location.chooseArea} onRetry={location.request} />}

      {coords && load.status === 'loading' && <p className="py-6 text-center text-muted">{t('results.loading')}</p>}
      {coords && load.status === 'error' && <ErrorState onRetry={() => setAttempt((n) => n + 1)} />}
      {coords && load.status === 'done' && facilities.length === 0 && (
        <div className="flex flex-col items-start gap-3 py-4">
          <p className="text-lg">{t('results.empty')}</p>
          <Link to="/find" className="font-semibold text-brand-strong underline underline-offset-2">
            {t('results.emptyBack')}
          </Link>
        </div>
      )}

      {coords && facilities.length > 0 && view === 'list' && (
        <div className="flex flex-col gap-3">
          {facilities.map((f, i) => (
            <div key={f.id} className="rise" style={{ '--i': i } as React.CSSProperties}>
              <FacilityCard facility={f} onGo={goHere} />
            </div>
          ))}
        </div>
      )}

      {coords && facilities.length > 0 && view === 'map' && (
        <>
          <Suspense fallback={<div className="h-[55dvh] animate-pulse rounded-2xl bg-line" />}>
            <FacilityMap facilities={facilities} center={coords} selectedId={selectedId} onSelect={setSelectedId} />
          </Suspense>
          {selected && (
            <div key={selected.id} className="rise">
              <FacilityCard facility={selected} onGo={goHere} />
            </div>
          )}
        </>
      )}
    </section>
  )
}
