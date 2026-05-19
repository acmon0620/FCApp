function Bone({ className }: { className?: string }) {
  return <div className={`bg-gray-200 dark:bg-gray-700 rounded animate-pulse ${className ?? ''}`} />
}

export default function EditLoading() {
  return (
    <div className="max-w-md space-y-6">
      <Bone className="h-8 w-32" />
      <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm space-y-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="space-y-1.5">
            <Bone className="h-4 w-20" />
            <Bone className="h-10 w-full rounded-lg" />
          </div>
        ))}
        <div className="flex gap-3 pt-2">
          <Bone className="h-10 flex-1 rounded-lg" />
          <Bone className="h-10 flex-1 rounded-lg" />
        </div>
      </div>
      <Bone className="h-10 w-full rounded-lg" />
    </div>
  )
}
