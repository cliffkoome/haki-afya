import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Facility } from '../api/types'
import { AreaPicker } from '../components/AreaPicker'
import { useI18n } from '../i18n/I18nProvider'
import { useUserLocation } from '../lib/location'
import { directionsUrl } from '../lib/maps'

const NUMBERS = ['999', '112']

/** Nothing else on this page: red, calm, fast (document.md rule 2). */
export function Emergency() {
  const { t, lang } = useI18n()
  const location = useUserLocation()
  const [facilities, setFacilities] = useState<Facility[] | null>(null)
  const coords = location.state.status === 'ready' ? location.state.coords : null

  useEffect(() => {
    if (!coords) return
    let cancelled = false
    api.facilities({ service_category: 'emergency', lat: coords.lat, lng: coords.lng, lang }).then(
      (r) => !cancelled && setFacilities(r.facilities),
      () => !cancelled && setFacilities([]),
    )
    return () => {
      cancelled = true
    }
  }, [coords, lang])

  return (
    <section className="-mx-4 -my-5 flex flex-1 flex-col gap-5 bg-emergency px-4 py-6 text-white">
      <h1 className="text-3xl leading-tight font-bold text-balance">{t('emergency.headline')}</h1>
      <p className="text-lg leading-relaxed text-white/90">{t('emergency.body')}</p>

      <div className="grid grid-cols-2 gap-3">
        {NUMBERS.map((n) => (
          <a
            key={n}
            href={`tel:${n}`}
            className="pressable flex min-h-16 items-center justify-center gap-2 rounded-2xl bg-white text-xl font-bold text-emergency shadow-md"
          >
            <span aria-hidden>📞</span> {t('emergency.call', { n })}
          </a>
        ))}
      </div>

      <div className="rounded-2xl bg-white p-4 text-ink">
        <h2 className="mb-3 font-bold">{t('emergency.nearest')}</h2>
        {location.state.status === 'locating' && <p className="text-muted">{t('location.locating')}</p>}
        {location.state.status === 'denied' && <AreaPicker onPick={location.chooseArea} onRetry={location.request} />}
        {coords && facilities == null && <p className="text-muted">{t('results.loading')}</p>}
        {facilities?.length === 0 && <p className="text-muted">{t('results.empty')}</p>}
        {facilities && facilities.length > 0 && (
          <ul className="flex flex-col divide-y divide-line">
            {facilities.slice(0, 5).map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 py-3">
                <span>
                  <span className="block font-semibold">{f.name}</span>
                  <span className="text-sm text-muted">{t('results.km', { n: f.distance_km.toFixed(1) })}</span>
                </span>
                <a
                  href={directionsUrl(f.lat, f.lng)}
                  target="_blank"
                  rel="noreferrer"
                  className="pressable flex min-h-12 shrink-0 items-center rounded-xl bg-emergency px-4 font-semibold text-white"
                >
                  {t('emergency.directions')}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
