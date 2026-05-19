function Bone({ className }: { className?: string }) {
  return <div className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className ?? ''}`} />
}

export default function RankingsLoading() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-32" />

      <div className="flex gap-1 overflow-x-auto">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <Bone key={i} className="h-9 w-20 flex-shrink-0 rounded-lg" />
        ))}
      </div>

      <div className="flex gap-3">
        <Bone className="h-9 w-36 rounded-lg" />
        <Bone className="h-9 w-28 rounded-lg" />
        <Bone className="h-9 w-28 rounded-lg" />
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm divide-y dark:divide-gray-700">
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="flex items-center gap-3 px-5 py-4">
            <Bone className="h-5 w-6" />
            <Bone className="h-8 w-8 rounded-full" />
            <Bone className="h-4 w-28 flex-1" />
            <Bone className="h-5 w-12" />
          </div>
        ))}
      </div>
    </div>
  )
}
