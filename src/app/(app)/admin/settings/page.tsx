import { redirect } from 'next/navigation'
import TeamSettingsClient from './TeamSettingsClient'
import { getCurrentMember } from '@/lib/auth'

export default async function TeamSettingsPage() {
  const me = await getCurrentMember()
  if (!me || me.role !== 'admin') redirect('/dashboard')

  const team = me.teams

  return (
    <div className="space-y-6 max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">チーム設定</h1>
      <TeamSettingsClient teamId={team?.id ?? ''} currentName={team?.name ?? ''} />
    </div>
  )
}
