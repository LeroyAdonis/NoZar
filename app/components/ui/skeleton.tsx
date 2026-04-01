export function CardSkeleton() {
  return (
    <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-4 flex gap-4 animate-pulse pointer-events-none">
      <div className="w-24 h-24 rounded-2xl bg-white/5 flex-shrink-0" />
      <div className="flex-1 flex flex-col justify-between py-1">
        <div className="space-y-2">
          <div className="h-4 bg-white/5 rounded w-3/4" />
          <div className="h-3 bg-white/5 rounded w-full" />
        </div>
        <div className="flex gap-3 mt-2">
          <div className="h-5 bg-white/5 rounded w-16" />
          <div className="h-5 bg-white/5 rounded w-12" />
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading">
      {[1, 2, 3, 4, 5].map((i) => (
        <CardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading listings…</span>
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-[#0F172A] border border-white/10 rounded-2xl p-4 text-center animate-pulse"
        >
          <div className="w-5 h-5 rounded-full bg-white/5 mx-auto mb-3" />
          <div className="h-5 bg-white/5 rounded w-8 mx-auto mb-1" />
          <div className="h-2.5 bg-white/5 rounded w-12 mx-auto" />
        </div>
      ))}
    </div>
  );
}

export function ListingManageSkeleton() {
  return (
    <div className="bg-[#0F172A] border border-white/10 rounded-2xl p-4 flex items-center gap-3 animate-pulse pointer-events-none">
      <div className="w-10 h-10 rounded-xl bg-white/5 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-white/5 rounded w-32" />
        <div className="h-3 bg-white/5 rounded w-20" />
      </div>
      <div className="flex gap-2">
        <div className="h-6 bg-white/5 rounded-lg w-14" />
        <div className="h-6 bg-white/5 rounded-lg w-16" />
      </div>
    </div>
  );
}

export function DetailPageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="h-4 bg-white/5 rounded w-24 animate-pulse" />
      <div className="w-full aspect-video rounded-3xl bg-white/5 animate-pulse" />
      <div className="space-y-2">
        <div className="h-8 bg-white/5 rounded w-3/4 animate-pulse" />
        <div className="h-4 bg-white/5 rounded w-full animate-pulse" />
        <div className="h-4 bg-white/5 rounded w-5/6 animate-pulse" />
      </div>
      <div className="bg-white/5 rounded-2xl p-4 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-white/10 rounded w-24" />
            <div className="h-2.5 bg-white/10 rounded w-16" />
          </div>
        </div>
      </div>
      <div className="h-12 bg-emerald-500/10 rounded-xl animate-pulse" />
      <span className="sr-only">Loading asset details…</span>
    </div>
  );
}

export function ProfileSectionSkeleton() {
  return (
    <div className="bg-[#0F172A] border border-white/10 rounded-3xl p-6 space-y-4 animate-pulse pointer-events-none">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="h-5 bg-white/5 rounded w-32" />
          <div className="h-3 bg-white/5 rounded w-48" />
          <div className="h-3 bg-white/5 rounded w-40" />
        </div>
      </div>
    </div>
  );
}
