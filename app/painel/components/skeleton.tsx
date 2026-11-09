"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-shimmer rounded ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-gray-200/60 p-5 space-y-3 animate-fade-in">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border overflow-hidden animate-fade-in">
      <div className="border-b bg-gray-50 p-3 flex gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="p-3 border-b last:border-0 flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full shrink-0" />
          {Array.from({ length: cols - 1 }).map((_, c) => (
            <Skeleton key={c} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonKanban() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className={`bg-gray-50 rounded-xl min-w-[280px] w-[280px] border-t-4 border-t-gray-200 p-3 space-y-2 animate-fade-in stagger-${Math.min(i + 1, 4)}`}>
          <Skeleton className="h-4 w-20 mb-3" />
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="bg-white rounded-lg p-3 border border-gray-100 space-y-2">
              <Skeleton className="h-3.5 w-3/4" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-2.5 w-16" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-gradient-to-r from-[#0c4a3e] to-[#0e6b56] rounded-xl p-5 -mx-1 shadow-md animate-fade-in">
        <div>
          <Skeleton className="h-7 w-40 !bg-white/20" />
          <Skeleton className="h-3 w-60 mt-2 !bg-white/10" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-lg !bg-white/15" />
          <Skeleton className="h-9 w-32 rounded-lg !bg-white/10" />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`bg-white rounded-xl border border-gray-200/60 p-5 space-y-3 animate-scale-in stagger-${i + 1}`}>
            <div className="flex items-center gap-3">
              <Skeleton className="h-11 w-11 rounded-xl" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-7 w-16" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200/60 p-5 space-y-3 animate-fade-in">
          <Skeleton className="h-5 w-40" />
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-2">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3.5 w-2/3" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
              <Skeleton className="h-2 w-24 rounded-full" />
            </div>
          ))}
        </div>
        <div className="bg-white rounded-xl border border-gray-200/60 p-5 space-y-3 animate-fade-in">
          <Skeleton className="h-5 w-36" />
          <div className="flex items-center justify-center py-4">
            <Skeleton className="h-[150px] w-[150px] rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
