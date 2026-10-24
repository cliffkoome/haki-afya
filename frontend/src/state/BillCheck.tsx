import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import type { BillCheckOk, FacilitySearchResult, Referral } from '../api/types'

/**
 * Bill Check wizard state (frontend.md "Local state"). Memory only: a refresh
 * starts over, and the bill photo is never kept here.
 */
export interface BillCheckState {
  /** A listed facility, or null when the user chose "not listed". */
  facility: FacilitySearchResult | null
  /** Facility Level: from the facility, or picked when not listed. */
  level: number | null
  registered: boolean | null
  referral: Referral | null
  result: BillCheckOk | null
}

const EMPTY: BillCheckState = { facility: null, level: null, registered: null, referral: null, result: null }

interface BillCheckContext {
  state: BillCheckState
  update: (patch: Partial<BillCheckState>) => void
  reset: () => void
}

const Ctx = createContext<BillCheckContext | null>(null)

export function BillCheckProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<BillCheckState>(EMPTY)

  const value = useMemo<BillCheckContext>(
    () => ({
      state,
      update: (patch) => setState((s) => ({ ...s, ...patch })),
      reset: () => setState(EMPTY),
    }),
    [state],
  )

  return <Ctx value={value}>{children}</Ctx>
}

export function useBillCheck(): BillCheckContext {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useBillCheck must be used inside <BillCheckProvider>')
  return ctx
}
