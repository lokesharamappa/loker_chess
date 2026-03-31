import React, { useMemo } from 'react'

interface Props {
  evals: (number | null)[]
  width?: number
  height?: number
}

export function EvalGraph({ evals, width = 320, height = 80 }: Props) {
  const points = useMemo(() => {
    if (evals.length === 0) return ''
    const clamp = (v: number) => Math.max(-600, Math.min(600, v))
    const toY = (v: number) => ((clamp(-v) + 600) / 1200) * height
    const xStep = width / Math.max(evals.length - 1, 1)
    return evals
      .map((v, i) => {
        const x = i * xStep
        const y = v != null ? toY(v) : height / 2
        return `${x},${y}`
      })
      .join(' ')
  }, [evals, width, height])

  const areaPoints = useMemo(() => {
    if (evals.length === 0) return ''
    const clamp = (v: number) => Math.max(-600, Math.min(600, v))
    const toY = (v: number) => ((clamp(-v) + 600) / 1200) * height
    const xStep = width / Math.max(evals.length - 1, 1)
    const top = evals
      .map((v, i) => `${i * xStep},${v != null ? toY(v) : height / 2}`)
      .join(' ')
    return `0,${height} ${top} ${width},${height}`
  }, [evals, width, height])

  if (evals.length < 2) {
    return (
      <div
        className="w-full rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-xs text-slate-500"
        style={{ height }}
      >
        Eval graph — play moves to see
      </div>
    )
  }

  return (
    <svg width={width} height={height} className="w-full rounded overflow-hidden border border-slate-700">
      <rect width={width} height={height} fill="#1e293b" />
      <line x1={0} y1={height / 2} x2={width} y2={height / 2}
            stroke="#334155" strokeWidth={1} strokeDasharray="3 3" />
      <polygon points={areaPoints} fill="rgba(99,102,241,0.15)" />
      <polyline points={points} fill="none" stroke="#6366f1" strokeWidth={2} strokeLinejoin="round" />
      {evals.map((v, i) => {
        if (v == null) return null
        const x = (i / Math.max(evals.length - 1, 1)) * width
        const clamp = (n: number) => Math.max(-600, Math.min(600, n))
        const y = ((clamp(-v) + 600) / 1200) * height
        return <circle key={i} cx={x} cy={y} r={2} fill="#818cf8" />
      })}
    </svg>
  )
}
