'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function TeamSettingsClient({ teamId, currentName }: { teamId: string; currentName: string }) {
  const router = useRouter()
  const [name, setName] = useState(currentName)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(teamId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    const supabase = createClient()
    const { error } = await supabase.from('teams').update({ name }).eq('id', teamId)

    if (error) {
      setError('保存に失敗しました')
    } else {
      setSuccess(true)
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <>
    <form onSubmit={handleSave} className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">チーム名</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">保存しました</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        {loading ? '保存中...' : '変更を保存'}
      </button>
    </form>

    <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm space-y-3">
      <div>
        <h2 className="text-sm font-medium text-gray-700 dark:text-gray-300">チーム招待コード</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          このコードをメンバーに共有してください。メンバーは{' '}
          <a href="/join" className="text-green-600 dark:text-green-400 hover:underline">/join</a>
          {' '}ページから個人アカウントを作成してチームに参加できます。
        </p>
      </div>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-700 dark:text-gray-300 break-all select-all">
          {teamId}
        </code>
        <button
          onClick={handleCopy}
          className="flex-shrink-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          {copied ? '✓ コピー済み' : 'コピー'}
        </button>
      </div>
    </div>
    </>
  )
}
