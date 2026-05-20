'use client'

import { useSearchParams } from 'next/navigation'

export default function LoginBanner() {
  const searchParams = useSearchParams()
  const justJoined = searchParams.get('joined') === '1'
  const justRegistered = searchParams.get('registered') === '1'

  if (!justJoined && !justRegistered) return null

  return (
    <div className="mb-4 px-4 py-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300">
      {justJoined
        ? 'チームへの参加が完了しました。ログインしてください。'
        : 'チームの登録が完了しました。ログインしてください。'}
    </div>
  )
}
