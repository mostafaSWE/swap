import { ListingGridSkeleton } from "@/components/ListingGridSkeleton";

/**
 * Shared loading skeleton for profile pages (own profile + public profile):
 * an avatar header followed by a listings grid. Decorative — hidden from
 * assistive tech, which announces the real content once it loads.
 */
export function ProfileListingsSkeleton() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-app px-4 py-6 md:max-w-6xl">
      <div className="mb-6 flex items-center gap-4">
        <div className="skeleton h-20 w-20 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-6 w-1/2" />
          <div className="skeleton h-4 w-1/3" />
        </div>
      </div>
      <ListingGridSkeleton count={6} />
    </div>
  );
}
