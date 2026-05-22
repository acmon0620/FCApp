'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import iconSrc from '@/app/icon.png'

export default function MobileHeader({ teamName }: { teamName: string }) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isDark = theme === 'dark'

  return (
    <header className="md:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 h-14 flex items-center px-4 gap-3">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Image src={iconSrc} alt="FootBoard" width={26} height={26} className="rounded-md flex-shrink-0" />
        <div className="min-w-0">
          <p className="font-bold text-sm text-gray-900 dark:text-white leading-tight">FootBoard</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-tight">{teamName}</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        {mounted && (
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title={isDark ? 'ライトモード' : 'ダークモード'}
          >
            <span className="text-lg">{isDark ? '☀️' : '🌙'}</span>
          </button>
        )}
        <button
          onClick={handleLogout}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="ログアウト"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
        </button>
      </div>
    </header>
  )
}
