import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMember } from '@/lib/auth'
import EditForm from './EditForm'

type Props = { params: Promise<{ id: string }> }

export default async function MatchEditPage({ params }: Props) {
  const { id } = await params

  const member = await getCurrentMember()
  if (!member || member.role !== 'admin') redirect(`/matches/${id}`)

  const supabase = await createClient()
  const [{ data: match }, { data: tagRows }] = await Promise.all([
    supabase
      .from('matches')
      .select('opponent, date, tag, duration, shirt_color')
      .eq('id', id)
      .eq('team_id', member.team_id)
      .single(),
    supabase
      .from('matches')
      .select('tag')
      .eq('team_id', member.team_id)
      .not('tag', 'is', null),
  ])

  if (!match) redirect('/matches')

  const tagSuggestions = [...new Set((tagRows ?? []).map(r => r.tag as string).filter(Boolean))].sort()

  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">試合を編集</h1>
      <EditForm
        id={id}
        initialOpponent={match.opponent}
        initialDate={match.date}
        initialTag={match.tag ?? ''}
        initialDuration={match.duration ?? null}
        initialShirtColor={(match.shirt_color as 'white' | 'blue' | 'red') ?? 'white'}
        tagSuggestions={tagSuggestions}
      />
    </div>
  )
}
