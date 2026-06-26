"use client";

import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { getListings } from "@swap/api";
import type { ListingWithRelations } from "@swap/types";
import { createClient } from "@/lib/supabase/client";
import { ItemArtwork } from "./ItemArtwork";
import { EmptyState, LoadingSpinner } from "./primitives";
import { CTAButton } from "./CTAButton";
import { cn } from "@/lib/utils";

/**
 * Multi-select grid of a user's ACTIVE listings — the shared picker used by the
 * propose-exchange drawer (offer your own items) and the counter-offer flow
 * (re-select the proposer's items). Selection state is controlled by the parent.
 */
export function ListingPicker({
  ownerId,
  excludeListingId,
  value,
  onChange,
  max,
  onLoaded,
}: {
  ownerId: string;
  excludeListingId?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  /** Max selectable items (mirrors the backend cap); selecting more is blocked. */
  max?: number;
  /** Reports the ids actually loaded (active + owned) so callers can prune stale pre-selections. */
  onLoaded?: (availableIds: string[]) => void;
}) {
  const t = useTranslations("proposal");
  const [listings, setListings] = useState<ListingWithRelations[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setListings(null);
    setError(false);
    getListings(createClient(), { ownerId, limit: 50 })
      .then((rows) => {
        if (!active) return;
        const visible = rows.filter((l) => l.id !== excludeListingId);
        setListings(visible);
        onLoaded?.(visible.map((l) => l.id));
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
    // onLoaded is intentionally excluded: callers pass a stable/idempotent handler.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, excludeListingId]);

  if (error) return <p className="py-8 text-center text-sm text-danger">{t("error")}</p>;
  if (!listings) return <LoadingSpinner />;
  if (!listings.length) {
    return (
      <EmptyState
        title={t("noListings")}
        description={t("noListingsHint")}
        action={<CTAButton href="/listings/new">{t("createListing")}</CTAButton>}
      />
    );
  }

  const atCap = max !== undefined && value.length >= max;

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else if (!atCap) {
      onChange([...value, id]);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {listings.map((l) => {
        const selected = value.includes(l.id);
        const blocked = atCap && !selected;
        return (
          <button
            key={l.id}
            type="button"
            onClick={() => toggle(l.id)}
            aria-pressed={selected}
            disabled={blocked}
            className={cn(
              "group relative overflow-hidden rounded-card border bg-surface text-start transition focus:outline-none focus-visible:ring-2 focus-visible:ring-green/50",
              selected ? "border-green ring-2 ring-green/40" : "border-line hover:border-green/50",
              blocked && "cursor-not-allowed opacity-50",
            )}
          >
            <span className="relative block aspect-square w-full">
              <ItemArtwork listing={l} className="h-full w-full" sizes="120px" />
              {selected ? (
                <span className="absolute end-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-green text-white shadow">
                  <Check className="h-4 w-4" aria-hidden />
                </span>
              ) : null}
            </span>
            <span className="block truncate px-2 py-1.5 text-xs font-semibold text-ink">{l.title}</span>
          </button>
        );
      })}
    </div>
  );
}
