import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TeamSettingsClient from './TeamSettingsClient'

export default async function TeamSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('members')
    .select('team_id, role, teams(id, name)')
    .eq('id', user.id)
    .single()

  if (!me || me.role !== 'admin') redirect('/dashboard')

  const team = (me.teams as unknown) as { id: string; name: string } | null

  return (
    <div className="space-y-6 max-w-md">
      <h1 className="text-2xl font-bold text-gray-900">チーム設定</h1>
      <TeamSettingsClient teamId={team?.id ?? ''} currentName={team?.name ?? ''} />
    </div>
  )
}
