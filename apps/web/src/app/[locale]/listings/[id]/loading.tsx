/** Listing-detail loading skeleton: gallery + info column. Covers /edit too. */
export default function Loading() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-app px-4 py-4 md:grid md:max-w-6xl md:grid-cols-2 md:gap-8 md:py-8">
      <div className="skeleton aspect-square w-full rounded-card" />
      <div className="mt-4 space-y-4 md:mt-0">
        <div className="skeleton h-7 w-3/4" />
        <div className="skeleton h-5 w-1/3" />
        <div className="skeleton h-24 w-full rounded-card" />
        <div className="skeleton h-12 w-full rounded-full" />
      </div>
    </div>
  );
}
