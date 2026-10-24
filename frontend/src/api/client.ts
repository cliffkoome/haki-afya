import type {
  BillCheckRequest,
  BillCheckResponse,
  ClassifyResponse,
  Facility,
  FacilitySearchResult,
  Lang,
  ReportRequest,
  ServiceCategory,
} from './types'

/** Error in the contract shape: {"error": {"code", "message"}}. */
export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.code = code
    this.status = status
  }
}

const DEFAULT_TIMEOUT_MS = 15_000
// Bill Check runs two Gemma calls; give it room on slow networks.
const BILL_CHECK_TIMEOUT_MS = 60_000

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  let res: Response
  try {
    res = await fetch(path, { ...init, signal: controller.signal })
  } catch (err) {
    const timedOut = err instanceof DOMException && err.name === 'AbortError'
    throw new ApiError(timedOut ? 'timeout' : 'network', timedOut ? 'Request timed out' : 'Network error', 0)
  } finally {
    clearTimeout(timer)
  }

  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const error = body?.error
    throw new ApiError(error?.code ?? 'error', error?.message ?? res.statusText, res.status)
  }
  return body as T
}

function jsonPost<T>(path: string, data: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

export const api = {
  health: () => request<{ ok: boolean }>('/api/health'),

  classifyCareNeed: (text: string, lang: Lang) =>
    jsonPost<ClassifyResponse>('/api/care-need/classify', { text, lang }),

  facilities: (params: { service_category: ServiceCategory; lat: number; lng: number; lang: Lang }) => {
    const qs = new URLSearchParams({
      service_category: params.service_category,
      lat: String(params.lat),
      lng: String(params.lng),
      lang: params.lang,
    })
    return request<{ facilities: Facility[] }>(`/api/facilities?${qs}`)
  },

  searchFacilities: (q: string) =>
    request<{ facilities: FacilitySearchResult[] }>(`/api/facilities/search?${new URLSearchParams({ q })}`),

  billCheck: (req: BillCheckRequest, opts: { mock?: 'ok' | 'retake' } = {}) => {
    const form = new FormData()
    form.append('image', req.image, 'bill.jpg')
    form.append('registered', String(req.registered))
    form.append('referral', req.referral)
    form.append('lang', req.lang)
    form.append('device_id', req.device_id)
    if (req.facility_id) form.append('facility_id', req.facility_id)
    if (req.facility_level != null) form.append('facility_level', String(req.facility_level))
    const qs = opts.mock ? `?mock=${opts.mock}` : ''
    return request<BillCheckResponse>(`/api/bill-check${qs}`, { method: 'POST', body: form }, BILL_CHECK_TIMEOUT_MS)
  },

  createReport: (req: ReportRequest) => jsonPost<{ id: number; verified: boolean }>('/api/reports', req),
}
