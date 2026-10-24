import { useI18n } from '../i18n/I18nProvider'
import { AREAS } from '../lib/areas'
import type { Coords } from '../lib/location'

/** Fallback when location is denied or unavailable: pick a Nairobi area. */
export function AreaPicker({ onPick, onRetry }: { onPick: (coords: Coords) => void; onRetry: () => void }) {
  const { t } = useI18n()

  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-xl bg-flag-above-soft p-3 leading-relaxed">{t('location.denied')}</p>
      <label htmlFor="area" className="font-semibold">
        {t('location.pick')}
      </label>
      {AREAS.length > 0 ? (
        <select
          id="area"
          defaultValue=""
          onChange={(e) => {
            const area = AREAS[Number(e.target.value)]
            if (area) onPick({ lat: area.lat, lng: area.lng, area: area.name })
          }}
          className="min-h-14 w-full rounded-xl border-2 border-line bg-surface px-4 text-lg outline-none focus:border-brand"
        >
          <option value="" disabled>
            {t('location.pick')}…
          </option>
          {AREAS.map((area, i) => (
            <option key={area.name} value={i}>
              {area.name}
            </option>
          ))}
        </select>
      ) : (
        <p className="text-muted">{t('location.noAreas')}</p>
      )}
      <button
        type="button"
        onClick={onRetry}
        className="pressable min-h-11 self-start font-medium text-brand-strong underline underline-offset-2"
      >
        {t('location.useMine')}
      </button>
    </div>
  )
}
