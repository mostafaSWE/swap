"use client";

/**
 * Shared building blocks for admin moderation actions. Every privileged write
 * goes through the backend API (which logs to admin_actions); these components
 * just wrap the call with busy state, a confirmation/text dialog where needed,
 * and a router.refresh() so the server-rendered table reflects the change.
 */
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { getApi, isApiConfigured } from "@/lib/api";
import { Sheet } from "@/components/Sheet";
import { FormTextarea, SelectInput } from "@/components/forms";
import { cn } from "@/lib/utils";

/** Shared inline error shown in a dialog when a moderation write fails. */
function DialogError({ show }: { show: boolean }) {
  const tc = useTranslations("common");
  if (!show) return null;
  return (
    <p role="alert" className="text-sm text-danger">
      {tc("error")}
    </p>
  );
}

const DAY_MS = 86_400_000;

export type Tone = "default" | "green" | "danger" | "navy";

const TONE: Record<Tone, string> = {
  default: "border border-linestrong text-ink hover:bg-elevated",
  green: "bg-green-light text-green-dark hover:bg-accent hover:text-white",
  danger: "bg-red-100 text-red-700 hover:bg-red-600 hover:text-white dark:bg-red-500/15 dark:text-red-300",
  navy: "bg-elevated text-ink border border-linestrong hover:border-line",
};

/** True when the backend API is available (actions are hidden otherwise). */
export function adminApiReady(): boolean {
  return isApiConfigured();
}

export function useAdminRefresh() {
  const router = useRouter();
  return () => router.refresh();
}

/** Inline async action button with a busy state. */
export function ActionBtn({
  onClick,
  tone = "default",
  disabled,
  children,
}: {
  onClick: () => Promise<unknown>;
  tone?: Tone;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy || disabled}
      onClick={async () => {
        setBusy(true);
        try {
          await onClick();
        } catch (e) {
          console.error("[admin] action failed:", e);
        } finally {
          setBusy(false);
        }
      }}
      className={cn(
        "rounded-pill px-3 py-1 text-xs font-semibold transition-colors active:scale-95 disabled:opacity-50",
        TONE[tone],
      )}
    >
      {busy ? "…" : children}
    </button>
  );
}

/** A button that opens a confirm dialog before running the action. */
export function ConfirmActionButton({
  label,
  tone = "default",
  title,
  message,
  confirmLabel,
  closeLabel,
  onConfirm,
}: {
  label: React.ReactNode;
  tone?: Tone;
  title: string;
  message: string;
  confirmLabel: string;
  closeLabel: string;
  onConfirm: () => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const close = () => {
    setOpen(false);
    setFailed(false);
  };
  return (
    <>
      <ActionBtn tone={tone} onClick={async () => setOpen(true)}>
        {label}
      </ActionBtn>
      {open ? (
        <Sheet title={title} onClose={close} closeLabel={closeLabel}>
          <div className="space-y-4 p-5">
            <p className="text-sm text-muted">{message}</p>
            <DialogError show={failed} />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-pill border border-linestrong px-4 py-2 text-sm font-semibold text-ink hover:bg-elevated"
              >
                {closeLabel}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setFailed(false);
                  try {
                    await onConfirm();
                    close();
                  } catch (e) {
                    console.error("[admin] confirm action failed:", e);
                    setFailed(true);
                  } finally {
                    setBusy(false);
                  }
                }}
                className={cn(
                  "rounded-pill px-4 py-2 text-sm font-semibold disabled:opacity-50",
                  tone === "danger" ? "bg-danger text-white" : "bg-accent text-white hover:bg-accent-hover",
                )}
              >
                {busy ? "…" : confirmLabel}
              </button>
            </div>
          </div>
        </Sheet>
      ) : null}
    </>
  );
}

/** A button that opens a textarea dialog and submits its content. */
export function TextActionButton({
  label,
  tone = "default",
  title,
  placeholder,
  submitLabel,
  closeLabel,
  onSubmit,
  successMessage,
}: {
  label: React.ReactNode;
  tone?: Tone;
  title: string;
  placeholder: string;
  submitLabel: string;
  closeLabel: string;
  onSubmit: (text: string) => Promise<unknown>;
  successMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [success, setSuccess] = useState(false);
  const close = () => {
    setOpen(false);
    setFailed(false);
    setSuccess(false);
  };
  return (
    <>
      <ActionBtn tone={tone} onClick={async () => setOpen(true)}>
        {label}
      </ActionBtn>
      {open ? (
        <Sheet title={title} onClose={close} closeLabel={closeLabel}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (success || !text.trim()) return;
              setBusy(true);
              setFailed(false);
              try {
                await onSubmit(text.trim());
                setText("");
                if (successMessage) {
                  setSuccess(true);
                  setTimeout(() => {
                    close();
                  }, 1500);
                } else {
                  close();
                }
              } catch (err) {
                console.error("[admin] text action failed:", err);
                setFailed(true);
              } finally {
                setBusy(false);
              }
            }}
            className="space-y-4 p-5"
          >
            <FormTextarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={placeholder}
              autoFocus
              maxLength={2000}
              disabled={success}
            />
            {success && successMessage && (
              <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-950/20 dark:text-green-300 border border-green-200 dark:border-green-800/30 flex items-center gap-2">
                <svg className="h-5 w-5 flex-shrink-0 text-green-600 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{successMessage}</span>
              </div>
            )}
            <DialogError show={failed} />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy || !text.trim() || success}
                className="rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {busy ? "…" : submitLabel}
              </button>
            </div>
          </form>
        </Sheet>
      ) : null}
    </>
  );
}

/** Suspend button → dialog with a duration + reason; emits the computed window. */
export function SuspendButton({
  label,
  tone = "danger",
  labels,
  onSubmit,
}: {
  label: React.ReactNode;
  tone?: Tone;
  labels: {
    title: string;
    duration: string;
    durations: { value: string; label: string }[];
    reason: string;
    reasonPlaceholder: string;
    confirm: string;
    close: string;
  };
  onSubmit: (args: { suspended_until: string | null; reason: string | null }) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(labels.durations[0]?.value ?? "7");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const close = () => {
    setOpen(false);
    setFailed(false);
  };

  return (
    <>
      <ActionBtn tone={tone} onClick={async () => setOpen(true)}>
        {label}
      </ActionBtn>
      {open ? (
        <Sheet title={labels.title} onClose={close} closeLabel={labels.close}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setFailed(false);
              try {
                const suspended_until = days
                  ? new Date(Date.now() + Number(days) * DAY_MS).toISOString()
                  : null;
                await onSubmit({ suspended_until, reason: reason.trim() || null });
                close();
              } catch (err) {
                console.error("[admin] suspend failed:", err);
                setFailed(true);
              } finally {
                setBusy(false);
              }
            }}
            className="space-y-4 p-5"
          >
            <SelectInput
              label={labels.duration}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              options={labels.durations}
            />
            <FormTextarea
              label={labels.reason}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={labels.reasonPlaceholder}
              maxLength={500}
            />
            <DialogError show={failed} />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="rounded-pill bg-danger px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {busy ? "…" : labels.confirm}
              </button>
            </div>
          </form>
        </Sheet>
      ) : null}
    </>
  );
}
