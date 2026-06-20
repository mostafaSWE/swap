/** Categories grid loading skeleton. */
export default function Loading() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-app px-4 py-6 md:max-w-6xl">
      <div className="skeleton mb-4 h-7 w-40" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="skeleton h-24 w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}
