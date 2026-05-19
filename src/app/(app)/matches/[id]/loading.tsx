function Bone({ className }: { className?: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className ?? ''}`} />
}

export default function MatchDetailLoading() {
  return (
    <div className="space-y-6 max-w-2xl">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Bone className="h-4 w-20" />
          <Bone className="h-8 w-48" />
          <Bone className="h-4 w-32" />
        </div>
        <div className="flex gap-2">
          <Bone className="h-9 w-16 rounded-lg" />
          <Bone className="h-9 w-28 rounded-lg" />
        </div>
      </div>

      {/* スコア */}
      <div className="bg-white rounded-xl p-6 shadow-sm text-center space-y-2">
        <Bone className="h-12 w-32 mx-auto" />
        <Bone className="h-4 w-24 mx-auto" />
      </div>

      {/* 出場メンバー */}
      <div className="bg-white rounded-xl p-5 shadow-sm space-y-3">
        <Bone className="h-5 w-28" />
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex gap-4">
            <Bone className="h-4 w-28" />
            <Bone className="h-4 w-16" />
            <Bone className="h-4 w-24" />
            <Bone className="h-4 w-12 ml-auto" />
          </div>
        ))}
      </div>

      {/* イベント */}
      <div className="bg-white rounded-xl p-5 shadow-sm space-y-3">
        <Bone className="h-5 w-20" />
        {[0, 1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3">
            <Bone className="h-6 w-6 rounded-full" />
            <Bone className="h-4 w-10" />
            <Bone className="h-4 w-36" />
          </div>
        ))}
      </div>
    </div>
  )
}
