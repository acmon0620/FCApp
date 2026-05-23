import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentMember } from '@/lib/auth'

export default async function MembersPage() {
  const me = await getCurrentMember()
  if (!me) redirect('/login')

  const supabase = await createClient()
  const { data: members } = await supabase
    .from('members')
    .select('id, name, number, position, role')
    .eq('team_id', me.team_id)
    .eq('is_system_account', false)
    .is('deleted_at', null)
    .order('number', { ascending: true, nullsFirst: false })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">メンバー一覧</h1>

      <div className="grid gap-3">
        {members?.map(m => (
          <Link
            key={m.id}
            href={`/members/${m.id}`}
            className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
              {m.number ?? '-'}
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
