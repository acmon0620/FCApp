import { redirect } from 'next/navigation'
import { getCurrentMember } from '@/lib/auth'
import Sidebar from '@/components/Sidebar'
import BottomNav from '@/components/BottomNav'
import MobileHeader from '@/components/MobileHeader'

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
      <MobileHeader teamName={teamName} />
      <Sidebar teamName={teamName} isAdmin={isAdmin} />
      <main className="flex-1 p-4 md:p-6 overflow-auto pt-18 md:pt-6 pb-20 md:pb-6">
        {children}
      </main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  )
}
