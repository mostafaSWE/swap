"use client";

import { useTranslations } from "next-intl";
import { getApi } from "@/lib/api";
import {
  ActionBtn,
  ConfirmActionButton,
  SuspendButton,
  TextActionButton,
  adminApiReady,
  useAdminRefresh,
} from "./action-kit";

/**
 * Moderation actions for a single user. `row` shows the compact set (suspend /
 * ban); `detail` adds private note + system message. All calls hit the backend
 * admin API (audit-logged); the table refreshes on success.
 */
export function UserActions({
  id,
  suspended,
  banned,
  variant = "row",
}: {
  id: string;
  suspended: boolean;
  banned: boolean;
  variant?: "row" | "detail";
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const refresh = useAdminRefresh();

  if (!adminApiReady()) return <span className="text-xs text-muted">{t("apiOff")}</span>;
  const api = getApi()!;

  const durations = [
    { value: "1", label: t("suspend.d1") },
    { value: "7", label: t("suspend.d7") },
    { value: "30", label: t("suspend.d30") },
    { value: "", label: t("suspend.indefinite") },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {suspended ? (
        <ActionBtn
          onClick={() =>
            api.admin
              .updateUser(id, { is_suspended: false, suspended_until: null, suspension_reason: null })
              .then(refresh)
          }
        >
          {t("actions.unsuspend")}
        </ActionBtn>
      ) : (
        <SuspendButton
          label={t("actions.suspend")}
          labels={{
            title: t("suspend.title"),
            duration: t("suspend.duration"),
            durations,
            reason: t("suspend.reason"),
            reasonPlaceholder: t("suspend.reasonPlaceholder"),
            confirm: t("suspend.confirm"),
            close: tc("close"),
          }}
          onSubmit={({ suspended_until, reason }) =>
            api.admin
              .updateUser(id, { is_suspended: true, suspended_until, suspension_reason: reason })
              .then(refresh)
          }
        />
      )}

      {banned ? (
        <ConfirmActionButton
          label={t("actions.unban")}
          title={t("actions.unban")}
          message={t("ban.unbanConfirm")}
          confirmLabel={t("actions.unban")}
          closeLabel={tc("cancel")}
          onConfirm={() => api.admin.updateUser(id, { is_banned: false }).then(refresh)}
        />
      ) : (
        <ConfirmActionButton
          label={t("actions.ban")}
          tone="danger"
          title={t("actions.ban")}
          message={t("ban.confirm")}
          confirmLabel={t("actions.ban")}
          closeLabel={tc("cancel")}
          onConfirm={() => api.admin.updateUser(id, { is_banned: true }).then(refresh)}
        />
      )}

      {variant === "detail" ? (
        <>
          <TextActionButton
            label={t("actions.note")}
            title={t("note.title")}
            placeholder={t("note.placeholder")}
            submitLabel={t("note.save")}
            closeLabel={tc("close")}
            onSubmit={(note) => api.admin.addUserNote(id, { note }).then(refresh)}
          />
          <TextActionButton
            label={t("actions.message")}
            tone="navy"
            title={t("message.title")}
            placeholder={t("message.placeholder")}
            submitLabel={t("message.send")}
            closeLabel={tc("close")}
            onSubmit={(body) => api.admin.messageUser(id, { body }).then(refresh)}
          />
        </>
      ) : null}
    </div>
  );
}
