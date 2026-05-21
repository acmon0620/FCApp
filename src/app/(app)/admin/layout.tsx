import AdminTabs from './AdminTabs'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-0 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">管理</h1>
      <AdminTabs />
      {children}
    </div>
  )
}
