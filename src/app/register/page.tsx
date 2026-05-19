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

    await supabase.auth.signOut()

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

  const inputClass = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">⚽ サッカーチーム管理</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2">チーム新規登録</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className={labelClass}>チーム名</label>
            <input type="text" value={teamName} onChange={e => setTeamName(e.target.value)} required
              placeholder="例：FCトウキョウ" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>管理者名</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required
              placeholder="例：山田 太郎" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>管理者メールアドレス</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>管理者パスワード</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
              minLength={6} placeholder="6文字以上" className={inputClass} />
          </div>

          <hr className="border-gray-200 dark:border-gray-700" />

          <div>
            <label className={labelClass}>
              チームパスワード
              <span className="ml-1 text-xs text-gray-400 dark:text-gray-500 font-normal">（メンバーがログインする際に使用）</span>
            </label>
            <input type="password" value={teamPassword} onChange={e => setTeamPassword(e.target.value)} required
              minLength={6} placeholder="6文字以上" className={inputClass} />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors">
            {loading ? '登録中...' : 'チームを登録する'}
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
