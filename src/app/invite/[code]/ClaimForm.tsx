'use client'

import { useState } from 'react'
import { claimMemberAccount } from './actions'

export default function ClaimForm({ code, memberName }: { code: string; memberName: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await claimMemberAccount(code, email, password)
    if (result.error) {
      setError(result.error)
      setLoading(false)
      return
    }
    setDone(true)
  }

  const inputClass = "w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-gray-100"
  const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"

  if (done) {
    return (
      <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm w-full max-w-md text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">登録完了！</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          アカウントが作成されました。<br />ログイン画面からサインインしてください。
        </p>
        <a
          href="/login"
          className="block bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          ログインする
        </a>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm w-full max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">アカウント登録</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">
          <span className="font-semibold text-gray-800 dark:text-gray-200">{memberName}</span> としてログイン情報を設定します
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass}>メールアドレス</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            autoComplete="email"
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
            autoComplete="new-password"
            className={inputClass}
          />
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '登録中...' : '登録する'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        すでにアカウントをお持ちの方は{' '}
        <a href="/login" className="text-green-600 dark:text-green-400 hover:underline font-medium">ログイン</a>
      </p>
    </div>
  )
}
