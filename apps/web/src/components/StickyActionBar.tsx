import { MessageButton } from "./MessageButton";
import { ProposeSwapDrawer } from "./ProposeSwapDrawer";
import { SaveButton } from "./SaveButton";

/**
 * Mobile-only sticky CTA bar. Keeps the primary path — message the owner and
 * propose a swap, plus a quick save — reachable without scrolling back up.
 * Hidden on desktop (the inline action row handles that). Uses safe-area padding
 * so it clears the gesture bar; the page reserves matching bottom padding so it
 * never covers content. Shown only to non-owners.
 */
export function StickyActionBar({
  ownerId,
  listingId,
  initialSaved,
}: {
  ownerId: string;
  listingId: string;
  initialSaved: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-app items-center gap-2 px-4 pb-[calc(0.625rem+env(safe-area-inset-bottom))] pt-2.5">
        <div className="flex-[1.3]">
          <MessageButton ownerId={ownerId} listingId={listingId} />
        </div>
        <div className="flex-1">
          <ProposeSwapDrawer targetListingId={listingId} />
        </div>
        <SaveButton variant="icon" listingId={listingId} initialSaved={initialSaved} />
      </div>
    </div>
  );
}
