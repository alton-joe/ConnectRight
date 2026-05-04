// Painted instantly on navigation to /profile while the server component runs
// auth + profile fetch. Mirrors ProfileClient's shell to avoid layout shift.

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-black flex flex-col pt-16 md:pt-24">
      <div className="max-w-5xl mx-auto w-full px-4">
        <div className="h-5 w-32 bg-white/5 rounded mt-6 mb-6 animate-pulse" />
      </div>
      <main className="flex-1 max-w-sm mx-auto w-full px-4 pb-10 flex flex-col gap-6">
        <div className="animate-pulse flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-white/5" />
            <div className="h-3 w-24 bg-white/5 rounded" />
          </div>

          <div className="bg-zinc-900 border border-white/10 rounded-xl">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex flex-col gap-2">
                <div className="h-2.5 w-16 bg-white/5 rounded" />
                <div className="h-3.5 w-2/3 bg-white/5 rounded" />
              </div>
            ))}
          </div>

          <div className="bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 flex flex-col gap-2">
            <div className="h-2.5 w-20 bg-white/5 rounded" />
            <div className="h-3.5 w-1/2 bg-white/5 rounded" />
          </div>

          <div className="h-12 w-full bg-white/5 rounded-xl mt-4" />
        </div>
      </main>
    </div>
  )
}
