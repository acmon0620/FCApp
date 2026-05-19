'use client'

import { useRef } from 'react'

export type FieldPlayer = {
  id: string
  number: number | null
  name: string
  x: number  // 0–1
  y: number  // 0–1
}

type Props = {
  players: FieldPlayer[]
  onMove?: (id: string, x: number, y: number) => void
  onMoveEnd?: (id: string, x: number, y: number) => void
  readOnly?: boolean
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export default function FormationField({ players, onMove, onMoveEnd, readOnly = false }: Props) {
  const fieldRef = useRef<HTMLDivElement>(null)
  const draggingId = useRef<string | null>(null)
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  function handlePlayerDown(e: React.PointerEvent, id: string) {
    if (readOnly) return
    e.preventDefault()
    draggingId.current = id
    lastPos.current = null
    fieldRef.current?.setPointerCapture(e.pointerId)
  }

  function handleFieldMove(e: React.PointerEvent) {
    if (!draggingId.current || !fieldRef.current) return
    const rect = fieldRef.current.getBoundingClientRect()
    const x = clamp((e.clientX - rect.left) / rect.width, 0.05, 0.95)
    const y = clamp((e.clientY - rect.top) / rect.height, 0.05, 0.95)
    lastPos.current = { x, y }
    onMove?.(draggingId.current, x, y)
  }

  function handleFieldUp() {
    if (draggingId.current && lastPos.current) {
      onMoveEnd?.(draggingId.current, lastPos.current.x, lastPos.current.y)
    }
    draggingId.current = null
    lastPos.current = null
  }

  return (
    <div
      ref={fieldRef}
      className="relative w-full select-none touch-none"
      style={{ aspectRatio: '3/4' }}
      onPointerMove={handleFieldMove}
      onPointerUp={handleFieldUp}
      onPointerCancel={handleFieldUp}
    >
      {/* Green field background (overflow-hidden for rounded corners) */}
      <div
        className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none"
        style={{ background: '#2e7d32' }}
      >
        <div className="absolute inset-[4%] border-2 border-white/50 rounded-sm" />
        <div className="absolute left-[4%] right-[4%] top-1/2 h-px bg-white/50" />
        <div
          className="absolute border-2 border-white/50 rounded-full"
          style={{ width: '26%', aspectRatio: '1', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
        />
        <div
          className="absolute border-2 border-white/50"
          style={{ width: '52%', height: '17%', top: '4%', left: '24%', borderTop: 'none' }}
        />
        <div
          className="absolute border-2 border-white/50"
          style={{ width: '52%', height: '17%', bottom: '4%', left: '24%', borderBottom: 'none' }}
        />
      </div>

      {/* Player tokens — separate layer so tooltips aren't clipped */}
      {players.map(p => (
        <div
          key={p.id}
          className="group absolute"
          style={{
            left: `${p.x * 100}%`,
            top: `${p.y * 100}%`,
            transform: 'translate(-50%, -50%)',
            cursor: readOnly ? 'default' : 'grab',
          }}
          onPointerDown={e => handlePlayerDown(e, p.id)}
        >
          {/* Hover tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block pointer-events-none z-20">
            <div className="bg-black/75 text-white text-xs rounded px-2 py-0.5 whitespace-nowrap">
              {p.name}
            </div>
          </div>

          {/* Jersey number token */}
          <div className="w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center border-2 border-green-800">
            <span className="text-xs font-bold text-green-900 leading-none">
              {p.number ?? '?'}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
