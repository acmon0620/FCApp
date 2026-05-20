'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function JoinPage() {
  const [teamId, setTeamId] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError || !authData.user) {
      setError(authError?.message ?? 'アカウント作成に失敗しました')
      setLoading(false)
      return
    }

    const memberId = authData.user.id
    await supabase.auth.signOut()

    const { error: rpcError } = await supabase.rpc('join_team', {
      p_team_id: teamId.trim(),
      p_member_name: name.trim(),
      p_member_id: memberId,
    })

    if (rpcError) {
      setError('チームへの参加に失敗しました。招待コードが正しいか確認してください。')
      setLoading(false)
      return
    }

    window.location.href = '/login?joined=1'
  }

  const inputClass = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">⚽ サッカーチーム管理</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">チームに参加する</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className={labelClass}>招待コード</label>
            <input
              type="text"
              value={teamId}
              onChange={e => setTeamId(e.target.value)}
              required
              placeholder="管理者から受け取ったコードを貼り付け"
              className={inputClass}
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              チーム管理者の「チーム設定」画面に表示されているコードです
            </p>
          </div>

          <div>
            <label className={labelClass}>お名前</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="例：山田 太郎"
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>パスワード</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="6文字以上"
              className={inputClass}
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '参加中...' : 'チームに参加する'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/login" className="text-green-600 dark:text-green-400 hover:underline font-medium">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  )
}
