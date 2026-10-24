import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Area } from '../api/types'
import { useI18n } from '../i18n/I18nProvider'
import { AREAS } from '../lib/areas'
import type { Coords } from '../lib/location'
import { Icon } from './Icon'

/** Fallback when location is denied: pick a Nairobi area. Areas come from /api/areas, bundled copy as backup. */
export function AreaPicker({ onPick, onRetry }: { onPick: (coords: Coords) => void; onRetry: () => void }) {
  const { t } = useI18n()
  const [areas, setAreas] = useState<Area[]>(() => AREAS.map((a) => ({ id: a.name, ...a })))

  useEffect(() => {
    let cancelled = false
    api.areas().then(
      (r) => !cancelled && r.areas.length > 0 && setAreas(r.areas),
      () => {}, // keep the bundled list
    )
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <p className="flex items-start gap-2.5 text-[0.9375rem] leading-relaxed text-ink-soft">
        <Icon name="pin" size={18} className="mt-0.5 text-muted" />
        {t('location.denied')}
      </p>
      <label htmlFor="area" className="label">
        {t('location.pick')}
      </label>
      {areas.length > 0 ? (
        <div className="relative">
          <select
            id="area"
            defaultValue=""
            onChange={(e) => {
              const area = areas.find((a) => a.id === e.target.value)
              if (area) onPick({ lat: area.lat, lng: area.lng, area: area.name })
            }}
            className="field appearance-none pr-10"
          >
            <option value="" disabled>
              {t('location.pick')}…
            </option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={18} className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-muted" />
        </div>
      ) : (
        <p className="text-muted">{t('location.noAreas')}</p>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="pressable min-h-10 self-start text-[0.9375rem] font-medium underline decoration-line-strong underline-offset-4"
      >
        {t('location.useMine')}
      </button>
    </div>
  )
}
