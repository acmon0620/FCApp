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
  const [matchRes, membersRes, lineupsRes, groupsRes, memberGroupsRes] = await Promise.all([
    supabase.from('matches').select('opponent, shirt_color').eq('id', id).eq('team_id', member.team_id).single(),
    supabase
      .from('members')
      .select('id, name, position')
      .eq('team_id', member.team_id)
      .eq('is_system_account', false)
      .is('deleted_at', null)
      .order('name', { ascending: true }),
    supabase
      .from('lineups')
      .select('member_id, position, field_x, field_y, start_minute, end_minute')
      .eq('match_id', id),
    supabase
      .from('groups')
      .select('id, name, sort_order')
      .eq('team_id', member.team_id)
      .order('sort_order', { ascending: true }),
    supabase
      .from('member_groups')
      .select('member_id, group_id, jersey_number'),
  ])

  if (!matchRes.data) redirect('/matches')

  const allEntries = lineupsRes.data ?? []
  const starterEntries = allEntries.filter(l => l.start_minute === 0)
  const participantEntries = allEntries.filter(
    l => l.start_minute === 0 || (l.start_minute === null && l.end_minute === null)
  )

  const initialStarters = starterEntries.map((l, i) => ({
    memberId: l.member_id,
    position: l.position ?? '',
    fieldX: l.field_x ?? DEFAULT_POSITIONS[i]?.x ?? 0.5,
    fieldY: l.field_y ?? DEFAULT_POSITIONS[i]?.y ?? 0.5,
  }))

  const initialParticipantIds = participantEntries.map(l => l.member_id)

  return (
    <LineupClient
      id={id}
      matchOpponent={matchRes.data.opponent}
      members={membersRes.data ?? []}
      groups={groupsRes.data ?? []}
      memberGroups={(memberGroupsRes.data ?? []).map(mg => ({
        memberId: mg.member_id,
        groupId: mg.group_id,
        jerseyNumber: mg.jersey_number,
      }))}
      initialStarters={initialStarters}
      initialParticipantIds={initialParticipantIds}
      shirtColor={(matchRes.data.shirt_color as 'white' | 'blue' | 'red') ?? 'white'}
    />
  )
}
