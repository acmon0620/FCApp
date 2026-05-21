import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminMembersClient from './AdminMembersClient'
import { getCurrentMember } from '@/lib/auth'

export default async function AdminMembersPage() {
  const me = await getCurrentMember()
  if (!me || me.role !== 'admin') redirect('/dashboard')

  const supabase = await createClient()
  const { data: members } = await supabase
    .from('members')
    .select('id, name, number, position, role, birth_date, preferred_foot')
    .eq('team_id', me.team_id)
    .eq('is_system_account', false)
    .order('number', { ascending: true, nullsFirst: false })

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <span className="text-sm text-gray-500">登録人数：<span className="font-bold text-gray-800 dark:text-gray-200">{members?.length ?? 0}</span> 人</span>
      </div>
      <AdminMembersClient members={members ?? []} teamId={me.team_id} />
    </div>
  )
}
