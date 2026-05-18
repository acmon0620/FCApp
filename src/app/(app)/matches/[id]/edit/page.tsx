'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MATCH_TAGS } from '@/lib/matchTags'

export default function MatchEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [opponent, setOpponent] = useState('')
  const [date, setDate] = useState('')
  const [tag, setTag] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: member } = await supabase
        .from('members')
        .select('team_id, role')
        .eq('id', user.id)
        .single()

      if (!member || member.role !== 'admin') {
        router.push(`/matches/${id}`)
        return
      }

      const { data: match } = await supabase
        .from('matches')
        .select('opponent, date, tag')
        .eq('id', id)
        .single()

      if (!match) { router.push('/matches'); return }

      setOpponent(match.opponent)
      setDate(match.date)
      setTag(match.tag ?? '')
      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase
      .from('matches')
      .update({ opponent, date, tag: tag || null })
      .eq('id', id)
    if (err) {
      setError('保存に失敗しました')
      setSaving(false)
      return
    }
    router.push(`/matches/${id}`)
  }

  async function handleDelete() {
    if (!confirm('この試合を削除しますか？\nゴール・カード・ラインナップなど関連するすべての記録も削除されます。')) return
    setDeleting(true)
    setError('')
    const supabase = createClient()
    await supabase.from('events').delete().eq('match_id', id)
    await supabase.from('lineups').delete().eq('match_id', id)
    const { error: err } = await supabase.from('matches').delete().eq('id', id)
    if (err) {
      setError('削除に失敗しました')
      setDeleting(false)
      return
    }
    router.push('/matches')
  }

  if (loading) return <div className="text-gray-400 text-sm p-8">読み込み中...</div>

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">試合を編集</h1>

      <form onSubmit={handleSave} className="bg-white rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">対戦相手</label>
          <input
            type="text"
            value={opponent}
            onChange={e => setOpponent(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">試合日</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">種別</label>
          <input
            type="text"
            value={tag}
            onChange={e => setTag(e.target.value)}
            list="tag-suggestions"
            placeholder="例：リーグ戦、練習試合、大会など"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <datalist id="tag-suggestions">
            {MATCH_TAGS.map(t => <option key={t} value={t} />)}
          </datalist>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            キャンセル
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {saving ? '保存中...' : '保存する'}
          </button>
        </div>
      </form>

      <div className="mt-4">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-full border border-red-300 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
        >
          {deleting ? '削除中...' : 'この試合を削除する'}
        </button>
      </div>
    </div>
  )
}
