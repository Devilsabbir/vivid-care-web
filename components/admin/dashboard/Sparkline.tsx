interface SparklineProps {
  data: number[]
  color: string
  height?: number
}

/**
 * Inline SVG sparkline — no chart library.
 * Renders a polyline + a translucent area fill underneath.
 * Width scales via viewBox + preserveAspectRatio.
 */
export default function Sparkline({ data, color, height = 32 }: SparklineProps) {
  if (data.length < 2) return <div style={{ height }} />

  const width = 100 // viewBox width — scales to container via CSS
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * (height - 4) - 2
      return `${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')

  const areaPoints = `0,${height} ${points} ${width},${height}`

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ width: '100%', height }}
      aria-hidden="true"
    >
      <polygon points={areaPoints} fill={color} opacity={0.12} />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
