import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import Link from 'next/link'
import { TAG_COLOR } from '@/lib/matchTags'
import FormationField from '@/components/FormationField'
import FormationEditor from '@/components/FormationEditor'
import { getCurrentMember } from '@/lib/auth'
import MatchNote from './MatchNote'
import MatchEventsClient from './MatchEventsClient'
import MatchLineupSection from './MatchLineupSection'

type Props = { params: Promise<{ id: string }> }

export default async function MatchDetailPage({ params }: Props) {
  const { id } = await params

  const member = await getCurrentMember()
  if (!member) redirect('/login')

  const supabase = await createClient()

  const { data: match } = await supabase
    .from('matches')
    .select('*')
    .eq('id', id)
    .eq('team_id', member.team_id)
    .single()

  if (!match) redirect('/matches')

  const { data: lineups } = await supabase
    .from('lineups')
    .select('*, members(name, number)')
    .eq('match_id', id)
    .order('start_minute')

  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('match_id', id)
    .order('minute')

  const eventMemberIds = [...new Set([
    ...(events ?? []).map((e: { member_id: string | null }) => e.member_id).filter((x): x is string => x != null),
    ...(events ?? []).map((e: { assisted_by: string | null }) => e.assisted_by).filter((x): x is string => x != null),
  ])]
  const { data: eventMembersData } = eventMemberIds.length > 0
    ? await supabase.from('members').select('id, name').in('id', eventMemberIds)
    : { data: [] as { id: string; name: string }[] }
  const memberNameById = Object.fromEntries((eventMembersData ?? []).map((m: { id: string; name: string }) => [m.id, m.name]))

  const { data: allMembers } = await supabase
    .from('members')
    .select('id, name, number')
    .eq('team_id', member.team_id)
    .eq('is_system_account', false)
    .is('deleted_at', null)

  const attendingIds = new Set((lineups ?? []).map(l => l.member_id))
  const eventMembers = (attendingIds.size > 0
    ? (allMembers ?? []).filter((m: { id: string }) => attendingIds.has(m.id))
    : (allMembers ?? [])) as { id: string; name: string; number: number | null }[]

  const isAdmin = member.role === 'admin'
  const teamName = member.teams?.name ?? 'チーム'

  type RawLineup = {
    id: string
    member_id: string
    member_name: string | null
    position: string | null
    start_minute: number | null
    end_minute: number | null
    members: { name: string; number: number | null } | null
  }
  const toEntry = (l: RawLineup) => ({
    id: l.id,
    displayName: l.member_name ?? l.members?.name ?? '',
    number: l.members?.number ?? null,
  })
  const allLineups = (lineups ?? []) as RawLineup[]
  const lineupRows = allLineups
    .filter(l => l.start_minute !== null)
    .map(l => ({
      id: l.id,
      displayName: l.member_name ?? l.members?.name ?? '',
      number: l.members?.number ?? null,
      position: l.position,
      startMinute: l.start_minute,
      endMinute: l.end_minute ?? null,
      isStarter: l.start_minute === 0,
      minutes: l.end_minute != null ? l.end_minute - (l.start_minute ?? 0) : null,
    }))
  const activeLineups = allLineups
    .filter(l => l.start_minute !== null && l.end_minute === null)
    .map(toEntry)
  const benchLineups = allLineups
    .filter(l => l.start_minute === null && l.end_minute === null)
    .map(toEntry)

  const matchDuration: number | null = match.duration ?? null

  async function completeMatch() {
    'use server'
    const supabase = await createClient()
    await supabase.from('matches').update({ status: 'finished' }).eq('id', id)
    if (matchDuration != null) {
      await supabase.from('lineups')
        .update({ end_minute: matchDuration })
        .eq('match_id', id)
        .not('start_minute', 'is', null)
        .is('end_minute', null)
    }
    revalidatePath(`/matches/${id}`)
    revalidatePath('/matches')
  }

  const starters = (lineups ?? []).filter(l => l.start_minute === 0)
  const formationPlayers = starters
    .filter(l => l.field_x != null && l.field_y != null)
    .map(l => {
      const m = l.members as { name: string; number: number | null } | null
      const displayName = (l as { member_name?: string | null }).member_name ?? m?.name ?? ''
      return { id: l.id, number: m?.number ?? null, name: displayName, x: l.field_x as number, y: l.field_y as number }
    })

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <Link href="/matches" className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">← 試合一覧</Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">vs {match.opponent}</h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-gray-500 dark:text-gray-400">{match.date}{match.duration ? ` · ${match.duration}分` : ''}</p>
            {match.tag && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TAG_COLOR[match.tag] ?? 'bg-gray-100 text-gray-600'}`}>
                {match.tag}
              </span>
            )}
          </div>
        </div>
        {isAdmin && (
          <div className="flex gap-2 flex-wrap">
            <Link
              href={`/matches/${id}/edit`}
              className="border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              編集
            </Link>
            <Link
              href={`/matches/${id}/lineup`}
              className="border border-green-600 text-green-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-50 transition-colors"
            >
              メンバー設定
            </Link>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm text-center">
        <p className="text-5xl font-bold text-gray-900 dark:text-white">
          {match.score_us} <span className="text-gray-300 dark:text-gray-600">-</span> {match.score_them}
        </p>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{teamName} · {match.opponent}</p>
      </div>

      {isAdmin && (
        match.status !== 'finished' ? (
          <form action={completeMatch}>
            <button
              type="submit"
              className="w-full bg-green-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              記録完了
            </button>
          </form>
        ) : (
          <p className="text-center text-sm text-gray-400 dark:text-gray-500">試合終了として記録済み</p>
        )
      )}

      {formationPlayers.length > 0 && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-3">フォーメーション</h2>
          {isAdmin
            ? <FormationEditor initialPlayers={formationPlayers} shirtColor={match.shirt_color ?? 'white'} />
            : <FormationField players={formationPlayers} shirtColor={match.shirt_color ?? 'white'} readOnly />
          }
        </div>
      )}

      <MatchLineupSection
        matchId={id}
        lineupRows={lineupRows}
        activeLineups={activeLineups}
        benchLineups={benchLineups}
        isAdmin={isAdmin}
      />

      <MatchNote matchId={id} initialNote={(match as { note?: string | null }).note ?? null} isAdmin={isAdmin} />

      <MatchEventsClient
        matchId={id}
        scoreUs={match.score_us}
        scoreThem={match.score_them}
        initialEvents={events ?? []}
        eventMembers={eventMembers}
        memberNameById={memberNameById}
        isAdmin={isAdmin}
        opponentName={match.opponent}
      />
    </div>
  )
}
