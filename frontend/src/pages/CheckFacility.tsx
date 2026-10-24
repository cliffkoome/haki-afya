import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { api } from '../api/client'
import type { FacilitySearchResult } from '../api/types'
import { DemoPill } from '../components/DemoPill'
import { ErrorState } from '../components/ErrorState'
import { StepHeader } from '../components/StepHeader'
import type { StringKey } from '../i18n/en'
import { useI18n } from '../i18n/I18nProvider'
import { latestVisit } from '../lib/visits'
import { useBillCheck } from '../state/BillCheck'

const LEVELS = [2, 3, 4, 5, 6] as const
const MIN_QUERY = 2
const DEBOUNCE_MS = 250

type Search =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; facilities: FacilitySearchResult[] }
  | { status: 'error' }

export function CheckFacility() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { update } = useBillCheck()
  const [visit] = useState(latestVisit)
  const [notListed, setNotListed] = useState(false)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState<Search>({ status: 'idle' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const q = query.trim()
    if (q.length < MIN_QUERY) {
      setSearch({ status: 'idle' })
      return
    }
    let cancelled = false
    setSearch({ status: 'loading' })
    const timer = setTimeout(() => {
      api.searchFacilities(q).then(
        (r) => !cancelled && setSearch({ status: 'done', facilities: r.facilities }),
        () => !cancelled && setSearch({ status: 'error' }),
      )
    }, DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, attempt])

  function choose(facility: FacilitySearchResult) {
    update({ facility, level: facility.level })
    navigate('/check/questions')
  }

  function chooseLevel(level: number) {
    update({ facility: null, level })
    navigate('/check/questions')
  }

  if (notListed) {
    return (
      <section>
        <StepHeader step={1} title="facility.levelTitle" />
        <p className="-mt-2 mb-5 text-muted">{t('facility.levelHint')}</p>
        <div className="flex flex-col gap-2">
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => chooseLevel(level)}
              className="pressable flex min-h-14 items-center gap-4 rounded-xl border-2 border-line bg-surface px-4 text-left hover:border-brand"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-lg font-bold text-brand-strong">
                {level}
              </span>
              <span>
                <span className="block font-semibold">{t('common.level', { n: level })}</span>
                <span className="block text-sm text-muted">{t(`facility.level${level}` as StringKey)}</span>
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setNotListed(false)}
          className="pressable mt-5 min-h-11 font-medium text-brand-strong underline underline-offset-2"
        >
          {t('facility.backToSearch')}
        </button>
      </section>
    )
  }

  return (
    <section>
      <StepHeader step={1} title="page.check.facility" />

      {visit && (
        <div className="mb-6 rounded-2xl border-2 border-brand bg-brand-soft p-4">
          <p className="flex flex-wrap items-center gap-2 text-lg font-semibold">
            {t('facility.recent', { name: visit.facility_name })}
            {visit.is_demo && <DemoPill />}
          </p>
          <button
            type="button"
            onClick={() =>
              choose({ id: visit.facility_id, name: visit.facility_name, level: visit.facility_level, is_demo: visit.is_demo })
            }
            className="pressable mt-3 min-h-12 w-full rounded-xl bg-brand px-4 font-semibold text-white"
          >
            {t('facility.recentYes')}
          </button>
        </div>
      )}

      <label htmlFor="facility-search" className="mb-2 block font-semibold">
        {t('facility.searchLabel')}
      </label>
      <input
        id="facility-search"
        type="search"
        autoComplete="off"
        autoFocus={!visit}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t('facility.searchPlaceholder')}
        className="min-h-14 w-full rounded-xl border-2 border-line bg-surface px-4 text-lg outline-none focus:border-brand"
      />

      <div className="mt-3 min-h-16" aria-live="polite">
        {search.status === 'loading' && <p className="px-1 py-3 text-muted">{t('facility.searching')}</p>}
        {search.status === 'error' && <ErrorState onRetry={() => setAttempt((n) => n + 1)} />}
        {search.status === 'done' && search.facilities.length === 0 && (
          <p className="px-1 py-3 text-muted">{t('facility.noResults')}</p>
        )}
        {search.status === 'done' && search.facilities.length > 0 && (
          <ul className="flex flex-col gap-2">
            {search.facilities.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => choose(f)}
                  className="pressable flex min-h-14 w-full items-center justify-between gap-3 rounded-xl border-2 border-line bg-surface px-4 py-3 text-left hover:border-brand"
                >
                  <span>
                    <span className="block font-semibold">{f.name}</span>
                    <span className="block text-sm text-muted">{t('common.level', { n: f.level })}</span>
                  </span>
                  {f.is_demo && <DemoPill />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => setNotListed(true)}
        className="pressable mt-2 min-h-12 w-full rounded-xl border-2 border-dashed border-line px-4 font-semibold text-brand-strong hover:border-brand"
      >
        {t('facility.notListed')}
      </button>
    </section>
  )
}
