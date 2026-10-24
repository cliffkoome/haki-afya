import { useEffect, useState, type CSSProperties } from 'react'
import { api } from '../api/client'
import type { Facility } from '../api/types'
import { AreaPicker } from '../components/AreaPicker'
import { Icon } from '../components/Icon'
import { useI18n } from '../i18n/I18nProvider'
import { facilityName } from '../lib/format'
import { useUserLocation } from '../lib/location'
import { directionsUrl } from '../lib/maps'

const NUMBERS = ['999', '112']
const at = (i: number) => ({ '--i': i }) as CSSProperties

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
    <section className="-mx-5 -mt-4 -mb-8 flex flex-1 flex-col gap-6 bg-emergency px-5 pt-8 pb-10 text-white">
      <h1 className="rise display text-[2.75rem]" style={at(0)}>
        {t('emergency.headline')}
      </h1>
      <p className="rise text-[1.0625rem] leading-relaxed text-white/85" style={at(1)}>
        {t('emergency.body')}
      </p>

      <div className="grid grid-cols-2 gap-2">
        {NUMBERS.map((n, i) => (
          <a
            key={n}
            href={`tel:${n}`}
            style={at(i + 2)}
            className="rise pressable flex min-h-16 items-center justify-center gap-2.5 rounded-2xl bg-white text-[1.25rem] font-semibold text-emergency"
          >
            <Icon name="phone" size={20} />
            {t('emergency.call', { n })}
          </a>
        ))}
      </div>

      <div className="rise rounded-2xl bg-white p-5 text-ink" style={at(4)}>
        <h2 className="label mb-2">{t('emergency.nearest')}</h2>
        {location.state.status === 'locating' && <p className="py-2 text-muted">{t('location.locating')}</p>}
        {location.state.status === 'denied' && <AreaPicker onPick={location.chooseArea} onRetry={location.request} />}
        {coords && facilities == null && <p className="py-2 text-muted">{t('results.loading')}</p>}
        {facilities?.length === 0 && <p className="py-2 text-muted">{t('results.empty')}</p>}
        {facilities && facilities.length > 0 && (
          <ul>
            {facilities.slice(0, 5).map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3 border-b border-line py-3 last:border-b-0">
                <span className="min-w-0">
                  <span className="block leading-snug font-medium [overflow-wrap:anywhere]">{facilityName(f.name)}</span>
                  <span className="money text-[0.8125rem] text-muted">{t('results.km', { n: f.distance_km.toFixed(1) })}</span>
                </span>
                <a
                  href={directionsUrl(f.lat, f.lng)}
                  target="_blank"
                  rel="noreferrer"
                  className="pressable inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-emergency px-4 font-medium text-white"
                >
                  {t('emergency.directions')}
                  <Icon name="arrowRight" size={16} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
