'use client'

import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
} from 'react-simple-maps'
import type { GeoPoint } from '@/lib/api'

const GEO_STYLE = {
  default: {
    fill: 'var(--muted)',
    stroke: 'var(--background)',
    outline: 'none',
  },
  hover: { fill: 'var(--muted)', stroke: 'var(--background)', outline: 'none' },
  pressed: {
    fill: 'var(--muted)',
    stroke: 'var(--background)',
    outline: 'none',
  },
} as const

// Bubble map: visitor geo points sized by visit count (no country-code matching).
export function WorldMap({ points }: { points: GeoPoint[] }) {
  const max = points.reduce((m, p) => Math.max(m, p.count), 0) || 1

  return (
    <div className="w-full overflow-hidden">
      <ComposableMap
        projectionConfig={{ scale: 140 }}
        height={300}
        style={{ width: '100%', height: 'auto' }}
      >
        <Geographies geography="/world-110m.json">
          {({ geographies }) =>
            geographies.map((geo) => (
              <Geography key={geo.rsmKey} geography={geo} style={GEO_STYLE} />
            ))
          }
        </Geographies>
        {points.map((p) => (
          <Marker key={`${p.lat},${p.lng}`} coordinates={[p.lng, p.lat]}>
            <circle
              r={2 + Math.sqrt(p.count / max) * 9}
              fill="var(--primary)"
              fillOpacity={0.55}
              stroke="var(--primary)"
              strokeWidth={0.5}
            />
          </Marker>
        ))}
      </ComposableMap>
    </div>
  )
}
