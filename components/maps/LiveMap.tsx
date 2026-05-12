'use client'

import dynamic from 'next/dynamic'

export interface MapMarker {
  id: string
  lat: number
  lng: number
  type: 'staff' | 'client' | 'clock'
  label: string
  sublabel?: string
  status?: 'active' | 'scheduled' | 'completed'
  geofenceRadius?: number
  updatedAt?: string
}

export interface LiveMapProps {
  markers: MapMarker[]
  height?: string
  className?: string
  showGeofences?: boolean
  zoom?: number
}

const MapInner = dynamic(() => import('./MapInner'), {
  ssr: false,
  loading: () => (
    <div
      className="flex items-center justify-center rounded-[20px] bg-[#f7f8f9]"
      style={{ height: '380px' }}
    >
      <div className="text-center">
        <span className="material-symbols-outlined animate-pulse text-[32px] text-[#94a3b8]">
          map
        </span>
        <p className="mt-2 text-xs text-[#64748b]">Loading map...</p>
      </div>
    </div>
  ),
})

export default function LiveMap(props: LiveMapProps) {
  return <MapInner {...props} />
}
