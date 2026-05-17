'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [teamName, setTeamName] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [teamPassword, setTeamPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    // 管理者アカウント作成
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError || !authData.user) {
      setError(authError?.message ?? '登録に失敗しました')
      setLoading(false)
      return
    }

    const adminId = authData.user.id

    // 管理者セッションを一度クリアしてから共有アカウントを作成
    await supabase.auth.signOut()

    // チーム共有アカウント作成（メンバーログイン用）
    const sharedEmail = `team-${crypto.randomUUID()}@member.internal`
    const { data: sharedData, error: sharedError } = await supabase.auth.signUp({
      email: sharedEmail,
      password: teamPassword,
    })

    if (sharedError || !sharedData.user) {
      setError('チームアカウントの作成に失敗しました')
      setLoading(false)
      return
    }

    const { error: rpcError } = await supabase.rpc('register_team', {
      p_team_name: teamName,
      p_member_name: name,
      p_member_id: adminId,
      p_shared_member_id: sharedData.user.id,
      p_shared_member_email: sharedEmail,
    })

    if (rpcError) {
      await supabase.auth.signOut()
      setError('チームの作成に失敗しました: ' + rpcError.message)
      setLoading(false)
      return
    }

    await supabase.auth.signOut()
    window.location.href = '/login?registered=1'
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-xl shadow-sm w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">⚽ サッカーチーム管理</h1>
          <p className="text-gray-500 mt-2">チーム新規登録</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">チーム名</label>
            <input
              type="text"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              required
              placeholder="例：FCトウキョウ"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">管理者名</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="例：山田 太郎"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">管理者メールアドレス</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">管理者パスワード</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="6文字以上"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          <hr className="border-gray-200" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              チームパスワード
              <span className="ml-1 text-xs text-gray-400 font-normal">（メンバーがログインする際に使用）</span>
            </label>
            <input
              type="password"
              value={teamPassword}
              onChange={e => setTeamPassword(e.target.value)}
              required
              minLength={6}
              placeholder="6文字以上"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '登録中...' : 'チームを登録する'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          すでにアカウントをお持ちの方は{' '}
          <Link href="/login" className="text-green-600 hover:underline font-medium">
            ログイン
          </Link>
        </p>
      </div>
    </div>
  )
}
