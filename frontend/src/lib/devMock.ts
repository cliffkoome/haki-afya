/**
 * Dev only: open any page with ?mock=retake (or ?mock=ok) to force that mocked
 * Bill Check response for the rest of the session. Read once at load, because
 * the wizard state resets on a full reload.
 */
const params = import.meta.env.DEV ? new URLSearchParams(location.search) : null
const param = params?.get('mock') ?? null

export const billCheckMock: 'ok' | 'retake' | undefined = param === 'ok' || param === 'retake' ? param : undefined

/** Dev only: open any page with ?backdate=1 to make saved Visits 3 hours old (Report prompt test). */
export const backdateRequested = params?.get('backdate') === '1'
