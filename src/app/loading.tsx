export default function Loading() {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="w-full max-w-4xl space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="premium-surface rounded-2xl p-5 animate-pulse">
              <div className="flex justify-between mb-4">
                <div className="w-12 h-12 rounded-xl skeleton" />
                <div className="w-14 h-5 rounded-full skeleton" />
              </div>
              <div className="h-3 w-24 skeleton mb-3" />
              <div className="h-8 w-16 skeleton" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 premium-surface rounded-2xl p-6 h-[320px] skeleton" />
          <div className="premium-surface rounded-2xl p-6 h-[320px] skeleton" />
        </div>
      </div>
    </div>
  );
}
