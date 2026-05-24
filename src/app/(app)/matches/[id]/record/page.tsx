'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

type Member = { id: string; name: string; number: number | null }
type Lineup = { id: string; member_id: string; position: string | null; start_minute: number | null; end_minute: number | null }
type Event = {
  id: string
  member_id: string | null
  assisted_by: string | null
  type: string
  minute: number
  opponent_scorer: string | null
  opponent_assist: string | null
}
type Match = { id: string; opponent: string; date: string; score_us: number; score_them: number; duration: number | null }

const EVENT_ICON: Record<string, string> = {
  goal: '⚽',
  yellow_card: '🟨',
  red_card: '🟥',
  opponent_goal: '⚽',
}

export default function MatchRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [match, setMatch] = useState<Match | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [lineups, setLineups] = useState<Lineup[]>([])
  const [events, setEvents] = useState<Event[]>([])

  // 追加フォーム
  const [showAddForm, setShowAddForm] = useState(false)
  const [addMember, setAddMember] = useState('')
  const [addPosition, setAddPosition] = useState('')
  const [addMinute, setAddMinute] = useState(0)

  // 交代フォーム
  const [showSubForm, setShowSubForm] = useState(false)
  const [subOut, setSubOut] = useState('')
  const [subIn, setSubIn] = useState('')
  const [subPosition, setSubPosition] = useState('')
  const [subMinute, setSubMinute] = useState(0)

  // 自チームイベントフォーム
  const [showEventForm, setShowEventForm] = useState(false)
  const [eventType, setEventType] = useState<'goal' | 'yellow_card' | 'red_card'>('goal')
  const [eventMember, setEventMember] = useState('')
  const [assistMember, setAssistMember] = useState('')
  const [eventMinute, setEventMinute] = useState(0)

  // 相手得点フォーム
  const [showOpponentForm, setShowOpponentForm] = useState(false)
  const [opponentScorer, setOpponentScorer] = useState('')
  const [opponentAssist, setOpponentAssist] = useState('')
  const [opponentMinute, setOpponentMinute] = useState(0)

  useEffect(() => {
    loadData()
    const channel = supabase
      .channel(`match-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events', filter: `match_id=eq.${id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lineups', filter: `match_id=eq.${id}` }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${id}` }, () => loadData())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [id])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: memberRow } = await supabase.from('members').select('team_id').eq('id', user.id).single()
    if (!memberRow) return

    const [matchRes, membersRes, lineupsRes, eventsRes] = await Promise.all([
      supabase.from('matches').select('*').eq('id', id).single(),
      supabase.from('members').select('id, name, number').eq('team_id', memberRow.team_id).eq('is_system_account', false).is('deleted_at', null),
      supabase.from('lineups').select('*').eq('match_id', id).order('start_minute'),
      supabase.from('events').select('*').eq('match_id', id).order('minute'),
    ])

    if (matchRes.data) setMatch(matchRes.data)
    if (membersRes.data) setMembers(membersRes.data)
    if (lineupsRes.data) setLineups(lineupsRes.data)
    if (eventsRes.data) setEvents(eventsRes.data)
  }

  async function addLineup() {
    const m = members.find(m => m.id === addMember)
    const benchEntry = lineups.find(l => l.member_id === addMember && l.start_minute === null && l.end_minute === null)
    if (benchEntry) {
      await supabase.from('lineups').update({
        start_minute: addMinute,
        position: addPosition || null,
        member_name: m?.name ?? null,
      }).eq('id', benchEntry.id)
    } else {
      await supabase.from('lineups').insert({
        match_id: id,
        member_id: addMember,
        member_name: m?.name ?? null,
        position: addPosition || null,
        start_minute: addMinute,
      })
    }
    setShowAddForm(false)
    setAddMember('')
    setAddPosition('')
    setAddMinute(0)
    await loadData()
  }

  async function addSubstitution() {
    const outLineup = lineups.find(l => l.member_id === subOut && l.end_minute == null)
    const inMember = members.find(m => m.id === subIn)
    const benchEntry = lineups.find(l => l.member_id === subIn && l.start_minute === null && l.end_minute === null)

    const inOp = benchEntry
      ? supabase.from('lineups').update({
          start_minute: subMinute,
          position: subPosition || benchEntry.position,
          member_name: inMember?.name ?? null,
        }).eq('id', benchEntry.id)
      : supabase.from('lineups').insert({
          match_id: id,
          member_id: subIn,
          member_name: inMember?.name ?? null,
          position: subPosition || null,
          start_minute: subMinute,
        })

    const outOp = outLineup
      ? supabase.from('lineups').update({ end_minute: subMinute }).eq('id', outLineup.id)
      : Promise.resolve()

    await Promise.all([inOp, outOp])
    setShowSubForm(false)
    setSubOut('')
    setSubIn('')
    setSubPosition('')
    await loadData()
  }

  async function addEvent() {
    await supabase.from('events').insert({
      match_id: id,
      member_id: eventMember,
      assisted_by: eventType === 'goal' && assistMember ? assistMember : null,
      type: eventType,
      minute: eventMinute,
    })
    if (eventType === 'goal') {
      const newScore = events.filter(e => e.type === 'goal').length + 1
      await supabase.from('matches').update({ score_us: newScore }).eq('id', id)
    }
    setShowEventForm(false)
    setEventMember('')
    setAssistMember('')
    await loadData()
  }

  async function addOpponentGoal() {
    const newScore = (match?.score_them ?? 0) + 1
    await Promise.all([
      supabase.from('matches').update({ score_them: newScore }).eq('id', id),
      supabase.from('events').insert({
        match_id: id,
        member_id: null,
        type: 'opponent_goal',
        minute: opponentMinute,
        opponent_scorer: opponentScorer || null,
        opponent_assist: opponentAssist || null,
      }),
    ])
    setShowOpponentForm(false)
    setOpponentScorer('')
    setOpponentAssist('')
    await loadData()
  }

  async function undoOpponentGoal() {
    const newScore = Math.max(0, (match?.score_them ?? 0) - 1)
    const lastGoal = [...events].reverse().find(e => e.type === 'opponent_goal')
    await Promise.all([
      supabase.from('matches').update({ score_them: newScore }).eq('id', id),
      lastGoal ? supabase.from('events').delete().eq('id', lastGoal.id) : Promise.resolve(),
    ])
    await loadData()
  }

  async function deleteEvent(ev: Event) {
    await supabase.from('events').delete().eq('id', ev.id)
    if (ev.type === 'goal') {
      await supabase.from('matches').update({ score_us: Math.max(0, (match?.score_us ?? 0) - 1) }).eq('id', id)
    } else if (ev.type === 'opponent_goal') {
      await supabase.from('matches').update({ score_them: Math.max(0, (match?.score_them ?? 0) - 1) }).eq('id', id)
    }
    await loadData()
  }

  if (!match) return <div className="text-gray-500 dark:text-gray-400">読み込み中...</div>

  const onField = lineups.filter(l => l.start_minute !== null && l.end_minute == null)
  const bench = lineups.filter(l => l.start_minute === null && l.end_minute === null)
  const onFieldIds = new Set(onField.map(l => l.member_id))
  const benchMemberIds = new Set(bench.map(l => l.member_id))

  const benchMembers = members.filter(m => benchMemberIds.has(m.id))
  const notOnField = members.filter(m => !onFieldIds.has(m.id))
  const attendingIds = new Set(lineups.map(l => l.member_id))
  const eventMembers = attendingIds.size > 0 ? members.filter(m => attendingIds.has(m.id)) : members

  const memberLabel = (m: Member) => `${m.number ? `#${m.number} ` : ''}${m.name}`

  return (
    <div className="space-y-5 max-w-2xl">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">試合記録</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">vs {match.opponent} · {match.date}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/matches/${id}/lineup`}
            className="border border-green-600 text-green-600 dark:text-green-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
          >
            メンバー設定
          </Link>
          <Link
            href={`/matches/${id}`}
            className="border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            戻る
          </Link>
        </div>
      </div>

      {/* スコア */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">自チーム</p>
            <p className="text-4xl font-bold text-gray-900 dark:text-white">{match.score_us}</p>
          </div>
          <div className="flex flex-col items-center gap-2 px-4">
            <p className="text-gray-300 dark:text-gray-600 text-2xl font-light">-</p>
            {match.duration != null && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{match.duration}分</p>
            )}
          </div>
          <div className="text-center flex-1">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">相手</p>
            <p className="text-4xl font-bold text-gray-900 dark:text-white">{match.score_them}</p>
            <div className="flex gap-1 mt-1 justify-center">
              <button
                onClick={undoOpponentGoal}
                className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                -
              </button>
              <button
                onClick={() => { setOpponentMinute(0); setShowOpponentForm(true) }}
                className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded hover:bg-red-200 font-medium"
              >
                + 得点
              </button>
            </div>
          </div>
        </div>

        {/* 相手得点フォーム */}
        {showOpponentForm && (
          <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">相手の得点を記録</p>
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
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">時間</label>
              <input
                type="number"
                value={opponentMinute}
                onChange={e => setOpponentMinute(Number(e.target.value))}
                className="w-16 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100"
                min={0}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">分</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowOpponentForm(false)}
                className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 py-1.5 rounded text-sm"
              >
                キャンセル
              </button>
              <button
                onClick={addOpponentGoal}
                className="flex-1 bg-red-600 text-white py-1.5 rounded text-sm font-medium"
              >
                記録する
              </button>
            </div>
          </div>
        )}
      </div>

      {/* フィールド上のメンバー */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">
            フィールド上のメンバー（{onField.length}人）
          </h2>
          <div className="flex gap-3">
            {onField.length < 11 && (
              <button
                onClick={() => { setAddMinute(0); setShowAddForm(true) }}
                className="text-sm text-green-600 dark:text-green-400 hover:underline"
              >
                + 追加
              </button>
            )}
            <button
              onClick={() => { setSubMinute(0); setShowSubForm(true) }}
              className="text-sm text-green-600 dark:text-green-400 hover:underline font-medium"
            >
              交代を追加
            </button>
          </div>
        </div>

        {/* 追加フォーム */}
        {showAddForm && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3 space-y-2">
            <select
              value={addMember}
              onChange={e => setAddMember(e.target.value)}
              className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="">メンバーを選択</option>
              {notOnField.map(m => (
                <option key={m.id} value={m.id}>{memberLabel(m)}</option>
              ))}
            </select>
            <input
              type="text"
              value={addPosition}
              onChange={e => setAddPosition(e.target.value)}
              placeholder="ポジション（例：FW）"
              className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">出場開始</label>
              <input
                type="number"
                value={addMinute}
                onChange={e => setAddMinute(Number(e.target.value))}
                className="w-16 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100"
                min={0}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">分</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAddForm(false)} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 py-1.5 rounded text-sm">キャンセル</button>
              <button onClick={addLineup} disabled={!addMember} className="flex-1 bg-green-600 text-white py-1.5 rounded text-sm disabled:opacity-50">追加</button>
            </div>
          </div>
        )}

        {/* 交代フォーム */}
        {showSubForm && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3 space-y-2">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">選手交代</p>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">OUT（外れる選手）</label>
              <select
                value={subOut}
                onChange={e => {
                  setSubOut(e.target.value)
                  const outL = onField.find(l => l.member_id === e.target.value)
                  if (outL?.position) setSubPosition(outL.position)
                }}
                className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">選択してください</option>
                {onField.map(l => {
                  const m = members.find(m => m.id === l.member_id)
                  if (!m) return null
                  return (
                    <option key={l.id} value={l.member_id}>
                      {memberLabel(m)}{l.position ? ` (${l.position})` : ''}
                    </option>
                  )
                })}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-0.5">IN（入る選手）</label>
              <select
                value={subIn}
                onChange={e => setSubIn(e.target.value)}
                className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="">選択してください</option>
                {(benchMembers.length > 0 ? benchMembers : notOnField).map(m => (
                  <option key={m.id} value={m.id}>{memberLabel(m)}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={subPosition}
              onChange={e => setSubPosition(e.target.value)}
              placeholder="ポジション（省略可）"
              className="w-full border border-gray-200 dark:border-gray-600 rounded px-2 py-1.5 text-sm dark:bg-gray-800 dark:text-gray-100"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 dark:text-gray-400">交代時間</label>
              <input
                type="number"
                value={subMinute}
                onChange={e => setSubMinute(Number(e.target.value))}
                className="w-16 border border-gray-200 dark:border-gray-600 rounded px-2 py-1 text-sm dark:bg-gray-800 dark:text-gray-100"
                min={0}
              />
              <span className="text-xs text-gray-500 dark:text-gray-400">分</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSubForm(false)} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 py-1.5 rounded text-sm">キャンセル</button>
              <button
                onClick={addSubstitution}
                disabled={!subOut || !subIn}
                className="flex-1 bg-green-600 text-white py-1.5 rounded text-sm disabled:opacity-50"
              >
                交代を記録
              </button>
            </div>
          </div>
        )}

        {onField.length > 0 ? (
          <ul className="space-y-1">
            {onField.map(l => {
              const m = members.find(m => m.id === l.member_id)
              return (
                <li key={l.id} className="text-sm py-1 flex items-center gap-1">
                  {m?.number != null && <span className="text-gray-400 dark:text-gray-500">#{m.number}</span>}
                  <span className="text-gray-900 dark:text-white">{(l as { member_name?: string | null }).member_name ?? m?.name}</span>
                  {l.position && <span className="text-gray-400 dark:text-gray-500">({l.position})</span>}
                  <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">
                    {l.start_minute}分〜
                  </span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-gray-400 dark:text-gray-500 text-sm">メンバーが登録されていません</p>
        )}
      </div>

      {/* イベント */}
      <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">イベント</h2>
          <button
            onClick={() => { setShowEventForm(true); setEventMinute(0) }}
            className="text-sm text-green-600 dark:text-green-400 hover:underline"
          >
            + 記録
          </button>
        </div>

        {showEventForm && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-3 space-y-2">
            <div className="flex gap-2">
              {(['goal', 'yellow_card', 'red_card'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setEventType(t)}
                  className={`flex-1 py-1.5 rounded text-sm border ${
                    eventType === t ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  {EVENT_ICON[t]} {t === 'goal' ? '得点' : t === 'yellow_card' ? '警告' : '退場'}
                </button>
              ))}
            </div>
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
              <button onClick={() => setShowEventForm(false)} className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 py-1.5 rounded text-sm">キャンセル</button>
              <button onClick={addEvent} disabled={!eventMember} className="flex-1 bg-green-600 text-white py-1.5 rounded text-sm disabled:opacity-50">記録</button>
            </div>
          </div>
        )}

        {events.length > 0 ? (
          <ul className="space-y-1">
            {events.map(ev => {
              const isOpponent = ev.type === 'opponent_goal'
              const m = !isOpponent ? members.find(m => m.id === ev.member_id) : null
              const a = ev.assisted_by ? members.find(m => m.id === ev.assisted_by) : null
              return (
                <li key={ev.id} className="flex items-center gap-2 text-sm py-0.5">
                  <span>{EVENT_ICON[ev.type] ?? '•'}</span>
                  <span className="text-gray-400 dark:text-gray-500 w-8 flex-shrink-0">{ev.minute}&apos;</span>
                  {isOpponent ? (
                    <span className="text-red-600">
                      相手{ev.opponent_scorer ? ` #${ev.opponent_scorer}` : ''}
                      {ev.opponent_assist && (
                        <span className="text-gray-400 dark:text-gray-500">（アシスト: #{ev.opponent_assist}）</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-gray-900 dark:text-white">
                      {(ev as { member_name?: string | null }).member_name ?? m?.name}
                      {(() => {
                        const aName = (ev as { assisted_by_name?: string | null }).assisted_by_name ?? a?.name
                        return aName ? <span className="text-gray-400 dark:text-gray-500">（アシスト: {aName}）</span> : null
                      })()}
                    </span>
                  )}
                  <button
                    onClick={() => deleteEvent(ev)}
                    className="ml-auto text-gray-300 dark:text-gray-600 hover:text-red-400 text-lg leading-none flex-shrink-0"
                    title="削除"
                  >
                    ×
                  </button>
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
