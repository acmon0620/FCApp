'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Member = { id: string; name: string; number: number | null }
type Lineup = { id: string; member_id: string; position: string | null; start_minute: number; end_minute: number | null }
type Event = {
  id: string
  member_id: string | null
  assisted_by: string | null
  type: string
  minute: number
  opponent_scorer: string | null
  opponent_assist: string | null
}
type Match = { id: string; opponent: string; date: string; status: string; score_us: number; score_them: number }

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
  const [minute, setMinute] = useState(0)

  // 追加フォーム（試合前）
  const [showAddForm, setShowAddForm] = useState(false)
  const [addMember, setAddMember] = useState('')
  const [addPosition, setAddPosition] = useState('')
  const [addMinute, setAddMinute] = useState(0)

  // 交代フォーム（試合中）
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
      supabase.from('members').select('id, name, number').eq('team_id', memberRow.team_id).eq('is_system_account', false),
      supabase.from('lineups').select('*').eq('match_id', id).order('start_minute'),
      supabase.from('events').select('*').eq('match_id', id).order('minute'),
    ])

    if (matchRes.data) setMatch(matchRes.data)
    if (membersRes.data) setMembers(membersRes.data)
    if (lineupsRes.data) setLineups(lineupsRes.data)
    if (eventsRes.data) setEvents(eventsRes.data)
  }

  async function startMatch() {
    await supabase.from('matches').update({ status: 'in_progress' }).eq('id', id)
  }

  async function finishMatch() {
    const scoreUs = events.filter(e => e.type === 'goal').length
    await supabase.from('matches').update({ status: 'finished', score_us: scoreUs }).eq('id', id)
  }

  async function addLineup() {
    await supabase.from('lineups').insert({
      match_id: id,
      member_id: addMember,
      position: addPosition || null,
      start_minute: addMinute,
    })
    setShowAddForm(false)
    setAddMember('')
    setAddPosition('')
    setAddMinute(0)
  }

  async function addSubstitution() {
    const outLineup = onField.find(l => l.member_id === subOut)
    await Promise.all([
      supabase.from('lineups').insert({
        match_id: id,
        member_id: subIn,
        position: subPosition || null,
        start_minute: subMinute,
      }),
      outLineup
        ? supabase.from('lineups').update({ end_minute: subMinute }).eq('id', outLineup.id)
        : Promise.resolve(),
    ])
    setShowSubForm(false)
    setSubOut('')
    setSubIn('')
    setSubPosition('')
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
  }

  async function undoOpponentGoal() {
    const newScore = Math.max(0, (match?.score_them ?? 0) - 1)
    const lastGoal = [...events].reverse().find(e => e.type === 'opponent_goal')
    await Promise.all([
      supabase.from('matches').update({ score_them: newScore }).eq('id', id),
      lastGoal ? supabase.from('events').delete().eq('id', lastGoal.id) : Promise.resolve(),
    ])
  }

  async function deleteEvent(ev: Event) {
    await supabase.from('events').delete().eq('id', ev.id)
    if (ev.type === 'goal') {
      await supabase.from('matches').update({ score_us: Math.max(0, (match?.score_us ?? 0) - 1) }).eq('id', id)
    } else if (ev.type === 'opponent_goal') {
      await supabase.from('matches').update({ score_them: Math.max(0, (match?.score_them ?? 0) - 1) }).eq('id', id)
    }
  }

  if (!match) return <div className="text-gray-500">読み込み中...</div>

  const onField = lineups.filter(l => l.end_minute == null)
  const notOnField = members.filter(m => !onField.some(l => l.member_id === m.id))
  const memberLabel = (m: Member) => `${m.number ? `#${m.number} ` : ''}${m.name}`

  return (
    <div className="space-y-5 max-w-2xl">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">試合記録</h1>
          <p className="text-gray-500 text-sm">vs {match.opponent} · {match.date}</p>
        </div>
        <div className="flex gap-2">
          {match.status === 'scheduled' && (
            <button onClick={startMatch} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700">
              試合開始
            </button>
          )}
          {match.status === 'in_progress' && (
            <button onClick={finishMatch} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700">
              試合終了
            </button>
          )}
          {match.status === 'finished' && (
            <button onClick={() => router.push(`/matches/${id}`)} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
              詳細を見る
            </button>
          )}
        </div>
      </div>

      {/* スコア */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <p className="text-xs text-gray-500 mb-1">自チーム</p>
            <p className="text-4xl font-bold">{match.score_us}</p>
          </div>
          <div className="flex flex-col items-center gap-2 px-4">
            <p className="text-gray-300 text-2xl font-light">-</p>
            <div className="flex items-center gap-1">
              <label className="text-xs text-gray-500">現在</label>
              <input
                type="number"
                value={minute}
                onChange={e => setMinute(Number(e.target.value))}
                className="w-12 border border-gray-200 rounded px-1 py-0.5 text-sm text-center"
                min={0}
              />
              <span className="text-xs text-gray-500">分</span>
            </div>
          </div>
          <div className="text-center flex-1">
            <p className="text-xs text-gray-500 mb-1">相手</p>
            <p className="text-4xl font-bold">{match.score_them}</p>
            <div className="flex gap-1 mt-1 justify-center">
              <button
                onClick={undoOpponentGoal}
                className="text-xs bg-gray-100 px-2 py-0.5 rounded hover:bg-gray-200"
              >
                -
              </button>
              <button
                onClick={() => { setOpponentMinute(minute); setShowOpponentForm(true) }}
                className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded hover:bg-red-200 font-medium"
              >
                + 得点
              </button>
            </div>
          </div>
        </div>

        {/* 相手得点フォーム */}
        {showOpponentForm && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-red-800">相手の得点を記録</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-500 block mb-0.5">得点者 背番号</label>
                <input
                  type="text"
                  value={opponentScorer}
                  onChange={e => setOpponentScorer(e.target.value)}
                  placeholder="例：10"
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-0.5">アシスト 背番号</label>
                <input
                  type="text"
                  value={opponentAssist}
                  onChange={e => setOpponentAssist(e.target.value)}
                  placeholder="例：7"
                  className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">時間</label>
              <input
                type="number"
                value={opponentMinute}
                onChange={e => setOpponentMinute(Number(e.target.value))}
                className="w-16 border border-gray-200 rounded px-2 py-1 text-sm"
                min={0}
              />
              <span className="text-xs text-gray-500">分</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowOpponentForm(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-1.5 rounded text-sm"
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
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">フィールド上のメンバー（{onField.length}人）</h2>
          {match.status === 'scheduled' && onField.length < 11 && (
            <button
              onClick={() => { setAddMinute(0); setShowAddForm(true) }}
              className="text-sm text-green-600 hover:underline"
            >
              + 追加
            </button>
          )}
          {match.status === 'scheduled' && onField.length >= 11 && (
            <span className="text-xs text-green-600 font-medium">先発11人</span>
          )}
          {(match.status === 'in_progress' || match.status === 'finished') && (
            <button
              onClick={() => { setSubMinute(minute); setShowSubForm(true) }}
              className="text-sm text-green-600 hover:underline font-medium"
            >
              交代を追加
            </button>
          )}
        </div>

        {/* 追加フォーム（試合前） */}
        {showAddForm && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
            <select
              value={addMember}
              onChange={e => setAddMember(e.target.value)}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
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
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">出場開始</label>
              <input
                type="number"
                value={addMinute}
                onChange={e => setAddMinute(Number(e.target.value))}
                className="w-16 border border-gray-200 rounded px-2 py-1 text-sm"
                min={0}
              />
              <span className="text-xs text-gray-500">分</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAddForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-1.5 rounded text-sm">キャンセル</button>
              <button onClick={addLineup} disabled={!addMember} className="flex-1 bg-green-600 text-white py-1.5 rounded text-sm disabled:opacity-50">追加</button>
            </div>
          </div>
        )}

        {/* 交代フォーム（試合中） */}
        {showSubForm && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
            <p className="text-xs font-medium text-gray-700">選手交代</p>
            <div>
              <label className="text-xs text-gray-500 block mb-0.5">OUT（外れる選手）</label>
              <select
                value={subOut}
                onChange={e => {
                  setSubOut(e.target.value)
                  const outL = onField.find(l => l.member_id === e.target.value)
                  if (outL?.position) setSubPosition(outL.position)
                }}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
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
              <label className="text-xs text-gray-500 block mb-0.5">IN（入る選手）</label>
              <select
                value={subIn}
                onChange={e => setSubIn(e.target.value)}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
              >
                <option value="">選択してください</option>
                {notOnField.map(m => (
                  <option key={m.id} value={m.id}>{memberLabel(m)}</option>
                ))}
              </select>
            </div>
            <input
              type="text"
              value={subPosition}
              onChange={e => setSubPosition(e.target.value)}
              placeholder="ポジション（省略可）"
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">交代時間</label>
              <input
                type="number"
                value={subMinute}
                onChange={e => setSubMinute(Number(e.target.value))}
                className="w-16 border border-gray-200 rounded px-2 py-1 text-sm"
                min={0}
              />
              <span className="text-xs text-gray-500">分</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowSubForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-1.5 rounded text-sm">キャンセル</button>
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
                  {m?.number != null && <span className="text-gray-400">#{m.number}</span>}
                  <span>{m?.name}</span>
                  {l.position && <span className="text-gray-400">({l.position})</span>}
                  <span className="text-gray-400 text-xs ml-1">{l.start_minute}分〜</span>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">メンバーが登録されていません</p>
        )}
      </div>

      {/* イベント（自チーム） */}
      <div className="bg-white rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">イベント</h2>
          <button
            onClick={() => { setShowEventForm(true); setEventMinute(minute) }}
            className="text-sm text-green-600 hover:underline"
          >
            + 記録
          </button>
        </div>

        {showEventForm && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
            <div className="flex gap-2">
              {(['goal', 'yellow_card', 'red_card'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setEventType(t)}
                  className={`flex-1 py-1.5 rounded text-sm border ${
                    eventType === t ? 'border-green-600 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {EVENT_ICON[t]} {t === 'goal' ? '得点' : t === 'yellow_card' ? '警告' : '退場'}
                </button>
              ))}
            </div>
            <select
              value={eventMember}
              onChange={e => setEventMember(e.target.value)}
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
            >
              <option value="">選手を選択</option>
              {members.map(m => (
                <option key={m.id} value={m.id}>{memberLabel(m)}</option>
              ))}
            </select>
            {eventType === 'goal' && (
              <select
                value={assistMember}
                onChange={e => setAssistMember(e.target.value)}
                className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm"
              >
                <option value="">アシスト選手（なければスキップ）</option>
                {members.filter(m => m.id !== eventMember).map(m => (
                  <option key={m.id} value={m.id}>{memberLabel(m)}</option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">時間</label>
              <input
                type="number"
                value={eventMinute}
                onChange={e => setEventMinute(Number(e.target.value))}
                className="w-16 border border-gray-200 rounded px-2 py-1 text-sm"
                min={0}
              />
              <span className="text-xs text-gray-500">分</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowEventForm(false)} className="flex-1 border border-gray-300 text-gray-600 py-1.5 rounded text-sm">キャンセル</button>
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
                  <span className="text-gray-400 w-8 flex-shrink-0">{ev.minute}&apos;</span>
                  {isOpponent ? (
                    <span className="text-red-600">
                      相手{ev.opponent_scorer ? ` #${ev.opponent_scorer}` : ''}
                      {ev.opponent_assist && (
                        <span className="text-gray-400">（アシスト: #{ev.opponent_assist}）</span>
                      )}
                    </span>
                  ) : (
                    <span>
                      {m?.name}
                      {a && <span className="text-gray-400">（アシスト: {a.name}）</span>}
                    </span>
                  )}
                  <button
                    onClick={() => deleteEvent(ev)}
                    className="ml-auto text-gray-300 hover:text-red-400 text-lg leading-none flex-shrink-0"
                    title="削除"
                  >
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-gray-400 text-sm">イベント記録がありません</p>
        )}
      </div>
    </div>
  )
}
