"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { getApi, isApiConfigured } from "@/lib/api";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

function ActionBtn({
  onClick,
  children,
  tone = "default",
}: {
  onClick: () => Promise<void>;
  children: React.ReactNode;
  tone?: "default" | "green" | "danger";
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await onClick();
        } finally {
          setBusy(false);
        }
      }}
      className={cn(
        "rounded-pill px-3 py-1 text-xs font-semibold transition-colors active:scale-95 disabled:opacity-50",
        tone === "green" && "bg-green-light text-green-dark hover:bg-green hover:text-white",
        tone === "danger" && "bg-red-100 text-red-700 hover:bg-red-600 hover:text-white",
        tone === "default" && "border border-line text-ink hover:bg-canvas",
      )}
    >
      {busy ? "…" : children}
    </button>
  );
}

/**
 * Admin row actions. Calls the backend API (admin endpoints) which performs the
 * privileged writes + logs to admin_actions. Requires NEXT_PUBLIC_API_URL and an
 * admin session; otherwise the actions are hidden (read-only table).
 */
export function AdminActions({
  kind,
  id,
  state,
}: {
  kind: "user" | "listing" | "report" | "verification";
  id: string;
  state?: { verified?: boolean; suspended?: boolean; hidden?: boolean };
}) {
  const t = useTranslations("admin");
  const router = useRouter();

  if (!isApiConfigured()) {
    return <span className="text-xs text-muted">API off</span>;
  }
  const api = getApi()!;
  const refresh = () => router.refresh();

  if (kind === "user") {
    return (
      <div className="flex gap-1">
        <ActionBtn tone="green" onClick={() => api.admin.updateUser(id, { is_verified: !state?.verified }).then(refresh)}>
          {state?.verified ? "Unverify" : "Verify"}
        </ActionBtn>
        <ActionBtn tone="danger" onClick={() => api.admin.updateUser(id, { is_suspended: !state?.suspended }).then(refresh)}>
          {state?.suspended ? "Unsuspend" : "Suspend"}
        </ActionBtn>
      </div>
    );
  }

  if (kind === "listing") {
    return (
      <div className="flex gap-1">
        <ActionBtn onClick={() => api.admin.updateListing(id, { status: state?.hidden ? "active" : "hidden" }).then(refresh)}>
          {state?.hidden ? "Show" : "Hide"}
        </ActionBtn>
        <ActionBtn tone="green" onClick={() => api.admin.updateListing(id, { is_verified_item: true }).then(refresh)}>
          {t("verifications")}
        </ActionBtn>
      </div>
    );
  }

  if (kind === "report") {
    return (
      <div className="flex gap-1">
        <ActionBtn tone="green" onClick={() => api.admin.updateReport(id, { status: "resolved" }).then(refresh)}>
          Resolve
        </ActionBtn>
        <ActionBtn tone="danger" onClick={() => api.admin.updateReport(id, { status: "rejected" }).then(refresh)}>
          Reject
        </ActionBtn>
      </div>
    );
  }

  // verification
  return (
    <div className="flex gap-1">
      <ActionBtn tone="green" onClick={() => api.admin.updateVerification(id, { status: "approved" }).then(refresh)}>
        Approve
      </ActionBtn>
      <ActionBtn tone="danger" onClick={() => api.admin.updateVerification(id, { status: "rejected" }).then(refresh)}>
        Reject
      </ActionBtn>
    </div>
  );
}
