import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'FootBoard | サッカーチームの試合記録・メンバー管理・ランキング集計',
  description:
    '試合の得点・アシスト・オウンゴールなどのイベント記録、メンバー・グループ管理、得点ランキング集計をまとめて行えるサッカーチーム管理アプリ「FootBoard」。',
}

const features = [
  {
    icon: '⚽',
    title: '試合記録',
    description: '得点・アシスト・オウンゴールなどの試合中のイベントをその場でかんたんに記録できます。',
  },
  {
    icon: '👥',
    title: 'メンバー・グループ管理',
    description: 'Aチーム・Bチームなどのグループ分けや、グループごとの背番号管理もまとめて行えます。',
  },
  {
    icon: '🏆',
    title: 'ランキング集計',
    description: '得点ランキングなど、試合結果から各種ランキングを自動で集計・表示します。',
  },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-5xl px-6 py-20 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white sm:text-5xl">⚽ FootBoard</h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          サッカーチームの試合記録・メンバー管理・ランキング集計を、これひとつで。
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="w-full rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700 sm:w-auto"
          >
            無料でチーム登録
          </Link>
          <Link
            href="/login"
            className="w-full rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800 sm:w-auto"
          >
            ログイン
          </Link>
        </div>

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          招待コードをお持ちの方は{' '}
          <Link href="/join" className="font-medium text-green-600 hover:underline dark:text-green-400">
            チームに参加
          </Link>
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map(feature => (
            <div
              key={feature.title}
              className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-900"
            >
              <div className="text-3xl">{feature.icon}</div>
              <h2 className="mt-3 font-semibold text-gray-900 dark:text-white">{feature.title}</h2>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
