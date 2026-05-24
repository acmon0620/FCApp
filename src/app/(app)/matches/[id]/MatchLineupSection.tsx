'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type LineupRow = {
  id: string
  displayName: string
  number: number | null
  position: string | null
  startMinute: number | null
  endMinute: number | null
  isStarter: boolean
  minutes: number | null
}

type SubEntry = {
  id: string
  displayName: string
  number: number | null
}

type Props = {
  matchId: string
  lineupRows: LineupRow[]
  activeLineups: SubEntry[]
  benchLineups: SubEntry[]
  isAdmin: boolean
}

const selectClass =
  'w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100'

export default function MatchLineupSection({
  matchId, lineupRows, activeLineups, benchLineups, isAdmin,
}: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [outId, setOutId] = useState('')
  const [inId, setInId] = useState('')
  const [minute, setMinute] = useState(0)
  const [saving, setSaving] = useState(false)

  function openForm() {
    setOutId('')
    setInId('')
    setMinute(0)
    setShowForm(true)
  }

  async function save() {
    if (!outId || !inId) return
    setSaving(true)
    const supabase = createClient()
    await Promise.all([
      supabase.from('lineups').update({ end_minute: minute }).eq('id', outId),
      supabase.from('lineups').update({ start_minute: minute }).eq('id', inId),
    ])
    setShowForm(false)
    setSaving(false)
    router.refresh()
  }

  const memberLabel = (l: SubEntry) => `${l.number != null ? `#${l.number} ` : ''}${l.displayName}`

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">出場メンバー</h2>
        {isAdmin && (
          <div className="flex items-center gap-3">
            {!showForm && activeLineups.length > 0 && benchLineups.length > 0 && (
              <button
                onClick={openForm}
                className="text-sm text-green-600 dark:text-green-400 hover:underline"
              >
                + 交代
              </button>
            )}
            <Link
              href={`/matches/${matchId}/lineup`}
              className="text-sm text-green-600 dark:text-green-400 hover:underline"
            >
              メンバーを設定
            </Link>
          </div>
        )}
      </div>

      {showForm && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4 space-y-2">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">OUT（退く選手）</label>
            <select value={outId} onChange={e => setOutId(e.target.value)} className={selectClass}>
              <option value="">選手を選択</option>
              {activeLineups.map(l => (
                <option key={l.id} value={l.id}>{memberLabel(l)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">IN（入る選手）</label>
            <select value={inId} onChange={e => setInId(e.target.value)} className={selectClass}>
              <option value="">選手を選択</option>
              {benchLineups.map(l => (
                <option key={l.id} value={l.id}>{memberLabel(l)}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400">時間</label>
            <input
              type="number"
              value={minute}
              onChange={e => setMinute(Number(e.target.value))}
              min={0}
              className="w-16 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400">分</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 py-1.5 rounded text-sm"
            >
              キャンセル
            </button>
            <button
              onClick={save}
              disabled={saving || !outId || !inId}
              className="flex-1 bg-green-600 text-white py-1.5 rounded text-sm disabled:opacity-50"
            >
              {saving ? '記録中...' : '記録'}
            </button>
          </div>
        </div>
      )}

      {lineupRows.length > 0 ? (
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
            {lineupRows.map(l => (
              <tr key={l.id}>
                <td className="py-2 text-gray-900 dark:text-white">
                  {l.number != null && <span className="text-gray-400 dark:text-gray-500 mr-1">#{l.number}</span>}
                  {l.displayName}
                  {l.isStarter && (
                    <span className="ml-1.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">先発</span>
                  )}
                </td>
                <td className="py-2 text-gray-600 dark:text-gray-400">{l.position ?? '-'}</td>
                <td className="py-2 text-gray-600 dark:text-gray-400">
                  {l.startMinute}分〜{l.endMinute != null ? `${l.endMinute}分` : ''}
                </td>
                <td className="py-2 text-right font-medium text-gray-700 dark:text-gray-300">
                  {l.minutes != null ? `${l.minutes}分` : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-gray-400 dark:text-gray-500 text-sm">出場記録がありません</p>
      )}
    </div>
  )
}
