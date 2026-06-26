"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { ListingStatus } from "@swap/types";
import { getApi } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import {
  ActionBtn,
  ConfirmActionButton,
  TextActionButton,
  adminApiReady,
  useAdminRefresh,
} from "./action-kit";

/**
 * Moderation actions for a listing: approve / hide / show / remove / feature /
 * request-edits (spec §4.4). Request-edits messages the owner via the admin API.
 */
export function ListingActions({
  id,
  status,
  featured,
  ownerId,
}: {
  id: string;
  status: ListingStatus;
  featured: boolean;
  ownerId: string;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const refresh = useAdminRefresh();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id ?? null);
    });
  }, []);

  if (!adminApiReady()) return <span className="text-xs text-muted">{t("apiOff")}</span>;
  const api = getApi()!;
  const set = (patch: Parameters<typeof api.admin.updateListing>[1]) =>
    api.admin.updateListing(id, patch).then(refresh);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status !== "active" ? (
        <ActionBtn tone="green" onClick={() => set({ status: "active" })}>
          {t("actions.approve")}
        </ActionBtn>
      ) : null}

      {status === "active" ? (
        <ActionBtn onClick={() => set({ status: "hidden" })}>{t("actions.hide")}</ActionBtn>
      ) : status === "hidden" ? (
        <ActionBtn onClick={() => set({ status: "active" })}>{t("actions.show")}</ActionBtn>
      ) : null}

      <ActionBtn onClick={() => set({ is_featured: !featured })}>
        {featured ? t("actions.unfeature") : t("actions.feature")}
      </ActionBtn>

      {/* Disallow asking for edits on self-owned listings (fails with "cannot message yourself") */}
      {ownerId !== currentUserId ? (
        <TextActionButton
          label={t("actions.requestEdits")}
          tone="navy"
          title={t("requestEdits.title")}
          placeholder={t("requestEdits.placeholder")}
          submitLabel={t("requestEdits.send")}
          closeLabel={tc("close")}
          onSubmit={(body) => api.admin.requestListingEdits(id, { body }).then(refresh)}
          successMessage={t("requestEdits.success")}
        />
      ) : null}

      {status !== "removed" ? (
        <ConfirmActionButton
          label={t("actions.remove")}
          tone="danger"
          title={t("actions.remove")}
          message={t("actions.removeListing")}
          confirmLabel={t("actions.remove")}
          closeLabel={tc("cancel")}
          onConfirm={() => set({ status: "removed" })}
        />
      ) : null}
    </div>
  );
}
