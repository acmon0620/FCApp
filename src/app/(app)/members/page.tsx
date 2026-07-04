import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentMember } from '@/lib/auth'

type Props = { searchParams: Promise<{ group?: string }> }

export default async function MembersPage({ searchParams }: Props) {
  const { group: selectedGroupId } = await searchParams

  const me = await getCurrentMember()
  if (!me) redirect('/login')

  const supabase = await createClient()
  const [membersRes, groupsRes, memberGroupsRes] = await Promise.all([
    supabase
      .from('members')
      .select('id, name, position, role')
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

  const allMembers = membersRes.data ?? []
  const groups = groupsRes.data ?? []
  const memberGroups = memberGroupsRes.data ?? []

  // グループ選択時: そのグループのメンバーのみ、背番号付きで表示
  const displayMembers = (() => {
    if (!selectedGroupId) {
      return allMembers.map(m => ({ ...m, jerseyNumber: null as number | null }))
    }
    const gms = memberGroups.filter(mg => mg.group_id === selectedGroupId)
    return gms
      .map(mg => {
        const m = allMembers.find(m => m.id === mg.member_id)
        if (!m) return null
        return { ...m, jerseyNumber: mg.jersey_number }
      })
      .filter(Boolean)
      .sort((a, b) => {
        const na = a!.jerseyNumber ?? Infinity
        const nb = b!.jerseyNumber ?? Infinity
        return na !== nb ? na - nb : a!.name.localeCompare(b!.name, 'ja')
      }) as Array<{ id: string; name: string; position: string | null; role: string; jerseyNumber: number | null }>
  })()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">メンバー一覧</h1>

      {/* グループタブ */}
      {groups.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <Link
            href="/members"
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              !selectedGroupId
                ? 'bg-green-600 text-white border-green-600'
                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400'
            }`}
          >
            全員
          </Link>
          {groups.map(g => (
            <Link
              key={g.id}
              href={`/members?group=${g.id}`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                selectedGroupId === g.id
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400'
              }`}
            >
              {g.name}
            </Link>
          ))}
        </div>
      )}

      <div className="grid gap-3">
        {displayMembers.length === 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-sm text-center text-gray-400 dark:text-gray-500 text-sm">
            {selectedGroupId ? 'このグループにメンバーがいません' : 'メンバーが登録されていません'}
          </div>
        )}
        {displayMembers.map(m => (
          <Link
            key={m.id}
            href={`/members/${m.id}`}
            className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-sm flex-shrink-0">
              {m.jerseyNumber != null ? m.jerseyNumber : '-'}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 dark:text-white">{m.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{m.position ?? 'ポジション未設定'}</p>
            </div>
            {m.role === 'admin' && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">管理者</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
