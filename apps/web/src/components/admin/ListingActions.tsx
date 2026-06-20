"use client";

import { useTranslations } from "next-intl";
import type { ListingStatus } from "@swap/types";
import { getApi } from "@/lib/api";
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
}: {
  id: string;
  status: ListingStatus;
  featured: boolean;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const refresh = useAdminRefresh();

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

      <TextActionButton
        label={t("actions.requestEdits")}
        tone="navy"
        title={t("requestEdits.title")}
        placeholder={t("requestEdits.placeholder")}
        submitLabel={t("requestEdits.send")}
        closeLabel={tc("close")}
        onSubmit={(body) => api.admin.requestListingEdits(id, { body }).then(refresh)}
      />

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
