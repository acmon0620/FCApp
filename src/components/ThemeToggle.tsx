'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-8 h-8" />

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
      title={isDark ? 'ライトモードに切り替え' : 'ダークモードに切り替え'}
    >
      <span className="text-base">{isDark ? '☀️' : '🌙'}</span>
      {isDark ? 'ライトモード' : 'ダークモード'}
    </button>
  )
}
