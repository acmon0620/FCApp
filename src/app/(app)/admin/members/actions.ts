'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function getAdminMember() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: me } = await supabase
    .from('members')
    .select('id, role, team_id')
    .eq('id', user.id)
    .single()
  if (!me || me.role !== 'admin') return null
  return me
}

export async function createMemberInvite(memberId: string): Promise<{ code?: string; error?: string }> {
  const me = await getAdminMember()
  if (!me) return { error: '権限がありません' }

  let adminClient: ReturnType<typeof createAdminClient>
  try {
    adminClient = createAdminClient()
  } catch {
    return { error: 'サーバー設定エラー: SUPABASE_SERVICE_ROLE_KEY が未設定です' }
  }

  const { data: member } = await adminClient
    .from('members')
    .select('id, has_login')
    .eq('id', memberId)
    .eq('team_id', me.team_id)
    .single()

  if (!member) return { error: 'メンバーが見つかりません' }
  if (member.has_login) return { error: 'このメンバーはすでにログイン情報が設定されています' }

  // 有効な招待が既にあれば再利用
  const { data: existing } = await adminClient
    .from('member_invites')
    .select('code')
    .eq('member_id', memberId)
    .is('used_at', null)
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing) return { code: existing.code }

  const bytes = crypto.getRandomValues(new Uint8Array(6))
  const code = Array.from(bytes).map(b => b.toString(36).padStart(2, '0')).join('').slice(0, 10)

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { error } = await adminClient.from('member_invites').insert({
    team_id: me.team_id,
    member_id: memberId,
    code,
    expires_at: expiresAt.toISOString(),
  })

  if (error) return { error: `招待リンク作成エラー: ${error.message}` }
  return { code }
}

export async function toggleMemberRole(memberId: string): Promise<{ error?: string }> {
  const me = await getAdminMember()
  if (!me) return { error: '権限がありません' }
  if (memberId === me.id) return { error: '自分自身のロールは変更できません' }

  const supabase = await createClient()
  const { data: target } = await supabase
    .from('members')
    .select('role')
    .eq('id', memberId)
    .eq('team_id', me.team_id)
    .single()

  if (!target) return { error: 'メンバーが見つかりません' }

  const { error } = await supabase
    .from('members')
    .update({ role: target.role === 'admin' ? 'member' : 'admin' })
    .eq('id', memberId)

  if (error) return { error: error.message }
  return {}
}
