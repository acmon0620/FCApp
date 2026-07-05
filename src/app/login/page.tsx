'use client'

import { Suspense } from 'react'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import LoginBanner from './LoginBanner'

export default function LoginPage() {
  const [tab, setTab] = useState<'admin' | 'team'>('admin')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [teamName, setTeamName] = useState('')
  const [teamPassword, setTeamPassword] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleAdminLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  async function handleTeamLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    const { data: memberEmail, error: lookupError } = await supabase.rpc('get_team_member_auth', {
      p_team_name: teamName,
    })

    if (lookupError || !memberEmail) {
      setError('チームが見つかりません')
      setLoading(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: memberEmail,
      password: teamPassword,
    })

    if (signInError) {
      setError('チーム名またはパスワードが正しくありません')
      setLoading(false)
      return
    }

    window.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">⚽ FootBoard</h1>
        </div>

        <Suspense fallback={null}>
          <LoginBanner />
        </Suspense>

        <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
          <button
            onClick={() => { setTab('admin'); setError('') }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'admin' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            個人アカウント
          </button>
          <button
            onClick={() => { setTab('team'); setError('') }}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              tab === 'team' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            チームメンバーログイン
          </button>
        </div>

        {tab === 'admin' ? (
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleTeamLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">チーム名</label>
              <input
                type="text"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                required
                placeholder="例：FCトウキョウ"
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">チームパスワード</label>
              <input
                type="password"
                value={teamPassword}
                onChange={e => setTeamPassword(e.target.value)}
                required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'ログイン中...' : 'チームにログイン'}
            </button>
          </form>
        )}

        <div className="mt-6 space-y-2 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            招待コードをお持ちの方は{' '}
            <Link href="/join" className="text-green-600 dark:text-green-400 hover:underline font-medium">
              チームに参加
            </Link>
          </p>
          <p>
            新規チーム登録は{' '}
            <Link href="/register" className="text-green-600 dark:text-green-400 hover:underline font-medium">
              こちら
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
