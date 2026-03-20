export default function PageSkeleton() {
  return (
    <div className="container mx-auto px-6 py-20 animate-pulse">
      <div className="flex flex-col items-center gap-6 mb-20">
        <div className="h-3 w-32 bg-bg-tertiary rounded-full"></div>
        <div className="h-12 w-96 max-w-full bg-bg-tertiary rounded-xl"></div>
        <div className="h-12 w-80 max-w-full bg-bg-tertiary rounded-xl"></div>
        <div className="h-5 w-64 max-w-full bg-bg-tertiary rounded-full mt-4"></div>
        <div className="h-14 w-52 bg-accent-primary/20 rounded-xl mt-6"></div>
      </div>
      <div className="flex flex-wrap justify-center gap-10">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-full sm:w-[380px] bg-bg-card border border-border-subtle rounded-3xl overflow-hidden">
            <div className="h-56 bg-bg-tertiary"></div>
            <div className="p-8 space-y-4">
              <div className="h-6 w-3/4 bg-bg-tertiary rounded"></div>
              <div className="h-4 w-full bg-bg-tertiary rounded"></div>
              <div className="h-4 w-5/6 bg-bg-tertiary rounded"></div>
              <div className="h-8 w-24 bg-accent-primary/20 rounded mt-6"></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
