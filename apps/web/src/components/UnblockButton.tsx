"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { unblockUser } from "@swap/api";
import { createClient } from "@/lib/supabase/client";
import { getApi } from "@/lib/api";
import { useRouter } from "@/i18n/navigation";

/** Unblock a user from the blocked-users list. Removes the row on success. */
export function UnblockButton({ userId }: { userId: string }) {
  const t = useTranslations("block");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function unblock() {
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
      if (api) await api.unblock(userId);
      else await unblockUser(supabase, user.id, userId);
      router.refresh();
    } catch {
      setBusy(false); // keep the row; let the user retry
    }
  }

  return (
    <button type="button" onClick={unblock} disabled={busy} className="btn-secondary shrink-0">
      {t("unblock")}
    </button>
  );
}
