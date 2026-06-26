"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { getOrCreateConversation } from "@swap/api";
import { createClient } from "@/lib/supabase/client";
import { getApi } from "@/lib/api";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * "Message the owner" — the primary call-to-action on a listing. Opens (or
 * reuses) the 1:1 conversation tied to this listing and routes into the chat.
 * Prefers the backend API; falls back to the Supabase RPC. Signed-out users are
 * sent to /login. Extracted so both the inline action row (desktop) and the
 * sticky bottom bar (mobile) share one implementation.
 */
export function MessageButton({
  ownerId,
  listingId,
  variant = "primary",
  className,
}: {
  ownerId: string;
  listingId: string;
  variant?: "primary" | "secondary";
  className?: string;
}) {
  const t = useTranslations("listing");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function startChat() {
    setBusy(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const api = getApi();
      const conversation = api
        ? await api.startConversation(listingId, { other_user_id: ownerId })
        : await getOrCreateConversation(supabase, {
            currentUserId: user.id,
            otherUserId: ownerId,
            listingId,
          });
      router.push(`/messages/${conversation.id}`);
    } catch {
      router.push("/login");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={startChat}
      disabled={busy}
      className={cn(variant === "primary" ? "btn-primary" : "btn-secondary", "w-full", className)}
    >
      <MessageCircle className="h-5 w-5" aria-hidden />
      {t("message")}
    </button>
  );
}
