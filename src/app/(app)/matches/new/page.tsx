'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MATCH_TAGS } from '@/lib/matchTags'

export default function NewMatchPage() {
  const router = useRouter()
  const [opponent, setOpponent] = useState('')
  const [date, setDate] = useState('')
  const [tag, setTag] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()

    const { data: { user } } = await supabase.auth.getUser()
    const { data: member } = await supabase
      .from('members')
      .select('team_id, role')
      .eq('id', user!.id)
      .single()

    if (!member || member.role !== 'admin') {
      setError('権限がありません')
      setLoading(false)
      return
    }

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        team_id: member.team_id,
        opponent,
        date,
        status: 'scheduled',
        tag: tag || null,
      })
      .select()
      .single()

    if (matchError || !match) {
      setError('試合の作成に失敗しました')
      setLoading(false)
      return
    }

    router.push(`/matches/${match.id}`)
  }

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">試合を追加</h1>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">対戦相手</label>
          <input
            type="text"
            value={opponent}
            onChange={e => setOpponent(e.target.value)}
            required
            placeholder="例：FCライバル"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">試合日</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">種別</label>
          <input
            type="text"
            value={tag}
            onChange={e => setTag(e.target.value)}
            list="tag-suggestions"
            placeholder="例：リーグ戦、練習試合、大会など"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
          />
          <datalist id="tag-suggestions">
            {MATCH_TAGS.map(t => <option key={t} value={t} />)}
          </datalist>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">自由に入力できます。候補から選ぶことも可能です。</p>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '作成中...' : '作成する'}
          </button>
        </div>
      </form>
    </div>
  )
}
