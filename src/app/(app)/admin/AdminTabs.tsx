'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/admin/members', label: 'メンバー管理' },
  { href: '/admin/settings', label: 'チーム設定' },
]

export default function AdminTabs() {
  const pathname = usePathname()

  return (
    <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
      {tabs.map(tab => {
        const active = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex-1 py-2 text-sm font-medium text-center transition-colors ${
              active
                ? 'bg-green-600 text-white'
                : 'text-gray-500 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
