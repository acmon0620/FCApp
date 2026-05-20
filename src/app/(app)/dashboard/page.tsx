import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getCurrentMember } from '@/lib/auth'

export default async function DashboardPage() {
  const member = await getCurrentMember()
  if (!member) redirect('/login')

  const teamId = member.team_id
  const supabase = await createClient()

  // 全試合・直近5試合・ランキングを並行取得
  const [{ data: allMatches }, { data: recentMatches }, { data: scorerData }] = await Promise.all([
    supabase
      .from('matches')
      .select('score_us, score_them')
      .eq('team_id', teamId)
      .eq('status', 'finished'),
    supabase
      .from('matches')
      .select('*')
      .eq('team_id', teamId)
      .eq('status', 'finished')
      .order('date', { ascending: false })
      .limit(5),
    supabase.rpc('get_top_scorers', { p_team_id: teamId, p_limit: 3 }),
  ])

  const ranking: { name: string; goals: number }[] = (scorerData ?? []).map(
    (r: { member_name: string; goals: number }) => ({ name: r.member_name, goals: Number(r.goals) })
  )

  const wins = allMatches?.filter(m => m.score_us > m.score_them).length ?? 0
  const draws = allMatches?.filter(m => m.score_us === m.score_them).length ?? 0
  const losses = allMatches?.filter(m => m.score_us < m.score_them).length ?? 0

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ダッシュボード</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-green-600">{wins}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">勝利</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-yellow-500">{draws}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">引き分け</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm text-center">
          <p className="text-3xl font-bold text-red-500">{losses}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">敗北</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">直近の試合結果</h2>
          {recentMatches && recentMatches.length > 0 ? (
            <ul className="space-y-2">
              {recentMatches.map(m => {
                const result = m.score_us > m.score_them ? '勝' : m.score_us === m.score_them ? '分' : '負'
                const resultColor = result === '勝' ? 'text-green-600' : result === '分' ? 'text-yellow-500' : 'text-red-500'
                return (
                  <li key={m.id} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{m.date} vs {m.opponent}</span>
                    <span className={`font-bold ${resultColor}`}>
                      {m.score_us} - {m.score_them} ({result})
                    </span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className="text-gray-400 dark:text-gray-500 text-sm">試合記録がありません</p>
          )}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800 dark:text-gray-100">得点ランキング TOP3</h2>
            <Link href="/rankings" className="text-xs text-green-600 dark:text-green-400 hover:underline">
              全ランキングを見る →
            </Link>
          </div>
          {ranking.length > 0 ? (
            <ol className="space-y-2">
              {ranking.map((r, i) => {
                const medals = ['🥇', '🥈', '🥉']
                return (
                  <li key={r.name} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <span className="text-base">{medals[i]}</span>
                      {r.name}
                    </span>
                    <span className="font-bold text-green-600">{r.goals}点</span>
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="text-gray-400 dark:text-gray-500 text-sm">得点記録がありません</p>
          )}
        </div>
      </div>
    </div>
  )
}
