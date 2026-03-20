export default function ServiceCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="w-full sm:w-[380px] bg-bg-card border border-border-subtle rounded-3xl overflow-hidden animate-pulse"
        >
          <div className="h-56 bg-bg-tertiary relative">
            <div className="absolute bottom-4 left-6">
              <div className="h-5 w-16 bg-bg-card/60 rounded-full"></div>
            </div>
          </div>
          <div className="p-8 pb-10 space-y-4">
            <div className="h-7 w-3/4 bg-bg-tertiary rounded-lg"></div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-bg-tertiary rounded"></div>
              <div className="h-4 w-5/6 bg-bg-tertiary rounded"></div>
            </div>
            <div className="border-t border-border-subtle/50 pt-6 mt-6 flex justify-between items-center">
              <div className="space-y-2">
                <div className="h-3 w-16 bg-bg-tertiary rounded"></div>
                <div className="h-8 w-20 bg-accent-primary/15 rounded"></div>
              </div>
              <div className="w-10 h-10 bg-bg-tertiary rounded-full"></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
