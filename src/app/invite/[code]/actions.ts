'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function claimMemberAccount(
  code: string,
  email: string,
  password: string,
): Promise<{ error?: string }> {
  let adminClient: ReturnType<typeof createAdminClient>
  try {
    adminClient = createAdminClient()
  } catch {
    return { error: 'サーバー設定エラーです' }
  }

  const { data: invite } = await adminClient
    .from('member_invites')
    .select('id, member_id, expires_at, used_at')
    .eq('code', code)
    .single()

  if (!invite) return { error: '招待が見つかりません' }
  if (invite.used_at) return { error: 'この招待リンクはすでに使用されています' }
  if (new Date(invite.expires_at) < new Date()) return { error: '招待リンクの有効期限が切れています' }

  const oldMemberId = invite.member_id

  const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createError) {
    const msg = createError.message.toLowerCase()
    if (msg.includes('already') || msg.includes('exist')) {
      return { error: 'そのメールアドレスはすでに使用されています' }
    }
    return { error: `アカウント作成エラー: ${createError.message}` }
  }

  const newUserId = newUserData.user.id

  // FKを先に更新してからmembers.idを変更する
  await adminClient.from('lineups').update({ member_id: newUserId }).eq('member_id', oldMemberId)
  await adminClient.from('events').update({ member_id: newUserId }).eq('member_id', oldMemberId)
  await adminClient.from('events').update({ assisted_by: newUserId }).eq('assisted_by', oldMemberId)

  const { error: memberError } = await adminClient
    .from('members')
    .update({ id: newUserId, has_login: true })
    .eq('id', oldMemberId)

  if (memberError) {
    await adminClient.auth.admin.deleteUser(newUserId)
    return { error: `登録エラー: ${memberError.message}` }
  }

  await adminClient
    .from('member_invites')
    .update({ used_at: new Date().toISOString() })
    .eq('id', invite.id)

  return {}
}
