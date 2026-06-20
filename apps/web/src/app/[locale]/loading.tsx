/**
 * Default loading fallback for any locale route without its own `loading.tsx`
 * (home, auth, settings, static pages). Deliberately content-agnostic so it
 * reads acceptably everywhere; data-heavy routes ship a tailored skeleton that
 * overrides this one.
 */
export default function Loading() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-app px-4 py-6 md:max-w-6xl">
      <div className="skeleton mb-4 h-8 w-48" />
      <div className="space-y-3">
        <div className="skeleton h-32 w-full rounded-card" />
        <div className="skeleton h-4 w-5/6" />
        <div className="skeleton h-4 w-2/3" />
        <div className="skeleton h-4 w-1/2" />
      </div>
    </div>
  );
}
