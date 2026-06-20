/** Chat loading skeleton: pinned context card, alternating bubbles, composer. */
export default function Loading() {
  return (
    <div aria-hidden className="mx-auto flex min-h-[70vh] w-full max-w-app flex-col gap-3 px-4 py-4 md:max-w-6xl">
      <div className="skeleton h-16 w-full rounded-card" />
      <div className="flex-1 space-y-3 py-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={i % 2 === 0 ? "flex justify-start" : "flex justify-end"}>
            <div className="skeleton h-10 w-1/2 rounded-card" />
          </div>
        ))}
      </div>
      <div className="skeleton h-12 w-full rounded-full" />
    </div>
  );
}
