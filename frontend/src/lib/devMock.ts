/**
 * Demo/testing: open any page with ?mock=retake (or ?mock=ok) to force that mocked
 * Bill Check response for the rest of the session. Read once at load, because
 * the wizard state resets on a full reload.
 */
// Enabled in production builds too, for the live demo. They only touch this
// device's Visits and the backend's mock switch.
const params = new URLSearchParams(location.search)
const param = params.get('mock')

export const billCheckMock: 'ok' | 'retake' | undefined = param === 'ok' || param === 'retake' ? param : undefined

/** Demo/testing: open any page with ?backdate=1 to make saved Visits 3 hours old (Report prompt test). */
export const backdateRequested = params.get('backdate') === '1'
