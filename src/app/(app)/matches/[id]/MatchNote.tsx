'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Props = {
  matchId: string
  initialNote: string | null
  isAdmin: boolean
}

const MAX = 300

export default function MatchNote({ matchId, initialNote, isAdmin }: Props) {
  const router = useRouter()
  const [note, setNote] = useState(initialNote ?? '')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(initialNote ?? '')
  const [saving, setSaving] = useState(false)

  async function saveNote() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('matches').update({ note: draft.trim() || null }).eq('id', matchId)
    setNote(draft.trim())
    setEditing(false)
    setSaving(false)
    router.refresh()
  }

  function startEdit() {
    setDraft(note)
    setEditing(true)
  }

  if (!isAdmin && !note) return null

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">コメント</h2>
        {isAdmin && !editing && (
          <button
            onClick={startEdit}
            className="text-sm text-green-600 dark:text-green-400 hover:underline"
          >
            {note ? '編集' : '追加'}
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            maxLength={MAX}
            rows={4}
            placeholder="試合のコメントを入力（300文字以内）"
            className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm dark:bg-gray-800 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            autoFocus
          />
          <div className="flex items-center justify-between">
            <span className={`text-xs ${draft.length >= MAX ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
              {draft.length}/{MAX}
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(false)}
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              >
                キャンセル
              </button>
              <button
                onClick={saveNote}
                disabled={saving || draft.length > MAX}
                className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      ) : note ? (
        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{note}</p>
      ) : (
        <p className="text-sm text-gray-400 dark:text-gray-500">コメントがありません</p>
      )}
    </div>
  )
}
