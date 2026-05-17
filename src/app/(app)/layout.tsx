import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: member } = await supabase
    .from('members')
    .select('role, teams(name)')
    .eq('id', user.id)
    .single()

  const teamName = (member?.teams as unknown as { name: string } | null)?.name ?? ''
  const isAdmin = member?.role === 'admin'

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar teamName={teamName} isAdmin={isAdmin} />
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>
    </div>
  )
}
