// Painted instantly on every navigation to /activity while the server component
// runs auth + the 60-day message/connection aggregates. Layout mirrors
// ActivityClient so real content drops in without a visible reflow.

export default function ActivityLoading() {
  return (
    <div className="min-h-screen bg-black flex flex-col pt-16 md:pt-24">
      <div className="max-w-6xl mx-auto w-full px-4">
        <div className="h-8 w-20 bg-white/5 rounded-lg animate-pulse" />
      </div>

      <main className="flex-1 max-w-6xl mx-auto w-full px-4 pb-16 flex flex-col gap-6 animate-pulse">
        <div className="flex flex-col gap-2">
          <div className="h-7 w-44 bg-white/10 rounded" />
          <div className="h-3 w-72 bg-white/5 rounded" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[88px] bg-zinc-900 border border-white/10 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[76px] bg-zinc-900/40 border border-white/10 rounded-2xl" />
          ))}
        </div>

        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
          <div className="h-4 w-48 bg-white/10 rounded" />
          <div className="h-44 bg-white/5 rounded" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
            <div className="h-4 w-40 bg-white/10 rounded" />
            <div className="h-44 bg-white/5 rounded" />
          </div>
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
            <div className="h-4 w-40 bg-white/10 rounded" />
            <div className="h-44 bg-white/5 rounded" />
          </div>
        </div>

        <div className="bg-zinc-900 border border-white/10 rounded-2xl p-5 flex flex-col gap-4">
          <div className="h-4 w-44 bg-white/10 rounded" />
          <div className="grid grid-cols-12 gap-1.5">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-md bg-white/5" />
            ))}
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5 h-20" />
      </main>
    </div>
  )
}
