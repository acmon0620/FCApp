import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TAG_COLOR } from '@/lib/matchTags'
import FormationField from '@/components/FormationField'
import FormationEditor from '@/components/FormationEditor'
import { getCurrentMember } from '@/lib/auth'

type Props = { params: Promise<{ id: string }> }

export default async function MatchDetailPage({ params }: Props) {
  const { id } = await params

  const member = await getCurrentMember()
  if (!member) redirect('/login')

  const supabase = await createClient()

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .eq('team_id', member.team_id)
    .single()

  if (!match) redirect('/matches')

  const { data: lineups } = await supabase
    .from('lineups')
    .select('*, members(name, number)')
    .eq('match_id', id)
    .order('start_minute')

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('match_id', id)
    .order('minute')

  const eventMemberIds = [...new Set([
    ...(events ?? []).map((e: { member_id: string | null }) => e.member_id).filter((x): x is string => x != null),
    ...(events ?? []).map((e: { assisted_by: string | null }) => e.assisted_by).filter((x): x is string => x != null),
  ])]
  const { data: eventMembersData } = eventMemberIds.length > 0
    ? await supabase.from('members').select('id, name').in('id', eventMemberIds)
    : { data: [] as { id: string; name: string }[] }
  const memberNameById = Object.fromEntries((eventMembersData ?? []).map((m: { id: string; name: string }) => [m.id, m.name]))

  const isAdmin = member.role === 'admin'

  const starters = (lineups ?? []).filter(l => l.start_minute === 0)
  const formationPlayers = starters
    .filter(l => l.field_x != null && l.field_y != null)
    .map(l => {
      const m = l.members as { name: string; number: number | null } | null
      return { id: l.id, number: m?.number ?? null, name: m?.name ?? '', x: l.field_x as number, y: l.field_y as number }
    })

  const eventIcon: Record<string, string> = {
    goal: '⚽',
    yellow_card: '🟨',
    red_card: '🟥',
    opponent_goal: '⚽',
  }

  const statusLabel: Record<string, string> = {
    scheduled: '予定',
    in_progress: '試合中',
    finished: '終了',
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <Link href="/matches" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">← 試合一覧</Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">vs {match.opponent}</h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-gray-500 dark:text-gray-400">{match.date} · {statusLabel[match.status]}{match.duration ? ` · ${match.duration}分` : ''}</p>
            {match.tag && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TAG_COLOR[match.tag] ?? 'bg-gray-100 text-gray-600'}`}>
                {match.tag}
              </span>
            )}
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/matches/${id}/edit`}
              className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              編集
            </Link>
            {match.status === 'scheduled' && (
              <Link
                href={`/matches/${id}/lineup`}
                className="border border-green-600 text-green-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors"
              >
                メンバー設定
              </Link>
            )}
            <Link
              href={`/matches/${id}/record`}
              className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              {match.status === 'scheduled' ? '試合を開始' : '記録する'}
            </Link>
          </div>
        )}
      </div>

      {match.status !== 'scheduled' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm text-center">
          <p className="text-5xl font-bold text-gray-900 dark:text-white">
            {match.score_us} <span className="text-gray-300 dark:text-gray-600">-</span> {match.score_them}
          </p>
          <p className="text-gray-500 dark:text-gray-400 mt-1">自チーム · 相手</p>
        </div>
      )}

      {formationPlayers.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">フォーメーション</h2>
          {isAdmin
            ? <FormationEditor initialPlayers={formationPlayers} />
            : <FormationField players={formationPlayers} readOnly />
          }
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">出場メンバー</h2>
          {isAdmin && match.status === 'scheduled' && (
            <Link href={`/matches/${id}/lineup`} className="text-sm text-green-600 dark:text-green-400 hover:underline">
              メンバーを設定
            </Link>
          )}
        </div>
        {lineups && lineups.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 dark:text-gray-400 border-b dark:border-gray-700">
                <th className="pb-2">名前</th>
                <th className="pb-2">ポジション</th>
                <th className="pb-2">出場時間</th>
                <th className="pb-2 text-right">計</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {lineups.map(l => {
                const m = l.members as { name: string; number: number } | null
                const isStarter = l.start_minute === 0
                const minutes = l.end_minute != null ? l.end_minute - l.start_minute : null
                return (
                  <tr key={l.id}>
                    <td className="py-2">
                      {m?.number && <span className="text-gray-400 dark:text-gray-500 mr-1">#{m.number}</span>}
                      {m?.name}
                      {isStarter && (
                        <span className="ml-1.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">先発</span>
                      )}
                    </td>
                    <td className="py-2 text-gray-600 dark:text-gray-400">{l.position ?? '-'}</td>
                    <td className="py-2 text-gray-600 dark:text-gray-400">
                      {l.start_minute}分 〜 {l.end_minute != null ? `${l.end_minute}分` : '試合中'}
                    </td>
                    <td className="py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                      {minutes != null ? `${minutes}分` : '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <p className="text-gray-400 dark:text-gray-500 text-sm">出場記録がありません</p>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">イベント</h2>
        {events && events.length > 0 ? (
          <ul className="space-y-2">
            {events.map((ev: { id: string; type: string; minute: number; member_id: string | null; assisted_by: string | null; opponent_scorer: string | null; opponent_assist: string | null }) => {
              const isOpponent = ev.type === 'opponent_goal'
              const scorerName = !isOpponent && ev.member_id ? memberNameById[ev.member_id] : null
              const assisterName = ev.assisted_by ? memberNameById[ev.assisted_by] : null
              return (
                <li key={ev.id} className="flex items-center gap-3 text-sm">
                  <span className="text-xl">{eventIcon[ev.type] ?? '•'}</span>
                  <span className="text-gray-500 dark:text-gray-400 w-10">{ev.minute}&apos;</span>
                  {isOpponent ? (
                    <span className="text-red-600 font-medium">
                      相手{ev.opponent_scorer ? ` #${ev.opponent_scorer}` : ''}
                      {ev.opponent_assist && (
                        <span className="text-gray-500 dark:text-gray-400 font-normal">（アシスト: #{ev.opponent_assist}）</span>
                      )}
                    </span>
                  ) : (
                    <>
                      <span className="font-medium">{scorerName}</span>
                      {assisterName && (
                        <span className="text-gray-500 dark:text-gray-400">（アシスト: {assisterName}）</span>
                      )}
                    </>
                  )}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-gray-400 dark:text-gray-500 text-sm">イベント記録がありません</p>
        )}
      </div>
    </div>
  )
}
