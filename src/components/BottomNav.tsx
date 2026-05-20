'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: 'ホーム',     icon: '🏠', match: (p: string) => p.startsWith('/dashboard') },
  { href: '/matches',   label: '試合',       icon: '⚽', match: (p: string) => p.startsWith('/matches') },
  { href: '/members',   label: 'メンバー',   icon: '👥', match: (p: string) => p.startsWith('/members') },
  { href: '/rankings',  label: 'ランキング', icon: '🏆', match: (p: string) => p.startsWith('/rankings') },
]

const adminItem = {
  href: '/admin/members',
  label: '管理',
  icon: '⚙️',
  match: (p: string) => p.startsWith('/admin'),
}

export default function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const items = isAdmin ? [...navItems, adminItem] : navItems

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-gray-900 border-t border-gray-700 flex safe-area-inset-bottom">
      {items.map(item => {
        const active = item.match(pathname)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center pt-2 pb-3 gap-0.5 text-xs transition-colors ${
              active ? 'text-green-400' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <span className="text-xl leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
