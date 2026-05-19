'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import FormationField, { FieldPlayer } from './FormationField'

type Props = {
  initialPlayers: FieldPlayer[]
}

export default function FormationEditor({ initialPlayers }: Props) {
  const [players, setPlayers] = useState(initialPlayers)

  function handleMove(id: string, x: number, y: number) {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, x, y } : p))
  }

  async function handleMoveEnd(id: string, x: number, y: number) {
    const supabase = createClient()
    await supabase.from('lineups').update({ field_x: x, field_y: y }).eq('id', id)
  }

  return (
    <FormationField
      players={players}
      onMove={handleMove}
      onMoveEnd={handleMoveEnd}
    />
  )
}
