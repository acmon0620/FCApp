import { cache } from 'react'
import { createClient } from './supabase/server'

type CurrentMember = {
  team_id: string
  role: string
  teams: { id: string; name: string } | null
}

// React cache() deduplicates this call within a single server request,
// so layout + page share one Supabase round-trip.
export const getCurrentMember = cache(async (): Promise<CurrentMember | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('members')
    .select('team_id, role, teams(id, name)')
    .eq('id', user.id)
    .single()

  return (data as unknown as CurrentMember) ?? null
})
