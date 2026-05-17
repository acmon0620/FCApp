export const MATCH_TAGS = ['リーグ戦', '練習試合', 'カップ戦', '大会', 'フレンドリー', 'その他'] as const
export type MatchTag = (typeof MATCH_TAGS)[number]

export const TAG_COLOR: Record<string, string> = {
  'リーグ戦':     'bg-blue-100 text-blue-700',
  '練習試合':     'bg-gray-100 text-gray-600',
  'カップ戦':     'bg-purple-100 text-purple-700',
  '大会':         'bg-orange-100 text-orange-700',
  'フレンドリー': 'bg-teal-100 text-teal-700',
  'その他':       'bg-gray-100 text-gray-500',
}
