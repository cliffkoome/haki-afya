// localStorage can throw (private mode, blocked storage). Never let it crash the app.

export const KEYS = {
  lang: 'haki.lang',
  deviceId: 'haki.device_id',
  visits: 'haki.visits',
} as const

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable: the app keeps working, it just won't remember.
  }
}
