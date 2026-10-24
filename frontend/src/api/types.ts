// Types for the API contract in document.md section 9. Keep in sync.

export type Lang = 'en' | 'sw'

export const SERVICE_CATEGORIES = [
  'maternity',
  'dialysis',
  'imaging',
  'eye_care',
  'general_outpatient',
  'surgery',
  'cancer_care',
  'emergency',
] as const
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]

export type FlagType = 'should_be_free' | 'above_tariff' | 'payable' | 'unclear'
export type Referral = 'referred' | 'emergency' | 'neither'

export interface ClassifyResponse {
  service_category: ServiceCategory | null
  is_emergency: boolean
  matched_by: 'keywords' | 'model' | 'fallback'
}

export interface CoverageCounts {
  window_days: number
  verified_paid: number
  verified_free: number
  unverified_paid: number
  unverified_free: number
}

export interface Facility {
  id: string
  name: string
  level: number
  is_demo: boolean
  lat: number
  lng: number
  distance_km: number
  benefit_summary: string
  coverage: CoverageCounts
  google: { rating: number; user_rating_count: number } | null
}

export interface FacilitySearchResult {
  id: string
  /** Exactly as SHA prints it (upper case); show through facilityName(). */
  name: string
  level: number
  is_demo: boolean
  /** On SHA's contracted list (false for Demo Facilities). Optional: a Visit-derived pick has none. */
  contracted?: boolean
  contracted_checked_on?: string | null
  sha_level?: string | null
  type?: string | null
  sub_county?: string | null
  coverage?: CoverageCounts
}

export interface Area {
  id: string
  name: string
  lat: number
  lng: number
}

export interface LineItem {
  description: string
  quantity: number
  unit_price_kes: number
  amount_kes: number
  category: string
  confidence: number
}

export interface Flag {
  line_item_index: number
  flag: FlagType
  tariff_kes: number | null
  charged_kes: number
  amount_in_question_kes: number
  message: string
  rule_id: string | null
  source_url: string | null
}

export interface ShaContact {
  channel: string
  value: string
  source_url: string
}

export interface BillCheckOk {
  status: 'ok'
  /** id and name are null when "not listed" was picked; level is the facility_level sent. */
  facility: { id: string | null; name: string | null; level: number } | null
  bill: {
    line_items: LineItem[]
    subtotal_kes: number
    sha_deduction_kes: number
    balance_kes: number
  }
  flags: Flag[]
  summary: { amount_in_question_kes: number; balance_kes: number }
  /** null when there is nothing to ask about, or the text failed the code check. */
  desk_script: string | null
  complaint_draft: string | null
  sha_contacts: ShaContact[]
  verified_report_saved: boolean
  disclaimer: string
}

export interface BillCheckRetake {
  status: 'retake'
  reason: 'totals_mismatch' | 'low_confidence' | 'not_a_bill' | 'model_error'
  message: string
}

export type BillCheckResponse = BillCheckOk | BillCheckRetake

export interface BillCheckRequest {
  image: Blob
  registered: boolean
  referral: Referral
  lang: Lang
  device_id: string
  facility_id?: string
  facility_level?: number
}

export interface ReportRequest {
  facility_id: string
  service_category: ServiceCategory
  paid: boolean
  amount_kes?: number
  device_id: string
}
