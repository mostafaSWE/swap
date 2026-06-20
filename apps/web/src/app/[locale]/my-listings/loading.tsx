import { ListingGridSkeleton } from "@/components/ListingGridSkeleton";

/** My-listings loading skeleton. */
export default function Loading() {
  return (
    <div aria-hidden className="mx-auto w-full max-w-app px-4 py-6 md:max-w-6xl">
      <div className="skeleton mb-4 h-7 w-40" />
      <ListingGridSkeleton count={8} />
    </div>
  );
}
