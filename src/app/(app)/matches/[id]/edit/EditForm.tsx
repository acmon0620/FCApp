'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MATCH_TAGS } from '@/lib/matchTags'

type Props = {
  id: string
  initialOpponent: string
  initialDate: string
  initialTag: string
  initialDuration: number | null
}

export default function EditForm({ id, initialOpponent, initialDate, initialTag, initialDuration }: Props) {
  const router = useRouter()
  const [opponent, setOpponent] = useState(initialOpponent)
  const [date, setDate] = useState(initialDate)
  const [tag, setTag] = useState(initialTag)
  const [duration, setDuration] = useState(initialDuration?.toString() ?? '')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase
      .from('matches')
      .update({ opponent, date, tag: tag || null, duration: duration ? Number(duration) : null })
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

  return (
    <>
      <form onSubmit={handleSave} className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">対戦相手</label>
          <input
            type="text"
            value={opponent}
            onChange={e => setOpponent(e.target.value)}
            required
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
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">試合時間（分）</label>
          <input
            type="number"
            value={duration}
            onChange={e => setDuration(e.target.value)}
            list="duration-suggestions"
            placeholder="例：90"
            min={1}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
          />
          <datalist id="duration-suggestions">
            <option value="60" />
            <option value="80" />
            <option value="90" />
          </datalist>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">45分ハーフなら 90、前後半30分なら 60 など</p>
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
    </>
  )
}
