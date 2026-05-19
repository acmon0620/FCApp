import { redirect } from 'next/navigation'
import { getCurrentMember } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const member = await getCurrentMember()
  if (!member) redirect('/login')

  const teamName = member.teams?.name ?? ''
  const isAdmin = member.role === 'admin'

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar teamName={teamName} isAdmin={isAdmin} />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
