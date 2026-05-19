function Bone({ className }: { className?: string }) {
  return <div className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className ?? ''}`} />
}

export default function MembersLoading() {
  return (
    <div className="space-y-6">
      <Bone className="h-8 w-36" />

      <div className="grid gap-3">
        {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm flex items-center gap-4">
            <Bone className="w-10 h-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Bone className="h-4 w-28" />
              <Bone className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
