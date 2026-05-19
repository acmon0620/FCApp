'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { TAG_COLOR } from '@/lib/matchTags'

type Tab = 'goals' | 'assists' | 'appearances' | 'minutes' | 'yellow' | 'red'

type RankingRow = {
  member_id: string
  member_name: string
  member_number: number | null
  goals: number
  assists: number
  yellow_cards: number
  red_cards: number
  appearances: number
  total_minutes: number
}

type Entry = { memberId: string; name: string; number: number | null; count: number }

const TABS: { key: Tab; label: string; unit: string; emoji: string; col: keyof RankingRow }[] = [
  { key: 'goals',       label: '得点',    unit: '点',  emoji: '⚽', col: 'goals' },
  { key: 'assists',     label: 'アシスト', unit: 'A',   emoji: '🎯', col: 'assists' },
  { key: 'appearances', label: '試合数',  unit: '試合', emoji: '👟', col: 'appearances' },
  { key: 'minutes',     label: '出場時間', unit: '分',  emoji: '⏱️', col: 'total_minutes' },
  { key: 'yellow',      label: '警告',    unit: '枚',  emoji: '🟨', col: 'yellow_cards' },
  { key: 'red',         label: '退場',    unit: '枚',  emoji: '🟥', col: 'red_cards' },
]

const MEDALS    = ['🥇', '🥈', '🥉']
const BAD_ICONS = ['💀', '😤', '😒']

export default function RankingsClient({ teamId, availableTags }: { teamId: string; availableTags: string[] }) {
  const [tab, setTab] = useState<Tab>('goals')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [rows, setRows] = useState<RankingRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetch() {
      setLoading(true)
      const supabase = createClient()
      const params: Record<string, unknown> = { p_team_id: teamId }
      if (selectedTag) params.p_tag = selectedTag
      if (dateFrom)    params.p_date_from = dateFrom
      if (dateTo)      params.p_date_to   = dateTo

      const { data } = await supabase.rpc('get_team_rankings', params as never)
      if (!cancelled) {
        setRows((data ?? []).map((r: RankingRow) => ({
          ...r,
          goals:         Number(r.goals),
          assists:       Number(r.assists),
          yellow_cards:  Number(r.yellow_cards),
          red_cards:     Number(r.red_cards),
          appearances:   Number(r.appearances),
          total_minutes: Number(r.total_minutes),
        })))
        setLoading(false)
      }
    }

    fetch()
    return () => { cancelled = true }
  }, [teamId, selectedTag, dateFrom, dateTo])

  const tabMeta = TABS.find(t => t.key === tab)!
  const entries: Entry[] = rows
    .map(r => ({ memberId: r.member_id, name: r.member_name, number: r.member_number, count: r[tabMeta.col] as number }))
    .filter(e => e.count > 0)
    .sort((a, b) => b.count - a.count)

  const isNegative = tab === 'yellow' || tab === 'red'
  const topIcons   = isNegative ? BAD_ICONS : MEDALS

  const hasFilter = selectedTag !== null || dateFrom !== '' || dateTo !== ''

  return (
    <div className="space-y-4 max-w-xl">
      {/* フィルターパネル */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm space-y-4">
        {/* タグフィルター */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">種別で絞り込み</p>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedTag(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedTag === null
                  ? 'bg-green-600 text-white border-green-600'
                  : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400'
              }`}
            >
              すべて
            </button>
            {availableTags.length === 0 ? (
              <span className="text-xs text-gray-400 dark:text-gray-500">タグ付きの試合がありません</span>
            ) : (
              availableTags.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTag(prev => prev === t ? null : t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedTag === t
                      ? `${TAG_COLOR[t] ?? 'bg-green-100 text-green-700'} border-transparent`
                      : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-400'
                  }`}
                >
                  {t}
                </button>
              ))
            )}
          </div>
        </div>

        {/* 期間フィルター */}
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">期間で絞り込み</p>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
            />
            <span className="text-gray-400 dark:text-gray-500 text-sm flex-shrink-0">〜</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
            />
            {(dateFrom || dateTo) && (
              <button
                onClick={() => { setDateFrom(''); setDateTo('') }}
                className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-400 flex-shrink-0"
              >
                クリア
              </button>
            )}
          </div>
        </div>

        {/* 現在のフィルター表示 */}
        {hasFilter && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded-lg">
              {[
                selectedTag,
                dateFrom && dateTo ? `${dateFrom} 〜 ${dateTo}` :
                dateFrom ? `${dateFrom} 以降` :
                dateTo   ? `${dateTo} まで` : null,
              ].filter(Boolean).join(' / ')} で絞り込み中
            </p>
            <button
              onClick={() => { setSelectedTag(null); setDateFrom(''); setDateTo('') }}
              className="text-xs text-gray-400 dark:text-gray-500 hover:text-red-400"
            >
              すべてクリア
            </button>
          </div>
        )}
      </div>

      {/* カテゴリタブ */}
      <div className="flex rounded-xl overflow-x-auto border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-shrink-0 px-3 py-2.5 text-xs font-medium transition-colors flex flex-col items-center gap-0.5 min-w-[60px] ${
              tab === t.key ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            <span className="text-base">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* ランキングリスト */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">読み込み中...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">記録がありません</div>
        ) : (
          <ul className="divide-y dark:divide-gray-700">
            {entries.map((entry, i) => {
              const isTop3 = i < 3
              return (
                <li
                  key={entry.memberId}
                  className={`flex items-center gap-4 px-5 py-3.5 border-b last:border-0 border-gray-200 dark:border-gray-700 ${
                    i === 0 && !isNegative ? 'bg-yellow-50' :
                    i === 0 &&  isNegative ? 'bg-red-50'    : ''
                  }`}
                >
                  <div className="w-8 text-center flex-shrink-0">
                    {isTop3
                      ? <span className="text-xl">{topIcons[i]}</span>
                      : <span className="text-sm font-bold text-gray-400 dark:text-gray-500">{i + 1}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {entry.number != null && (
                        <span className="text-gray-400 dark:text-gray-500 text-sm mr-1">#{entry.number}</span>
                      )}
                      {entry.name}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1 flex-shrink-0">
                    <span className={`text-2xl font-bold ${i === 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                      {entry.count}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{tabMeta.unit}</span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
