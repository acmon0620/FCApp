'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Event = {
  id: string
  type: string
  minute: number
  member_id: string | null
  member_name?: string | null
  assisted_by: string | null
  assisted_by_name?: string | null
  opponent_scorer: string | null
  opponent_assist: string | null
}

type Member = { id: string; name: string; number: number | null }

type Props = {
  matchId: string
  scoreUs: number
  scoreThem: number
  initialEvents: Event[]
  eventMembers: Member[]
  memberNameById: Record<string, string>
  isAdmin: boolean
}

const EVENT_ICON: Record<string, string> = {
  goal: '⚽',
  yellow_card: '🟨',
  red_card: '🟥',
  opponent_goal: '⚽',
}

export default function MatchEventsClient({
  matchId, scoreUs, scoreThem, initialEvents, eventMembers, memberNameById, isAdmin,
}: Props) {
  const router = useRouter()
  const supabase = createClient()

  // ローカル状態でイベントを管理（router.refresh() を待たずに即時表示）
  const [events, setEvents] = useState<Event[]>(initialEvents)

  // router.refresh() 完了後、サーバーからの最新データで同期
  useEffect(() => {
    setEvents(initialEvents)
  }, [initialEvents])

  const [showForm, setShowForm] = useState(false)
  const [eventType, setEventType] = useState<'goal' | 'yellow_card' | 'red_card' | 'opponent_goal'>('goal')
  const [eventMember, setEventMember] = useState('')
  const [assistMember, setAssistMember] = useState('')
  const [eventMinute, setEventMinute] = useState(0)
  const [opponentScorer, setOpponentScorer] = useState('')
  const [opponentAssist, setOpponentAssist] = useState('')
  const [saving, setSaving] = useState(false)

  // eventMembers の名前もルックアップに含める
  const nameLookup = useMemo(() => ({
    ...memberNameById,
    ...Object.fromEntries(eventMembers.map(m => [m.id, m.name])),
  }), [memberNameById, eventMembers])

  const memberLabel = (m: Member) => `${m.number ? `#${m.number} ` : ''}${m.name}`

  function openForm() {
    setEventMinute(0)
    setEventMember('')
    setAssistMember('')
    setOpponentScorer('')
    setOpponentAssist('')
    setEventType('goal')
    setShowForm(true)
  }

  async function addEvent() {
    setSaving(true)

    if (eventType === 'opponent_goal') {
      const payload: Record<string, string | number | null> = {
        match_id: matchId,
        member_id: null,
        type: 'opponent_goal',
        minute: eventMinute,
      }
      if (opponentScorer) payload.opponent_scorer = opponentScorer
      if (opponentAssist) payload.opponent_assist = opponentAssist

      await Promise.all([
        supabase.from('matches').update({ score_them: scoreThem + 1 }).eq('id', matchId),
        supabase.from('events').insert(payload),
      ])

      // .select() は RLS の RETURNING ブロックで null になる場合があるため、
      // 入力値から直接オブジェクトを組み立ててローカル state に追加する
      setEvents(prev =>
        [...prev, {
          id: `temp-${Date.now()}`,
          type: 'opponent_goal',
          minute: eventMinute,
          member_id: null,
          member_name: null,
          assisted_by: null,
          assisted_by_name: null,
          opponent_scorer: opponentScorer || null,
          opponent_assist: opponentAssist || null,
        }].sort((a, b) => a.minute - b.minute)
      )
    } else {
      const m = eventMembers.find(mem => mem.id === eventMember)
      const a = assistMember ? eventMembers.find(mem => mem.id === assistMember) : null

      await supabase.from('events').insert({
        match_id: matchId,
        member_id: eventMember,
        assisted_by: eventType === 'goal' && assistMember ? assistMember : null,
        type: eventType,
        minute: eventMinute,
      })

      if (eventType === 'goal') {
        await supabase.from('matches').update({ score_us: scoreUs + 1 }).eq('id', matchId)
      }

      setEvents(prev =>
        [...prev, {
          id: `temp-${Date.now()}`,
          type: eventType,
          minute: eventMinute,
          member_id: eventMember,
          member_name: m?.name ?? null,
          assisted_by: (eventType === 'goal' && assistMember) ? assistMember : null,
          assisted_by_name: a?.name ?? null,
          opponent_scorer: null,
          opponent_assist: null,
        }].sort((a, b) => a.minute - b.minute)
      )
    }

    setShowForm(false)
    setSaving(false)
    router.refresh() // スコア表示（サーバーコンポーネント）を更新
  }

  async function deleteEvent(ev: Event) {
    // 即時反映
    setEvents(prev => prev.filter(e => e.id !== ev.id))

    await supabase.from('events').delete().eq('id', ev.id)
    if (ev.type === 'goal') {
      await supabase.from('matches').update({ score_us: Math.max(0, scoreUs - 1) }).eq('id', matchId)
    } else if (ev.type === 'opponent_goal') {
      await supabase.from('matches').update({ score_them: Math.max(0, scoreThem - 1) }).eq('id', matchId)
    }
    router.refresh()
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">イベント</h2>
        {isAdmin && !showForm && (
          <button
            onClick={openForm}
            className="text-sm text-green-600 dark:text-green-400 hover:underline"
          >
            + 記録
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {(['goal', 'yellow_card', 'red_card', 'opponent_goal'] as const).map(t => (
              <button
                key={t}
                onClick={() => setEventType(t)}
                className={`py-1.5 rounded text-sm border ${
                  eventType === t
                    ? 'border-green-600 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                }`}
              >
                {EVENT_ICON[t]} {t === 'goal' ? '自チーム得点' : t === 'yellow_card' ? '警告' : t === 'red_card' ? '退場' : '相手得点'}
              </button>
            ))}
          </div>

          {eventType === 'opponent_goal' ? (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">得点者 背番号</label>
                <input
                  type="text"
                  value={opponentScorer}
                  onChange={e => setOpponentScorer(e.target.value)}
                  placeholder="例：10"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">アシスト 背番号</label>
                <input
                  type="text"
                  value={opponentAssist}
                  onChange={e => setOpponentAssist(e.target.value)}
                  placeholder="例：7"
                  className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100"
                />
              </div>
            </div>
          ) : (
            <>
              <select
                value={eventMember}
                onChange={e => setEventMember(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">選手を選択</option>
                {eventMembers.map(m => (
                  <option key={m.id} value={m.id}>{memberLabel(m)}</option>
                ))}
              </select>
              {eventType === 'goal' && (
                <select
                  value={assistMember}
                  onChange={e => setAssistMember(e.target.value)}
                  className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100"
                >
                  <option value="">アシスト選手（なければスキップ）</option>
                  {eventMembers.filter(m => m.id !== eventMember).map(m => (
                    <option key={m.id} value={m.id}>{memberLabel(m)}</option>
                  ))}
                </select>
              )}
            </>
          )}

          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 dark:text-gray-400">時間</label>
            <input
              type="number"
              value={eventMinute}
              onChange={e => setEventMinute(Number(e.target.value))}
              className="w-16 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100"
              min={0}
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
              onClick={addEvent}
              disabled={saving || (eventType !== 'opponent_goal' && !eventMember)}
              className="flex-1 bg-green-600 text-white py-1.5 rounded text-sm disabled:opacity-50"
            >
              {saving ? '記録中...' : '記録'}
            </button>
          </div>
        </div>
      )}

      {events.length > 0 ? (
        <ul className="space-y-2">
          {events.map(ev => {
            const isOpponent = ev.type === 'opponent_goal'
            const scorerName = !isOpponent
              ? (ev.member_name ?? (ev.member_id ? nameLookup[ev.member_id] : null))
              : null
            const assisterName = ev.assisted_by_name ?? (ev.assisted_by ? nameLookup[ev.assisted_by] : null)
            return (
              <li key={ev.id} className="flex items-center gap-3 text-sm">
                <span className="text-xl">{EVENT_ICON[ev.type] ?? '•'}</span>
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
                    <span className="font-medium text-gray-900 dark:text-white">{scorerName}</span>
                    {assisterName && (
                      <span className="text-gray-500 dark:text-gray-400">（アシスト: {assisterName}）</span>
                    )}
                  </>
                )}
                {isAdmin && (
                  <button
                    onClick={() => deleteEvent(ev)}
                    className="ml-auto text-gray-300 dark:text-gray-600 hover:text-red-400 text-xl leading-none flex-shrink-0"
                    title="削除"
                  >
                    ×
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="text-gray-400 dark:text-gray-500 text-sm">イベント記録がありません</p>
      )}
    </div>
  )
}
