'use client'

import { Fragment, useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapMarker, LiveMapProps } from './LiveMap'

// Fix Leaflet default icon paths broken by webpack/Next.js bundling
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Auto-fit bounds when the marker set changes
function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap()
  const prevKeyRef = useRef('')

  useEffect(() => {
    const key = markers.map(m => `${m.id}:${m.lat}:${m.lng}`).join('|')
    if (key === prevKeyRef.current || markers.length === 0) return
    prevKeyRef.current = key

    const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng] as [number, number]))
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
  }, [markers, map])

  return null
}

function markerColor(marker: MapMarker): string {
  if (marker.type === 'staff') return '#6B2C91'
  if (marker.type === 'client') return '#00AAEF'
  // clock = clock-in (green) or clock-out (orange) based on sublabel
  if (marker.sublabel?.toLowerCase().includes('out')) return '#f59e0b'
  return '#22c55e'
}

export default function MapInner({
  markers,
  height = '380px',
  className = '',
  zoom = 13,
}: LiveMapProps) {
  // Default centre: Perth, WA
  const center = useMemo(() => {
    if (markers.length === 0) return { lat: -31.9505, lng: 115.8605 }
    const avgLat = markers.reduce((s, m) => s + m.lat, 0) / markers.length
    const avgLng = markers.reduce((s, m) => s + m.lng, 0) / markers.length
    return { lat: avgLat, lng: avgLng }
  }, [markers])

  // Deduplicate markers with identical type + position
  const deduped = useMemo(() => {
    const seen = new Set<string>()
    return markers.filter(m => {
      const key = `${m.type}:${m.lat.toFixed(5)}:${m.lng.toFixed(5)}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [markers])

  return (
    <div className={className} style={{ height }}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        style={{ height: '100%', width: '100%', borderRadius: 'inherit' }}
        zoomControl
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds markers={deduped} />

        {deduped.map(marker => {
          const color = markerColor(marker)
          return (
            <Fragment key={marker.id}>
              {/* Dot marker */}
              <CircleMarker
                center={[marker.lat, marker.lng]}
                radius={marker.type === 'staff' ? 10 : 8}
                pathOptions={{
                  color: '#fff',
                  weight: 2.5,
                  fillColor: color,
                  fillOpacity: 1,
                }}
              >
                <Popup>
                  <div style={{ minWidth: 140, fontFamily: 'sans-serif' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: color,
                        flexShrink: 0,
                      }} />
                      <strong style={{ fontSize: 13 }}>{marker.label}</strong>
                    </div>
                    {marker.sublabel && (
                      <p style={{ fontSize: 11, color: '#666', margin: '2px 0' }}>{marker.sublabel}</p>
                    )}
                    {marker.status && (
                      <span style={{
                        display: 'inline-block',
                        marginTop: 4,
                        fontSize: 10,
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        padding: '2px 8px',
                        borderRadius: 12,
                        backgroundColor: marker.status === 'active' ? '#F4ECF8' : '#f0f0f0',
                        color: marker.status === 'active' ? '#54206F' : '#666',
                      }}>
                        {marker.status}
                      </span>
                    )}
                    {marker.updatedAt && (
                      <p style={{ fontSize: 10, color: '#999', marginTop: 4 }}>
                        Updated {new Date(marker.updatedAt).toLocaleTimeString('en-AU', {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            </Fragment>
          )
        })}
      </MapContainer>
    </div>
  )
}
