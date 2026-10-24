/**
 * Dev only: open any page with ?mock=retake (or ?mock=ok) to force that mocked
 * Bill Check response for the rest of the session. Read once at load, because
 * the wizard state resets on a full reload.
 */
const param = import.meta.env.DEV ? new URLSearchParams(location.search).get('mock') : null

export const billCheckMock: 'ok' | 'retake' | undefined = param === 'ok' || param === 'retake' ? param : undefined
