function Bone({ className }: { className?: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className ?? ''}`} />
}

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-40" />

      {/* 勝利 / 引き分け / 敗北 */}
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm text-center space-y-2">
            <Bone className="h-9 w-10 mx-auto" />
            <Bone className="h-4 w-12 mx-auto" />
          </div>
        ))}
      </div>

      {/* 直近の試合 / 得点ランキング */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-3">
          <Bone className="h-5 w-32" />
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} className="flex justify-between">
              <Bone className="h-4 w-36" />
              <Bone className="h-4 w-20" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-3">
          <Bone className="h-5 w-40" />
          {[0, 1, 2].map(i => (
            <div key={i} className="flex justify-between">
              <Bone className="h-4 w-28" />
              <Bone className="h-4 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
