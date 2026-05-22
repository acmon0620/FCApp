import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import ClaimForm from './ClaimForm'

type Props = { params: Promise<{ code: string }> }

export default async function InvitePage({ params }: Props) {
  const { code } = await params

  const adminClient = createAdminClient()

  const { data: invite } = await adminClient
    .from('member_invites')
    .select('id, expires_at, used_at, members(name)')
    .eq('code', code)
    .single()

  if (!invite) notFound()

  if (invite.used_at) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm w-full max-w-md text-center space-y-3">
          <p className="font-semibold text-gray-900 dark:text-white">この招待リンクはすでに使用されています</p>
          <a href="/login" className="text-green-600 dark:text-green-400 hover:underline text-sm">ログインはこちら</a>
        </div>
      </div>
    )
  }

  if (new Date(invite.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-xl shadow-sm w-full max-w-md text-center space-y-3">
          <p className="font-semibold text-gray-900 dark:text-white">招待リンクの有効期限が切れています</p>
          <p className="text-gray-500 dark:text-gray-400 text-sm">管理者に新しい招待リンクを発行してもらってください</p>
        </div>
      </div>
    )
  }

  const memberRaw = invite.members
  const member = Array.isArray(memberRaw) ? memberRaw[0] : memberRaw as { name: string } | null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-4">
      <ClaimForm code={code} memberName={member?.name ?? ''} />
    </div>
  )
}
