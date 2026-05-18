'use client'

import { useRef } from 'react'

export type FieldPlayer = {
  id: string
  number: number | null
  x: number  // 0–1 (left to right)
  y: number  // 0–1 (top to bottom)
}

type Props = {
  players: FieldPlayer[]
  onMove?: (id: string, x: number, y: number) => void
  readOnly?: boolean
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export default function FormationField({ players, onMove, readOnly = false }: Props) {
  const fieldRef = useRef<HTMLDivElement>(null)
  const draggingId = useRef<string | null>(null)

  function handlePlayerDown(e: React.PointerEvent, id: string) {
    if (readOnly) return
    e.preventDefault()
    draggingId.current = id
    // Capture pointer on field so we receive move/up events even outside player token
    fieldRef.current?.setPointerCapture(e.pointerId)
  }

  function handleFieldMove(e: React.PointerEvent) {
    if (!draggingId.current || !fieldRef.current) return
    const rect = fieldRef.current.getBoundingClientRect()
    const x = clamp((e.clientX - rect.left) / rect.width, 0.05, 0.95)
    const y = clamp((e.clientY - rect.top) / rect.height, 0.05, 0.95)
    onMove?.(draggingId.current, x, y)
  }

  function handleFieldUp() {
    draggingId.current = null
  }

  return (
    <div
      ref={fieldRef}
      className="relative w-full rounded-xl overflow-hidden select-none touch-none"
      style={{ background: '#2e7d32', aspectRatio: '3/4' }}
      onPointerMove={handleFieldMove}
      onPointerUp={handleFieldUp}
      onPointerCancel={handleFieldUp}
    >
      {/* Outer border */}
      <div className="absolute inset-[4%] border-2 border-white/50 rounded-sm pointer-events-none" />
      {/* Center line */}
      <div className="absolute left-[4%] right-[4%] top-1/2 h-px bg-white/50 pointer-events-none" />
      {/* Center circle */}
      <div
        className="absolute border-2 border-white/50 rounded-full pointer-events-none"
        style={{ width: '26%', aspectRatio: '1', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      />
      {/* Top penalty area */}
      <div
        className="absolute border-2 border-white/50 pointer-events-none"
        style={{ width: '52%', height: '17%', top: '4%', left: '24%', borderTop: 'none' }}
      />
      {/* Bottom penalty area */}
      <div
        className="absolute border-2 border-white/50 pointer-events-none"
        style={{ width: '52%', height: '17%', bottom: '4%', left: '24%', borderBottom: 'none' }}
      />

      {/* Player tokens */}
      {players.map(p => (
        <div
          key={p.id}
          className="absolute flex flex-col items-center -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${p.x * 100}%`,
            top: `${p.y * 100}%`,
            cursor: readOnly ? 'default' : 'grab',
          }}
          onPointerDown={e => handlePlayerDown(e, p.id)}
        >
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
