import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminMembersClient from './AdminMembersClient'
import { getCurrentMember } from '@/lib/auth'

export default async function AdminMembersPage() {
  const me = await getCurrentMember()
  if (!me || me.role !== 'admin') redirect('/dashboard')

  const supabase = await createClient()
  const [membersRes, groupsRes, memberGroupsRes] = await Promise.all([
    supabase
      .from('members')
      .select('id, name, position, role, birth_date, preferred_foot, has_login')
      .eq('team_id', me.team_id)
      .eq('is_system_account', false)
      .is('deleted_at', null)
      .order('name', { ascending: true }),
    supabase
      .from('groups')
      .select('id, name, sort_order')
      .eq('team_id', me.team_id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('member_groups')
      .select('member_id, group_id, jersey_number'),
  ])

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <span className="text-sm text-gray-500">登録人数：<span className="font-bold text-gray-800 dark:text-gray-200">{membersRes.data?.length ?? 0}</span> 人</span>
      </div>
      <AdminMembersClient
        members={membersRes.data ?? []}
        groups={groupsRes.data ?? []}
        memberGroups={memberGroupsRes.data ?? []}
        teamId={me.team_id}
      />
    </div>
  )
}
