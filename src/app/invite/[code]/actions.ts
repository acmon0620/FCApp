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

  // 旧メンバーのデータを取得
  const { data: oldMember } = await adminClient
    .from('members')
    .select('team_id, name, role, number, position, birth_date, preferred_foot, is_system_account')
    .eq('id', oldMemberId)
    .single()

  if (!oldMember) return { error: 'メンバーが見つかりません' }

  // auth アカウントを作成
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

  // 新UUIDで members に INSERT（これでFKの参照先が確保される）
  const { error: insertError } = await adminClient.from('members').insert({
    id: newUserId,
    team_id: oldMember.team_id,
    name: oldMember.name,
    role: oldMember.role,
    number: oldMember.number,
    position: oldMember.position,
    birth_date: oldMember.birth_date,
    preferred_foot: oldMember.preferred_foot,
    is_system_account: oldMember.is_system_account,
    has_login: true,
  })

  if (insertError) {
    await adminClient.auth.admin.deleteUser(newUserId)
    return { error: `登録エラー: ${insertError.message}` }
  }

  // FK参照を旧IDから新IDに更新
  await adminClient.from('lineups').update({ member_id: newUserId }).eq('member_id', oldMemberId)
  await adminClient.from('events').update({ member_id: newUserId }).eq('member_id', oldMemberId)
  await adminClient.from('events').update({ assisted_by: newUserId }).eq('assisted_by', oldMemberId)

  // 招待を使用済みにして新IDに紐付け直す（削除前に実行）
  await adminClient
    .from('member_invites')
    .update({ member_id: newUserId, used_at: new Date().toISOString() })
    .eq('id', invite.id)

  // 旧メンバー行を削除
  await adminClient.from('members').delete().eq('id', oldMemberId)

  return {}
}
