/** Inbox loading skeleton: a list of conversation rows. */
export default function Loading() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-app px-4 py-4 md:max-w-6xl">
      <div className="skeleton mb-4 h-7 w-32" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-card border border-line bg-white p-3">
            <div className="skeleton h-12 w-12 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-1/3" />
              <div className="skeleton h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
