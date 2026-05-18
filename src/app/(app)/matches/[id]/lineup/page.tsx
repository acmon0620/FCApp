'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import FormationField from '@/components/FormationField'

type Member = { id: string; name: string; number: number | null; position: string | null }
type StarterEntry = { memberId: string; position: string; fieldX: number; fieldY: number }
type Tab = 'starter' | 'sub' | 'formation'

const STARTER_LIMIT = 11
const POSITIONS = ['GK', 'CB', 'LB', 'RB', 'DM', 'CM', 'LM', 'RM', 'LW', 'RW', 'CF', 'SS']

// Default 4-4-2 positions (index 0 = first added player)
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

export default function LineupPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const supabase = createClient()

  const [members, setMembers] = useState<Member[]>([])
  const [starters, setStarters] = useState<StarterEntry[]>([])
  const [matchOpponent, setMatchOpponent] = useState('')
  const [tab, setTab] = useState<Tab>('starter')
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadData()
  }, [id])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: memberRow } = await supabase
      .from('members')
      .select('team_id, role')
      .eq('id', user.id)
      .single()

    if (!memberRow || memberRow.role !== 'admin') {
      router.push(`/matches/${id}`)
      return
    }

    const [matchRes, membersRes, lineupsRes] = await Promise.all([
      supabase.from('matches').select('opponent').eq('id', id).single(),
      supabase
        .from('members')
        .select('id, name, number, position')
        .eq('team_id', memberRow.team_id)
        .eq('is_system_account', false)
        .order('number', { ascending: true, nullsFirst: false }),
      supabase
        .from('lineups')
        .select('member_id, position, field_x, field_y')
        .eq('match_id', id)
        .eq('start_minute', 0)
        .is('end_minute', null),
    ])

    if (matchRes.data) setMatchOpponent(matchRes.data.opponent)
    if (membersRes.data) setMembers(membersRes.data)
    if (lineupsRes.data) {
      setStarters(lineupsRes.data.map((l, i) => ({
        memberId: l.member_id,
        position: l.position ?? '',
        fieldX: l.field_x ?? DEFAULT_POSITIONS[i]?.x ?? 0.5,
        fieldY: l.field_y ?? DEFAULT_POSITIONS[i]?.y ?? 0.5,
      })))
    }
  }

  function addToStarters(member: Member) {
    if (starters.length >= STARTER_LIMIT) return
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
    setLoading(true)

    await supabase
      .from('lineups')
      .delete()
      .eq('match_id', id)
      .eq('start_minute', 0)
      .is('end_minute', null)

    if (starters.length > 0) {
      await supabase.from('lineups').insert(
        starters.map(s => ({
          match_id: id,
          member_id: s.memberId,
          position: s.position || null,
          start_minute: 0,
          field_x: s.fieldX,
          field_y: s.fieldY,
        }))
      )
    }

    setLoading(false)
    setSaved(true)
    setTimeout(() => router.push(`/matches/${id}`), 800)
  }

  const starterIds = new Set(starters.map(s => s.memberId))
  const subMembers = members.filter(m => !starterIds.has(m.id))
  const remaining = STARTER_LIMIT - starters.length

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <Link href={`/matches/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← 試合詳細
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">スターティングメンバー</h1>
        {matchOpponent && <p className="text-gray-500 text-sm">vs {matchOpponent}</p>}
      </div>

      {/* タブ */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden">
        <button
          onClick={() => setTab('starter')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            tab === 'starter' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          先発　{starters.length}/{STARTER_LIMIT}
        </button>
        <button
          onClick={() => setTab('sub')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            tab === 'sub' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          サブ　{subMembers.length}人
        </button>
        <button
          onClick={() => setTab('formation')}
          className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
            tab === 'formation' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          ⚽ 配置
        </button>
      </div>

      {/* 先発タブ */}
      {tab === 'starter' && (
        <div className="space-y-2">
          {remaining > 0 && (
            <p className="text-sm text-gray-400">
              あと <span className="font-medium text-gray-600">{remaining}人</span> 選択できます（サブタブから追加）
            </p>
          )}
          {remaining === 0 && (
            <p className="text-sm text-green-600 font-medium">先発メンバーが揃いました</p>
          )}

          {starters.length === 0 && (
            <div className="bg-white rounded-xl p-8 shadow-sm text-center text-gray-400 text-sm">
              サブタブからメンバーを追加してください
            </div>
          )}

          {starters.map(starter => {
            const member = members.find(m => m.id === starter.memberId)
            if (!member) return null
            return (
              <div key={starter.memberId} className="bg-white rounded-xl shadow-sm border-2 border-green-500">
                <div className="flex items-center gap-3 p-4">
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">
                      {member.number != null && (
                        <span className="text-gray-400 mr-1">#{member.number}</span>
                      )}
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
                            : 'bg-white text-gray-600 border-gray-200 hover:border-green-400'
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
                    className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* サブタブ */}
      {tab === 'sub' && (
        <div className="space-y-2">
          {remaining > 0 && (
            <p className="text-sm text-gray-400">
              タップして先発に追加（あと <span className="font-medium text-gray-600">{remaining}人</span> 追加可）
            </p>
          )}
          {remaining === 0 && (
            <p className="text-sm text-gray-400">先発が11人に達しました。先発タブで外してから追加できます</p>
          )}

          {subMembers.length === 0 && (
            <div className="bg-white rounded-xl p-8 shadow-sm text-center text-gray-400 text-sm">
              全員が先発に設定されています
            </div>
          )}

          {subMembers.map(member => (
            <button
              key={member.id}
              onClick={() => addToStarters(member)}
              disabled={remaining === 0}
              className={`w-full bg-white rounded-xl shadow-sm border-2 border-transparent p-4 text-left flex items-center gap-3 transition-colors ${
                remaining > 0 ? 'hover:border-green-300 hover:bg-green-50' : 'opacity-50 cursor-not-allowed'
              }`}
            >
              <div className="flex-1">
                <span className="font-medium text-gray-900">
                  {member.number != null && (
                    <span className="text-gray-400 mr-1">#{member.number}</span>
                  )}
                  {member.name}
                </span>
                {member.position && (
                  <span className="text-xs text-gray-400 ml-2">{member.position}</span>
                )}
              </div>
              {remaining > 0 && (
                <span className="text-xs text-green-600 font-medium">先発に追加</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* フォーメーションタブ */}
      {tab === 'formation' && (
        <div className="space-y-3">
          {starters.length === 0 ? (
            <div className="bg-white rounded-xl p-8 shadow-sm text-center text-gray-400 text-sm">
              先発メンバーを追加するとフィールドに表示されます
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500">選手アイコンをドラッグして配置を調整できます</p>
              <FormationField
                players={starters.map(s => {
                  const member = members.find(m => m.id === s.memberId)
                  return { id: s.memberId, number: member?.number ?? null, x: s.fieldX, y: s.fieldY }
                })}
                onMove={handleFieldMove}
              />
            </>
          )}
        </div>
      )}

      {/* 保存ボタン */}
      <div className="flex gap-3 pb-8">
        <button
          type="button"
          onClick={() => router.push(`/matches/${id}`)}
          className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          キャンセル
        </button>
        <button
          onClick={saveLineup}
          disabled={loading || saved}
          className="flex-1 bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {saved ? '保存しました' : loading ? '保存中...' : `先発${starters.length}人で保存する`}
        </button>
      </div>
    </div>
  )
}
