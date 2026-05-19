import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCurrentMember } from '@/lib/auth'
import LineupClient from './LineupClient'

type Props = { params: Promise<{ id: string }> }

const DEFAULT_POSITIONS = [
  { x: 0.5,  y: 0.85 },
  { x: 0.2,  y: 0.65 },
  { x: 0.4,  y: 0.65 },
  { x: 0.6,  y: 0.65 },
  { x: 0.8,  y: 0.65 },
  { x: 0.2,  y: 0.45 },
  { x: 0.4,  y: 0.45 },
  { x: 0.6,  y: 0.45 },
  { x: 0.8,  y: 0.45 },
  { x: 0.35, y: 0.2  },
  { x: 0.65, y: 0.2  },
]

export default async function LineupPage({ params }: Props) {
  const { id } = await params

  const member = await getCurrentMember()
  if (!member || member.role !== 'admin') redirect(`/matches/${id}`)

  const supabase = await createClient()
  const [matchRes, membersRes, lineupsRes] = await Promise.all([
    supabase.from('matches').select('opponent').eq('id', id).eq('team_id', member.team_id).single(),
    supabase
      .from('members')
      .select('id, name, number, position')
      .eq('team_id', member.team_id)
      .eq('is_system_account', false)
      .order('number', { ascending: true, nullsFirst: false }),
    supabase
      .from('lineups')
      .select('member_id, position, field_x, field_y')
      .eq('match_id', id)
      .eq('start_minute', 0)
      .is('end_minute', null),
  ])

  if (!matchRes.data) redirect('/matches')

  const initialStarters = (lineupsRes.data ?? []).map((l, i) => ({
    memberId: l.member_id,
    position: l.position ?? '',
    fieldX: l.field_x ?? DEFAULT_POSITIONS[i]?.x ?? 0.5,
    fieldY: l.field_y ?? DEFAULT_POSITIONS[i]?.y ?? 0.5,
  }))

  return (
    <LineupClient
      id={id}
      matchOpponent={matchRes.data.opponent}
      members={membersRes.data ?? []}
      initialStarters={initialStarters}
    />
  )
}
