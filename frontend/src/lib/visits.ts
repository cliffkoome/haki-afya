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
