import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import MemberStats from './MemberStats'
import { getCurrentMember } from '@/lib/auth'

type Props = { params: Promise<{ id: string }> }

export default async function MemberDetailPage({ params }: Props) {
  const { id } = await params

  const me = await getCurrentMember()
  if (!me) redirect('/login')

  const supabase = await createClient()

  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('id', id)
    .eq('team_id', me.team_id)
    .single()

  if (!member) redirect('/members')

  const { data: matchIds } = await supabase
    .from('matches')
    .select('id')
    .eq('team_id', me.team_id)

  const ids = matchIds?.map(m => m.id) ?? []

  const { data: events } = await supabase
    .from('events')
    .select('type, match_id')
    .eq('member_id', id)
    .in('match_id', ids)

  const { data: assists } = await supabase
    .from('events')
    .select('type, match_id')
    .eq('assisted_by', id)
    .eq('type', 'goal')
    .in('match_id', ids)

  const { data: lineups } = await supabase
    .from('lineups')
    .select('start_minute, end_minute, match_id')
    .eq('member_id', id)
    .in('match_id', ids)

  const goals = events?.filter(e => e.type === 'goal').length ?? 0
  const yellowCards = events?.filter(e => e.type === 'yellow_card').length ?? 0
  const redCards = events?.filter(e => e.type === 'red_card').length ?? 0
  const assistCount = assists?.length ?? 0

  const totalMinutes = lineups?.reduce((sum, l) => {
    const end = l.end_minute ?? 90
    return sum + (end - l.start_minute)
  }, 0) ?? 0

  const appearances = new Set(lineups?.map(l => l.match_id)).size

  const age = member.birth_date
    ? Math.floor((Date.now() - new Date(member.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : null

  const footLabel: Record<string, string> = { right: '右足', left: '左足', both: '両足' }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link href="/members" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700">← メンバー一覧</Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{member.name}</h1>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">プロフィール</h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-gray-500 dark:text-gray-400">背番号</dt>
          <dd className="text-gray-900 dark:text-white">#{member.number ?? '-'}</dd>
          <dt className="text-gray-500 dark:text-gray-400">ポジション</dt>
          <dd className="text-gray-900 dark:text-white">{member.position ?? '-'}</dd>
          <dt className="text-gray-500 dark:text-gray-400">利き足</dt>
          <dd className="text-gray-900 dark:text-white">{member.preferred_foot ? footLabel[member.preferred_foot] : '-'}</dd>
          <dt className="text-gray-500 dark:text-gray-400">生年月日</dt>
          <dd className="text-gray-900 dark:text-white">{member.birth_date ?? '-'}{age != null ? ` (${age}歳)` : ''}</dd>
        </dl>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: '出場試合', value: appearances, unit: '試合' },
          { label: '出場時間', value: totalMinutes, unit: '分' },
          { label: '得点', value: goals, unit: '点' },
          { label: 'アシスト', value: assistCount, unit: '回' },
          { label: '警告', value: yellowCards, unit: '枚' },
          { label: '退場', value: redCards, unit: '枚' },
        ].map(s => (
          <div key={s.label} className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm text-center">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <MemberStats memberId={id} teamId={me.team_id} />
    </div>
  )
}
