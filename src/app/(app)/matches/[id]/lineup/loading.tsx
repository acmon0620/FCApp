function Bone({ className }: { className?: string }) {
  return <div className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className ?? ''}`} />
}

export default function LineupLoading() {
  return (
    <div className="space-y-5 max-w-2xl">
      <div className="space-y-1.5">
        <Bone className="h-4 w-20" />
        <Bone className="h-8 w-56" />
        <Bone className="h-4 w-32" />
      </div>

      <div className="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        {[0, 1, 2].map(i => (
          <Bone key={i} className="flex-1 h-10 rounded-none" />
        ))}
      </div>

      <div className="space-y-2">
        {[0, 1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <Bone className="h-5 w-28 flex-1" />
            <Bone className="h-6 w-16 rounded-full" />
          </div>
        ))}
      </div>

      <div className="flex gap-3 pb-8">
        <Bone className="h-10 flex-1 rounded-lg" />
        <Bone className="h-10 flex-1 rounded-lg" />
      </div>
    </div>
  )
}
