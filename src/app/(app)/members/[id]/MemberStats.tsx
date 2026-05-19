'use client'

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

type ChartData = {
  opponent: string
  得点: number
  アシスト: number
}

export default function MemberStats({ memberId, teamId }: { memberId: string; teamId: string }) {
  const [data, setData] = useState<ChartData[]>([])
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  useEffect(() => {
    async function load() {
      const supabase = createClient()

      const { data: matches } = await supabase
        .from('matches')
        .select('id, opponent, date')
        .eq('team_id', teamId)
        .eq('status', 'finished')
        .order('date')

      if (!matches) return

      const ids = matches.map(m => m.id)

      const [goalsRes, assistsRes] = await Promise.all([
        supabase.from('events').select('match_id').eq('member_id', memberId).eq('type', 'goal').in('match_id', ids),
        supabase.from('events').select('match_id').eq('assisted_by', memberId).eq('type', 'goal').in('match_id', ids),
      ])

      const goalsByMatch: Record<string, number> = {}
      const assistsByMatch: Record<string, number> = {}

      for (const g of goalsRes.data ?? []) {
        goalsByMatch[g.match_id] = (goalsByMatch[g.match_id] ?? 0) + 1
      }
      for (const a of assistsRes.data ?? []) {
        assistsByMatch[a.match_id] = (assistsByMatch[a.match_id] ?? 0) + 1
      }

      const chart = matches
        .filter(m => (goalsByMatch[m.id] ?? 0) > 0 || (assistsByMatch[m.id] ?? 0) > 0)
        .map(m => ({
          opponent: `vs ${m.opponent}`,
          得点: goalsByMatch[m.id] ?? 0,
          アシスト: assistsByMatch[m.id] ?? 0,
        }))

      setData(chart)
    }

    load()
  }, [memberId, teamId])

  if (data.length === 0) return null

  const axisColor = isDark ? '#9ca3af' : '#6b7280'
  const tooltipStyle = isDark
    ? { backgroundColor: '#1f2937', border: '1px solid #374151', color: '#f3f4f6' }
    : {}

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl p-5 shadow-sm">
      <h2 className="font-semibold text-gray-800 dark:text-gray-100 mb-4">試合別得点・アシスト</h2>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
          <XAxis dataKey="opponent" tick={{ fontSize: 11, fill: axisColor }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: axisColor }} />
          <Tooltip contentStyle={tooltipStyle} />
          <Legend />
          <Bar dataKey="得点" fill="#16a34a" radius={[4, 4, 0, 0]} />
          <Bar dataKey="アシスト" fill="#86efac" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
