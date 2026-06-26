import { MessageButton } from "./MessageButton";
import { ProposeSwapDrawer } from "./ProposeSwapDrawer";
import { cn } from "@/lib/utils";

/**
 * The two primary viewer actions on a listing: message the owner (primary) and
 * propose a swap — the core barter loop, which NEVER processes payment
 * (secondary). Follow lives on the seller card now, and save/share are icon
 * actions in the header, so this stays a focused, single-priority CTA pair.
 * Rendered inline in the desktop column; the mobile sticky bar composes the same
 * two pieces directly.
 */
export function ListingActions({
  ownerId,
  listingId,
  className,
}: {
  ownerId: string;
  listingId: string;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-1 gap-2.5 sm:grid-cols-2", className)}>
      <MessageButton ownerId={ownerId} listingId={listingId} />
      <ProposeSwapDrawer targetListingId={listingId} />
    </div>
  );
}
