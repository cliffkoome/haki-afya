import { useCallback, useEffect, useState } from 'react'

export interface Coords {
  lat: number
  lng: number
  /** Set when the user picked an area instead of sharing location. */
  area?: string
}

export type LocationState =
  | { status: 'locating' }
  | { status: 'ready'; coords: Coords }
  | { status: 'denied' }

const TIMEOUT_MS = 10_000

// Memory only, so moving between Find pages doesn't ask again. Never persisted
// and never sent anywhere except the facilities request.
let cached: Coords | null = null

function locate(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('unavailable'))
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout: TIMEOUT_MS, maximumAge: 5 * 60_000 },
    )
  })
}

/** The user's position, or "denied" so the page can show the area picker. */
export function useUserLocation() {
  const [state, setState] = useState<LocationState>(() =>
    cached ? { status: 'ready', coords: cached } : { status: 'locating' },
  )

  const request = useCallback(() => {
    setState({ status: 'locating' })
    locate().then(
      (coords) => {
        cached = coords
        setState({ status: 'ready', coords })
      },
      () => setState({ status: 'denied' }),
    )
  }, [])

  const chooseArea = useCallback((coords: Coords) => {
    cached = coords
    setState({ status: 'ready', coords })
  }, [])

  const changeArea = useCallback(() => setState({ status: 'denied' }), [])

  useEffect(() => {
    if (!cached) request()
  }, [request])

  return { state, request, chooseArea, changeArea }
}
