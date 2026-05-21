'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from './ThemeToggle'
import iconSrc from '@/app/icon.png'

type NavItem = {
  href: string
  label: string
  icon: string
  adminOnly?: boolean
  match?: (p: string) => boolean
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'ダッシュボード', icon: '🏠' },
  { href: '/matches', label: '試合', icon: '⚽' },
  { href: '/members', label: 'メンバー', icon: '👥' },
  { href: '/rankings', label: 'ランキング', icon: '🏆' },
  { href: '/admin/members', label: '管理', icon: '⚙️', adminOnly: true, match: (p) => p.startsWith('/admin') },
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
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-gray-900 text-white">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Image src={iconSrc} alt="FootBoard" width={28} height={28} className="rounded-md" />
          <span className="font-bold text-base text-white">FootBoard</span>
        </div>
        <p className="text-xs text-gray-400 truncate mt-1">{teamName}</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(item => {
          if (item.adminOnly && !isAdmin) return null
          const active = item.match ? item.match(pathname) : pathname === item.href
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

      <div className="p-3 border-t border-gray-700 space-y-1">
        <ThemeToggle />
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
