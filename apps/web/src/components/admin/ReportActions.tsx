"use client";

import { useTranslations } from "next-intl";
import { getApi } from "@/lib/api";
import {
  ActionBtn,
  SuspendButton,
  TextActionButton,
  adminApiReady,
  useAdminRefresh,
} from "./action-kit";

/**
 * Report-queue actions (spec §4.5): dismiss, warn user, remove listing, suspend
 * user — plus resolve. The escalations chain two backend calls (both audit-
 * logged) and ALWAYS refresh afterwards so a partial failure can't leave the
 * table showing stale state.
 */
export function ReportActions({
  id,
  targetType,
  targetId,
  status,
}: {
  id: string;
  targetType: string;
  targetId: string;
  status: string;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const refresh = useAdminRefresh();

  if (!adminApiReady()) return <span className="text-xs text-muted">{t("apiOff")}</span>;
  if (status !== "pending" && status !== "reviewed") {
    return null;
  }
  const api = getApi()!;

  const durations = [
    { value: "1", label: t("suspend.d1") },
    { value: "7", label: t("suspend.d7") },
    { value: "30", label: t("suspend.d30") },
    { value: "", label: t("suspend.indefinite") },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ActionBtn tone="green" onClick={() => api.admin.updateReport(id, { status: "resolved" }).then(refresh)}>
        {t("actions.resolve")}
      </ActionBtn>
      <ActionBtn onClick={() => api.admin.updateReport(id, { status: "rejected" }).then(refresh)}>
        {t("actions.dismiss")}
      </ActionBtn>

      {targetType === "user" ? (
        <TextActionButton
          label={t("actions.warn")}
          title={t("warn.title")}
          placeholder={t("warn.placeholder")}
          submitLabel={t("warn.send")}
          closeLabel={tc("close")}
          onSubmit={async (body) => {
            try {
              await api.admin.messageUser(targetId, { body });
              await api.admin.updateReport(id, { status: "resolved" });
            } finally {
              refresh();
            }
          }}
        />
      ) : null}

      {targetType === "listing" ? (
        <ActionBtn
          tone="danger"
          onClick={async () => {
            try {
              await api.admin.updateListing(targetId, { status: "removed" });
              await api.admin.updateReport(id, { status: "resolved" });
            } finally {
              refresh();
            }
          }}
        >
          {t("actions.removeListing")}
        </ActionBtn>
      ) : null}

      {targetType === "user" ? (
        <SuspendButton
          label={t("actions.suspendUser")}
          labels={{
            title: t("suspend.title"),
            duration: t("suspend.duration"),
            durations,
            reason: t("suspend.reason"),
            reasonPlaceholder: t("suspend.reasonPlaceholder"),
            confirm: t("suspend.confirm"),
            close: tc("close"),
          }}
          onSubmit={async ({ suspended_until, reason }) => {
            try {
              await api.admin.updateUser(targetId, {
                is_suspended: true,
                suspended_until,
                suspension_reason: reason,
              });
              await api.admin.updateReport(id, { status: "resolved" });
            } finally {
              refresh();
            }
          }}
        />
      ) : null}
    </div>
  );
}
