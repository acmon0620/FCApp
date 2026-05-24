'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import FormationField, { ShirtColor } from '@/components/FormationField'

type Member = { id: string; name: string; number: number | null; position: string | null }
type StarterEntry = { memberId: string; position: string; fieldX: number; fieldY: number }
type Tab = 'participant' | 'starter' | 'bench' | 'formation'

const STARTER_LIMIT = 11
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'LM', 'RM', 'LW', 'RW', 'CF', 'SS']

const DEFAULT_POSITIONS = [
  { x: 0.5,  y: 0.85 },
  { x: 0.2,  y: 0.65 },
  { x: 0.4,  y: 0.65 },
  { x: 0.6,  y: 0.65 },
  { x: 0.8,  y: 0.65 },
  { x: 0.2,  y: 0.45 },
  { x: 0.4,  y: 0.45 },
  { x: 0.6,  y: 0.45 },
  { x: 0.8,  y: 0.45 },
  { x: 0.35, y: 0.2  },
  { x: 0.65, y: 0.2  },
]

type Props = {
  id: string
  matchOpponent: string
  members: Member[]
  initialStarters: StarterEntry[]
  initialParticipantIds: string[]
  shirtColor: ShirtColor
}

export default function LineupClient({ id, matchOpponent, members, initialStarters, initialParticipantIds, shirtColor }: Props) {
  const router = useRouter()
  const [participants, setParticipants] = useState<Set<string>>(new Set(initialParticipantIds))
  const [starters, setStarters] = useState<StarterEntry[]>(initialStarters)
  const [tab, setTab] = useState<Tab>('participant')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  function toggleParticipant(member: Member) {
    setParticipants(prev => {
      const next = new Set(prev)
      if (next.has(member.id)) {
        next.delete(member.id)
        setStarters(s => s.filter(starter => starter.memberId !== member.id))
      } else {
        next.add(member.id)
      }
      return next
    })
  }

  function addToStarters(member: Member) {
    if (starters.length >= STARTER_LIMIT) return
    if (!participants.has(member.id)) return
    const def = DEFAULT_POSITIONS[starters.length] ?? { x: 0.5, y: 0.5 }
    setStarters(prev => [...prev, {
      memberId: member.id,
      position: member.position ?? '',
      fieldX: def.x,
      fieldY: def.y,
    }])
  }

  function removeFromStarters(memberId: string) {
    setStarters(prev => prev.filter(s => s.memberId !== memberId))
  }

  function updatePosition(memberId: string, pos: string) {
    setStarters(prev => prev.map(s => s.memberId === memberId ? { ...s, position: pos } : s))
  }

  function handleFieldMove(memberId: string, x: number, y: number) {
    setStarters(prev => prev.map(s => s.memberId === memberId ? { ...s, fieldX: x, fieldY: y } : s))
  }

  async function saveLineup() {
    setSaving(true)
    const supabase = createClient()

    // 既存の先発（start_minute=0）とベンチ（start_minute=null）を削除（交代記録は残す）
    await Promise.all([
      supabase.from('lineups').delete().eq('match_id', id).eq('start_minute', 0).is('end_minute', null),
      supabase.from('lineups').delete().eq('match_id', id).is('start_minute', null).is('end_minute', null),
    ])

    const starterIds = new Set(starters.map(s => s.memberId))

    const rows: Array<{
      match_id: string
      member_id: string
      member_name: string | null
      position: string | null
      start_minute: number | null
      field_x: number | null
      field_y: number | null
    }> = []

    for (const s of starters) {
      const member = members.find(m => m.id === s.memberId)
      rows.push({
        match_id: id,
        member_id: s.memberId,
        member_name: member?.name ?? null,
        position: s.position || null,
        start_minute: 0,
        field_x: s.fieldX,
        field_y: s.fieldY,
      })
    }

    // ベンチ（参加者で先発でない）は start_minute: null で登録
    for (const memberId of participants) {
      if (!starterIds.has(memberId)) {
        const member = members.find(m => m.id === memberId)
        rows.push({
          match_id: id,
          member_id: memberId,
          member_name: member?.name ?? null,
          position: null,
          start_minute: null,
          field_x: null,
          field_y: null,
        })
      }
    }

    if (rows.length > 0) {
      await supabase.from('lineups').insert(rows)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => router.push(`/matches/${id}`), 800)
  }

  const starterIds = new Set(starters.map(s => s.memberId))
  const benchMembers = members.filter(m => participants.has(m.id) && !starterIds.has(m.id))
  const remaining = STARTER_LIMIT - starters.length

  const tabClass = (t: Tab) =>
    `flex-1 py-2.5 text-xs font-medium transition-colors ${
      tab === t ? 'bg-green-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
    }`

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <Link href={`/matches/${id}`} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
          ← 試合詳細
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">スターティングメンバー</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">vs {matchOpponent}</p>
      </div>

      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button onClick={() => setTab('participant')} className={tabClass('participant')}>
          参加者　{participants.size}人
        </button>
        <button onClick={() => setTab('starter')} className={tabClass('starter')}>
          先発　{starters.length}/{STARTER_LIMIT}
        </button>
        <button onClick={() => setTab('bench')} className={tabClass('bench')}>
          ベンチ　{benchMembers.length}人
        </button>
        <button onClick={() => setTab('formation')} className={tabClass('formation')}>
          ⚽ 配置
        </button>
      </div>

      {/* 参加者タブ */}
      {tab === 'participant' && (
        <div className="space-y-2">
          <p className="text-sm text-gray-400 dark:text-gray-500">当日参加するメンバーを選択してください</p>
          {members.length === 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-sm text-center text-gray-400 dark:text-gray-500 text-sm">
              メンバーが登録されていません
            </div>
          )}
          {members.map(member => {
            const isParticipant = participants.has(member.id)
            return (
              <button
                key={member.id}
                onClick={() => toggleParticipant(member)}
                className={`w-full rounded-xl shadow-sm border-2 p-4 text-left flex items-center gap-3 transition-colors ${
                  isParticipant
                    ? 'bg-green-50 dark:bg-green-900/20 border-green-500'
                    : 'bg-white dark:bg-gray-900 border-transparent hover:border-gray-200 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex-1">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {member.number != null && <span className="text-gray-400 dark:text-gray-500 mr-1">#{member.number}</span>}
                    {member.name}
                  </span>
                  {member.position && <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{member.position}</span>}
                </div>
                {isParticipant
                  ? <span className="text-xs text-green-600 dark:text-green-400 font-medium">参加 ✓</span>
                  : <span className="text-xs text-gray-400 dark:text-gray-500">タップして追加</span>
                }
              </button>
            )
          })}
        </div>
      )}

      {/* 先発タブ */}
      {tab === 'starter' && (
        <div className="space-y-2">
          {remaining > 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              あと <span className="font-medium text-gray-600 dark:text-gray-400">{remaining}人</span> 選択できます（ベンチタブから追加）
            </p>
          )}
          {remaining === 0 && (
            <p className="text-sm text-green-600 font-medium">先発メンバーが揃いました</p>
          )}
          {starters.length === 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-sm text-center text-gray-400 dark:text-gray-500 text-sm">
              ベンチタブからメンバーを追加してください
            </div>
          )}
          {starters.map(starter => {
            const member = members.find(m => m.id === starter.memberId)
            if (!member) return null
            return (
              <div key={starter.memberId} className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border-2 border-green-500">
                <div className="flex items-center gap-3 p-4">
                  <div className="flex-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {member.number != null && <span className="text-gray-400 dark:text-gray-500 mr-1">#{member.number}</span>}
                      {member.name}
                    </span>
                  </div>
                  <button
                    onClick={() => removeFromStarters(starter.memberId)}
                    className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded hover:bg-red-50"
                  >
                    外す
                  </button>
                </div>
                <div className="px-4 pb-4">
                  <div className="flex gap-1.5 flex-wrap mb-2">
                    {POSITIONS.map(pos => (
                      <button
                        key={pos}
                        onClick={() => updatePosition(starter.memberId, pos)}
                        className={`px-2 py-0.5 rounded text-xs font-medium border transition-colors ${
                          starter.position === pos
                            ? 'bg-green-600 text-white border-green-600'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:border-green-400'
                        }`}
                      >
                        {pos}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={starter.position}
                    onChange={e => updatePosition(starter.memberId, e.target.value)}
                    placeholder="ポジションを入力"
                    className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ベンチタブ */}
      {tab === 'bench' && (
        <div className="space-y-2">
          {participants.size === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">まず参加者タブでメンバーを選択してください</p>
          )}
          {participants.size > 0 && remaining > 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              タップして先発に追加（あと <span className="font-medium text-gray-600 dark:text-gray-400">{remaining}人</span> 追加可）
            </p>
          )}
          {participants.size > 0 && remaining === 0 && (
            <p className="text-sm text-gray-400 dark:text-gray-500">先発が11人に達しました。先発タブで外してから追加できます</p>
          )}
          {benchMembers.length === 0 && participants.size > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-sm text-center text-gray-400 dark:text-gray-500 text-sm">
              全員が先発に設定されています
            </div>
          )}
          {benchMembers.map(member => (
            <button
              key={member.id}
              onClick={() => addToStarters(member)}
              disabled={remaining === 0}
              className={`w-full bg-white dark:bg-gray-900 rounded-xl shadow-sm border-2 border-transparent p-4 text-left flex items-center gap-3 transition-colors ${
                remaining > 0 ? 'hover:border-green-300 dark:hover:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/20' : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex-1">
                <span className="font-medium text-gray-900 dark:text-white">
                  {member.number != null && <span className="text-gray-400 dark:text-gray-500 mr-1">#{member.number}</span>}
                  {member.name}
                </span>
                {member.position && <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{member.position}</span>}
              </div>
              {remaining > 0 && <span className="text-xs text-green-600 dark:text-green-400 font-medium">先発に追加</span>}
            </button>
          ))}
        </div>
      )}

      {/* フォーメーションタブ */}
      {tab === 'formation' && (
        <div className="space-y-3">
          {starters.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl p-8 shadow-sm text-center text-gray-400 dark:text-gray-500 text-sm">
              先発メンバーを追加するとフィールドに表示されます
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400">選手アイコンをドラッグして配置を調整できます</p>
              <FormationField
                players={starters.map(s => {
                  const member = members.find(m => m.id === s.memberId)
                  return { id: s.memberId, number: member?.number ?? null, name: member?.name ?? '', x: s.fieldX, y: s.fieldY }
                })}
                shirtColor={shirtColor}
                onMove={handleFieldMove}
              />
            </>
          )}
        </div>
      )}

      <div className="flex gap-3 pb-8">
        <button
          type="button"
          onClick={() => router.push(`/matches/${id}`)}
          className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          キャンセル
        </button>
        <button
          onClick={saveLineup}
          disabled={saving || saved}
          className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {saved ? '保存しました' : saving ? '保存中...' : `先発${starters.length}・ベンチ${benchMembers.length}で保存`}
        </button>
      </div>
    </div>
  )
}
