// Painted instantly on every navigation to /home while the server component
// runs auth + data fetches. Layout mirrors HomeClient's grid so real content
// drops in without a visible reflow.

export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-black pt-16 md:pt-24">
      <div className="max-w-5xl mx-auto w-full px-4 pb-10">
        <div className="animate-pulse">
          <div className="h-8 w-40 bg-white/5 rounded-lg mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-zinc-900 border border-white/10 rounded-xl p-3 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-full bg-white/5 shrink-0" />
                <div className="flex-1 min-w-0 flex flex-col gap-2">
                  <div className="h-3 w-3/4 bg-white/5 rounded" />
                  <div className="h-2 w-1/2 bg-white/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
