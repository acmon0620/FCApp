'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard', label: 'ダッシュボード', icon: '🏠' },
  { href: '/matches', label: '試合', icon: '⚽' },
  { href: '/members', label: 'メンバー', icon: '👥' },
  { href: '/rankings', label: 'ランキング', icon: '🏆' },
  { href: '/admin/members', label: 'メンバー管理', icon: '⚙️', adminOnly: true },
  { href: '/admin/settings', label: 'チーム設定', icon: '🔧', adminOnly: true },
]

type Props = {
  teamName: string
  isAdmin: boolean
}

export default function Sidebar({ teamName, isAdmin }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-56 min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <p className="text-xs text-gray-400">チーム</p>
        <p className="font-bold text-sm truncate">{teamName}</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => {
          if (item.adminOnly && !isAdmin) return null
          const active = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-green-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        >
          ログアウト
        </button>
      </div>
    </aside>
  )
}
