/**
 * Admin panel loading skeleton — renders inside the panel layout (sidebar
 * persists). Covers the dashboard cards/charts and the moderation tables.
 */
export default function Loading() {
  return (
    <div aria-hidden className="space-y-6 p-4 md:p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-24 w-full rounded-card" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="skeleton h-64 w-full rounded-card" />
        <div className="skeleton h-64 w-full rounded-card" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-12 w-full rounded-card" />
        ))}
      </div>
    </div>
  );
}
