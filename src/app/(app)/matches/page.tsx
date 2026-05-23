import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { TAG_COLOR } from '@/lib/matchTags'
import { getCurrentMember } from '@/lib/auth'

export default async function MatchesPage() {
  const member = await getCurrentMember()
  if (!member) redirect('/login')

  const supabase = await createClient()
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('team_id', member.team_id)
    .order('date', { ascending: false })

  const isAdmin = member.role === 'admin'

  const statusLabel: Record<string, string> = {
    scheduled: '予定',
    in_progress: '試合中',
    finished: '終了',
  }

  const statusColor: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    finished: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">試合一覧</h1>
        {isAdmin && (
          <Link
            href="/matches/new"
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            + 試合を追加
          </Link>
        )}
      </div>

      {matches && matches.length > 0 ? (
        <div className="space-y-3">
          {matches.map(m => (
            <Link
              key={m.id}
              href={`/matches/${m.id}`}
              className="block bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">vs {m.opponent}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{m.date}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {m.tag && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TAG_COLOR[m.tag] ?? 'bg-gray-100 text-gray-600'}`}>
                      {m.tag}
                    </span>
                  )}
                  {m.status === 'finished' && (() => {
                    const result = m.score_us > m.score_them ? '勝' : m.score_us < m.score_them ? '負' : '分'
                    const resultColor = m.score_us > m.score_them
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : m.score_us < m.score_them
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    return (
                      <>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${resultColor}`}>{result}</span>
                        <span className="text-lg font-bold text-gray-800 dark:text-gray-100">
                          {m.score_us} - {m.score_them}
                        </span>
                      </>
                    )
                  })()}
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor[m.status]}`}>
                    {statusLabel[m.status]}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-sm text-center">
          <p className="text-gray-400 dark:text-gray-500">試合記録がありません</p>
          {isAdmin && (
            <Link href="/matches/new" className="text-green-600 dark:text-green-400 text-sm mt-2 inline-block hover:underline">
              最初の試合を追加する
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
