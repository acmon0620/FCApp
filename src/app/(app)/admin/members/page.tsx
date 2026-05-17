import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminMembersClient from './AdminMembersClient'

export default async function AdminMembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('members')
    .select('team_id, role')
    .eq('id', user.id)
    .single()

  if (!me || me.role !== 'admin') redirect('/dashboard')

  const { data: members } = await supabase
    .from('members')
    .select('id, name, number, position, role, birth_date, preferred_foot')
    .eq('team_id', me.team_id)
    .eq('is_system_account', false)
    .order('number', { ascending: true, nullsFirst: false })

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">メンバー管理</h1>
        <span className="text-sm text-gray-500">登録人数：<span className="font-bold text-gray-800">{members?.length ?? 0}</span> 人</span>
      </div>
      <AdminMembersClient members={members ?? []} teamId={me.team_id} />
    </div>
  )
}
