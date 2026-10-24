import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet'
import type { Facility } from '../api/types'
import type { Coords } from '../lib/location'

interface Props {
  facilities: Facility[]
  center: Coords
  selectedId: string | null
  onSelect: (id: string) => void
}

/** OpenStreetMap with a pin per facility. Loaded lazily: Leaflet is the heaviest dependency. */
export default function FacilityMap({ facilities, center, selectedId, onSelect }: Props) {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={12} className="h-[55dvh] w-full rounded-2xl border border-line">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker
        center={[center.lat, center.lng]}
        radius={7}
        pathOptions={{ color: '#ffffff', weight: 3, fillColor: '#1a73e8', fillOpacity: 1 }}
      />
      {facilities.map((f) => {
        const selected = f.id === selectedId
        return (
          <CircleMarker
            key={f.id}
            center={[f.lat, f.lng]}
            radius={selected ? 14 : 10}
            eventHandlers={{ click: () => onSelect(f.id) }}
            pathOptions={{ color: '#ffffff', weight: 3, fillColor: selected ? '#08573e' : '#0b6e4f', fillOpacity: 1 }}
          />
        )
      })}
    </MapContainer>
  )
}
