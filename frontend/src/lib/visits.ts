import type { ServiceCategory } from '../api/types'
import { KEYS, readJSON, writeJSON } from './storage'

/** A Visit (GLOSSARY.md): saved when the user taps "Go here" on a facility. */
export interface Visit {
  facility_id: string
  facility_name: string
  facility_level: number
  is_demo: boolean
  service_category: ServiceCategory
  created_at: string
  answered: boolean
}

export const REPORT_PROMPT_DELAY_MS = 2 * 60 * 60 * 1000
const RECENT_MS = 3 * 24 * 60 * 60 * 1000

export function getVisits(): Visit[] {
  const visits = readJSON<Visit[]>(KEYS.visits, [])
  return Array.isArray(visits) ? visits : []
}

export function saveVisit(visit: Omit<Visit, 'created_at' | 'answered'>): void {
  const next: Visit = { ...visit, created_at: new Date().toISOString(), answered: false }
  // Keep the list short: only recent Visits matter.
  writeJSON(KEYS.visits, [next, ...getVisits()].slice(0, 10))
}

/** Most recent Visit within the last few days, used to pre-fill Bill Check. */
export function latestVisit(): Visit | null {
  const visit = getVisits()[0]
  if (!visit) return null
  return Date.now() - Date.parse(visit.created_at) < RECENT_MS ? visit : null
}

/** Oldest unanswered Visit that is at least 2 hours old: time to ask about it. */
export function dueVisit(now = Date.now()): Visit | null {
  const due = getVisits().filter((v) => !v.answered && now - Date.parse(v.created_at) >= REPORT_PROMPT_DELAY_MS)
  return due.at(-1) ?? null
}

/** Never ask about this Visit again. */
export function markAnswered(visit: Visit): void {
  writeJSON(
    KEYS.visits,
    getVisits().map((v) => (v.created_at === visit.created_at && v.facility_id === visit.facility_id ? { ...v, answered: true } : v)),
  )
}

/** Dev only: make every Visit look 3 hours old so the Report prompt shows. */
export function backdateVisits(): void {
  const past = new Date(Date.now() - REPORT_PROMPT_DELAY_MS - 60 * 60 * 1000).toISOString()
  writeJSON(KEYS.visits, getVisits().map((v) => ({ ...v, created_at: past })))
}
