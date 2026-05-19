function Bone({ className }: { className?: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className ?? ''}`} />
}

export default function MatchesLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Bone className="h-8 w-28" />
        <Bone className="h-9 w-28 rounded-lg" />
      </div>

      <div className="space-y-3">
        {[0, 1, 2, 3, 4, 5].map(i => (
          <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Bone className="h-5 w-36" />
                <Bone className="h-4 w-20" />
              </div>
              <div className="flex items-center gap-2">
                <Bone className="h-5 w-16 rounded-full" />
                <Bone className="h-6 w-14" />
                <Bone className="h-5 w-10 rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
