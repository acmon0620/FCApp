import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import RankingsClient from './RankingsClient'
import { getCurrentMember } from '@/lib/auth'

export default async function RankingsPage() {
  const memberRow = await getCurrentMember()
  if (!memberRow) redirect('/login')

  const supabase = await createClient()
  // チームが実際に使っているタグを取得（カスタムタグ含む）
  const { data: tagRows } = await supabase
    .from('matches')
    .select('tag')
    .eq('team_id', memberRow.team_id)
    .not('tag', 'is', null)

  const availableTags = [...new Set(
    (tagRows ?? []).map(r => r.tag as string).filter(Boolean)
  )].sort()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">ランキング</h1>
      <RankingsClient teamId={memberRow.team_id} availableTags={availableTags} />
    </div>
  )
}
