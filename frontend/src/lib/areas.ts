import data from '../../../data/areas.json'

/** A Nairobi area with fixed coordinates, for when location is denied. */
export interface Area {
  name: string
  lat: number
  lng: number
}

export const AREAS: Area[] = (data as unknown[]).filter(
  (a): a is Area =>
    typeof a === 'object' && a != null && typeof (a as Area).name === 'string' &&
    typeof (a as Area).lat === 'number' && typeof (a as Area).lng === 'number',
)
