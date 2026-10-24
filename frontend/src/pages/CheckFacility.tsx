import { useEffect, useState, type CSSProperties } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { api } from '../api/client'
import type { FacilitySearchResult } from '../api/types'
import { DemoPill } from '../components/DemoPill'
import { ErrorState } from '../components/ErrorState'
import { Icon } from '../components/Icon'
import { StepHeader } from '../components/StepHeader'
import type { StringKey } from '../i18n/en'
import { useI18n } from '../i18n/I18nProvider'
import { facilityName } from '../lib/format'
import { latestVisit, type Visit } from '../lib/visits'
import { useBillCheck } from '../state/BillCheck'

const LEVELS = [2, 3, 4, 5, 6] as const
const MIN_QUERY = 2
const DEBOUNCE_MS = 250
const at = (i: number) => ({ '--i': i }) as CSSProperties

type Search =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; facilities: FacilitySearchResult[] }
  | { status: 'error' }

export function CheckFacility() {
  const { t, lang } = useI18n()
  const navigate = useNavigate()
  const { update } = useBillCheck()
  // "Check my bill" from the Report prompt passes its Visit; otherwise offer the latest one.
  const passed = (useLocation().state as { visit?: Visit } | null)?.visit
  const [visit] = useState(() => passed ?? latestVisit())
  const [notListed, setNotListed] = useState(false)
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState<Search>({ status: 'idle' })
  const [attempt, setAttempt] = useState(0)
  const checkedOn = useListCheckedOn(search)

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
        <p className="-mt-3 mb-6 leading-relaxed text-ink-soft">{t('facility.levelHint')}</p>
        <ul className="overflow-hidden rounded-2xl border border-line-strong bg-surface">
          {LEVELS.map((level, i) => (
            <li key={level} className="rise border-b border-line last:border-b-0" style={at(i)}>
              <button
                type="button"
                onClick={() => chooseLevel(level)}
                className="row-hover pressable flex min-h-15 w-full items-center gap-4 px-4 py-3 text-left"
              >
                <span className="display w-6 text-[1.75rem] text-brand">{level}</span>
                <span className="flex-1">
                  <span className="block font-medium">{t('common.level', { n: level })}</span>
                  <span className="block text-[0.875rem] text-muted">{t(`facility.level${level}` as StringKey)}</span>
                </span>
                <Icon name="arrowRight" size={18} className="row-arrow text-muted" />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setNotListed(false)}
          className="pressable mt-5 inline-flex min-h-11 items-center gap-2 font-medium"
        >
          <Icon name="search" size={18} />
          {t('facility.backToSearch')}
        </button>
      </section>
    )
  }

  return (
    <section>
      <StepHeader step={1} title="page.check.facility" />

      {visit && (
        <div className="rise mb-7 rounded-2xl bg-ink p-5 text-white">
          <p className="text-[1.25rem] leading-snug font-medium">{t('facility.recent', { name: facilityName(visit.facility_name) })}</p>
          {visit.is_demo && (
            <div className="mt-2">
              <DemoPill />
            </div>
          )}
          <button
            type="button"
            onClick={() =>
              choose({ id: visit.facility_id, name: visit.facility_name, level: visit.facility_level, is_demo: visit.is_demo })
            }
            className="btn mt-4 w-full bg-white text-ink"
          >
            {t('facility.recentYes')}
            <Icon name="arrowRight" size={18} />
          </button>
        </div>
      )}

      <label htmlFor="facility-search" className="label mb-2 block">
        {t('facility.searchLabel')}
      </label>
      <div className="relative">
        <Icon name="search" size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
        <input
          id="facility-search"
          type="search"
          autoComplete="off"
          autoFocus={!visit}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('facility.searchPlaceholder')}
          className="field pl-12"
        />
      </div>

      <div className="mt-3 min-h-14" aria-live="polite">
        {search.status === 'loading' && <p className="px-1 py-3 text-muted">{t('facility.searching')}</p>}
        {search.status === 'error' && <ErrorState onRetry={() => setAttempt((n) => n + 1)} />}
        {search.status === 'done' && search.facilities.length === 0 && (
          // Empty result is not "not contracted" (document.md section 9): exact wording.
          <p className="rise rounded-xl bg-paper p-4 text-[0.9375rem] leading-relaxed text-ink-soft">
            {t('facility.notOnList', { date: formatDate(checkedOn, lang) })}
          </p>
        )}
        {search.status === 'done' && search.facilities.length > 0 && (
          <ul className="overflow-hidden rounded-2xl border border-line-strong bg-surface">
            {search.facilities.map((f, i) => (
              <li key={f.id} className="rise border-b border-line last:border-b-0" style={at(Math.min(i, 8))}>
                <button
                  type="button"
                  onClick={() => choose(f)}
                  className="row-hover pressable flex min-h-15 w-full items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block leading-snug font-medium [overflow-wrap:anywhere]">{facilityName(f.name)}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[0.8125rem] text-muted">
                      <span>{t('common.level', { n: f.level })}</span>
                      {f.sub_county && <span>· {f.sub_county}</span>}
                      {f.contracted && (
                        <span className="inline-flex items-center gap-1 text-brand">
                          · <Icon name="check" size={13} />
                          {t('facility.contracted')}
                        </span>
                      )}
                    </span>
                  </span>
                  {f.is_demo ? <DemoPill /> : <Icon name="arrowRight" size={18} className="row-arrow text-muted" />}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => setNotListed(true)}
        className="pressable mt-3 inline-flex min-h-11 items-center gap-2 text-[0.9375rem] font-medium underline decoration-line-strong underline-offset-4"
      >
        {t('facility.notListed')}
      </button>
    </section>
  )
}

/** The date SHA's list was checked, for the "not found" wording. Taken from any search that returned it. */
function useListCheckedOn(search: Search): string | null {
  const [fetched, setFetched] = useState<string | null>(null)
  const seen = search.status === 'done' ? (search.facilities.find((f) => f.contracted_checked_on)?.contracted_checked_on ?? null) : null
  const needFetch = !seen && !fetched && search.status === 'done' && search.facilities.length === 0

  useEffect(() => {
    if (!needFetch) return
    // Empty result and no date yet: ask once with a word most names on the list contain.
    let cancelled = false
    api.searchFacilities('hospital').then(
      (r) => !cancelled && setFetched(r.facilities.find((f) => f.contracted_checked_on)?.contracted_checked_on ?? null),
      () => {},
    )
    return () => {
      cancelled = true
    }
  }, [needFetch])

  return seen ?? fetched
}

function formatDate(iso: string | null, lang: string): string {
  if (!iso) return '…'
  const d = new Date(`${iso}T00:00:00`)
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(lang === 'sw' ? 'sw-KE' : 'en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}
