"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getApi } from "@/lib/api";

export function ListingViewTracker({ listingId }: { listingId: string }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    async function recordView() {
      try {
        const api = getApi();
        if (api) {
          await api.recordView(listingId);
        } else {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();

          // Fallback directly to Supabase client if API isn't running
          await supabase.from("listing_views").insert({
            listing_id: listingId,
            user_id: user?.id || null,
          });
        }
      } catch (err) {
        console.error("Failed to record view:", err);
      }
    }

    recordView();
  }, [listingId]);

  return null;
}
