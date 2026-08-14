"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, CheckCircle2, LogIn, Mail, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { SwapApiError } from "@swap/api";
import { accountDeletionRequestSchema, type AccountDeletionRequestInput } from "@swap/validation";
import { getApi } from "@/lib/api";
import { isAdminSelfDeleteError } from "@/lib/api-errors";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";
import { CTAButton } from "@/components/CTAButton";
import { FormAlert, FormCheckbox, FormInput, FormTextarea } from "@/components/forms";

/** Grace period so the confirmation is readable before we drop them on the homepage. */
const HOME_REDIRECT_MS = 6000;

/**
 * The two audiences of the public deletion route (Google Play User Data policy):
 * someone who can still sign in deletes immediately; someone locked out sends a
 * request we action within 30 days. Which panel renders is decided on the server
 * from the session — the page itself is always public.
 */
export function DeleteAccountPanel({
  isAuthenticated,
  email,
}: {
  isAuthenticated: boolean;
  email: string | null;
}) {
  return isAuthenticated ? <SignedInDelete email={email} /> : <SignedOutRequest />;
}

const dangerButton =
  "inline-flex items-center justify-center gap-2 rounded-pill bg-danger px-5 py-3 font-semibold text-white " +
  "transition-all hover:bg-danger/90 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 " +
  "focus-visible:ring-danger/50 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas " +
  "disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100";

/* ─────────────────────────── Signed in: delete now ─────────────────────────── */

/** Drops the local Supabase session. Deliberately never throws: by the time this
 *  runs the account is already gone server-side, so a failed sign-out must not be
 *  reported to the user as a failed deletion. */
async function signOutLocally(): Promise<void> {
  try {
    await createClient().auth.signOut();
  } catch (err) {
    console.error(err);
  }
}

function SignedInDelete({ email }: { email: string | null }) {
  const t = useTranslations("deleteAccount.confirm");
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // The session is dead the moment the account is purged, so send them home
  // rather than leaving them on a page that can no longer do anything.
  useEffect(() => {
    if (state !== "done") return;
    const timer = setTimeout(() => {
      router.replace("/");
      router.refresh();
    }, HOME_REDIRECT_MS);
    return () => clearTimeout(timer);
  }, [state, router]);

  async function submit() {
    if (!acknowledged || state === "saving") return;
    setError(null);
    const api = getApi();
    if (!api) {
      setState("error");
      setError(t("unavailable"));
      return;
    }
    setState("saving");
    try {
      await api.deleteAccount({ confirm: true, reason: reason.trim() || undefined });
      // Drop the local session too — the credentials it carries no longer exist.
      await signOutLocally();
      // NOTE: no router.refresh() here. Refreshing re-renders this page's server
      // component, which would now see no session and swap the confirmation for the
      // signed-out request form. The refresh happens with the redirect below instead.
      setState("done");
    } catch (err) {
      // 401 (the session no longer authenticates) and 404 (no profile behind it)
      // both mean the account is ALREADY gone — e.g. the delete succeeded server-side
      // but the response never made it back. That is the success state, not an error.
      if (err instanceof SwapApiError && (err.status === 401 || err.status === 404)) {
        await signOutLocally();
        setState("done");
        return;
      }
      console.error(err);
      setState("error");
      // An admin self-delete is refused permanently (403 admin_cannot_self_delete),
      // so "please try again" would be a lie — say what actually needs to happen.
      setError(isAdminSelfDeleteError(err) ? t("adminError") : t("error"));
    }
  }

  if (state === "done") {
    return (
      <SuccessCard title={t("doneTitle")} body={t("doneBody")}>
        <CTAButton href="/" className="!w-auto shrink-0 !px-5 !py-2.5 text-sm">
          {t("doneCta")}
        </CTAButton>
      </SuccessCard>
    );
  }

  return (
    <section
      aria-labelledby="delete-confirm-title"
      className="overflow-hidden rounded-card border border-danger/30 bg-surface p-6 shadow-card md:p-8"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <AlertTriangle className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 id="delete-confirm-title" className="text-xl font-bold tracking-tight text-ink md:text-2xl">
            {t("title")}
          </h2>
          <p className="mt-2 text-base leading-7 text-muted">{t("body")}</p>
          {email ? (
            <p className="mt-3 text-sm text-muted">
              {t("signedInAs")} <span className="font-bold text-ink">{email}</span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 space-y-4">
        <FormTextarea
          label={t("reasonLabel")}
          hint={t("reasonHint")}
          placeholder={t("reasonPlaceholder")}
          maxLength={500}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />

        <FormCheckbox
          label={t("acknowledge")}
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
        />

        {error ? <FormAlert>{error}</FormAlert> : null}

        <button type="button" onClick={submit} disabled={!acknowledged || state === "saving"} className={dangerButton}>
          <Trash2 className="h-4 w-4" aria-hidden />
          {state === "saving" ? t("working") : t("button")}
        </button>
      </div>
    </section>
  );
}

/* ────────────────────── Signed out: request by email ────────────────────── */

function SignedOutRequest() {
  const t = useTranslations("deleteAccount.request");
  const th = useTranslations("deleteAccount.signedInHint");
  const [state, setState] = useState<"idle" | "error" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting, errors },
  } = useForm<AccountDeletionRequestInput>({
    resolver: zodResolver(accountDeletionRequestSchema),
    defaultValues: { email: "", username: "", reason: "" },
  });

  async function onSubmit(values: AccountDeletionRequestInput) {
    setError(null);
    const api = getApi();
    if (!api) {
      setState("error");
      setError(t("unavailable"));
      return;
    }
    try {
      await api.requestAccountDeletion({
        email: values.email.trim(),
        username: values.username?.trim() || undefined,
        reason: values.reason?.trim() || undefined,
      });
      // Deliberately identical whether or not the address has an account —
      // this response must never disclose who is registered.
      setState("done");
    } catch (err) {
      console.error(err);
      setState("error");
      setError(t("error"));
    }
  }

  if (state === "done") {
    return <SuccessCard title={t("doneTitle")} body={t("doneBody")} note={t("doneNote")} />;
  }

  return (
    <div className="space-y-4">
      <section
        aria-labelledby="delete-request-title"
        className="overflow-hidden rounded-card border border-line bg-surface p-6 shadow-card md:p-8"
      >
        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
            <Mail className="h-6 w-6" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 id="delete-request-title" className="text-xl font-bold tracking-tight text-ink md:text-2xl">
              {t("title")}
            </h2>
            <p className="mt-2 text-base leading-7 text-muted">{t("body")}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          <FormInput
            type="email"
            inputMode="email"
            autoComplete="email"
            label={t("emailLabel")}
            placeholder={t("emailPlaceholder")}
            error={errors.email && t("emailError")}
            {...register("email")}
          />
          <FormInput
            label={t("usernameLabel")}
            hint={t("optional")}
            placeholder={t("usernamePlaceholder")}
            maxLength={30}
            error={errors.username && t("usernameError")}
            {...register("username")}
          />
          <FormTextarea
            label={t("reasonLabel")}
            hint={t("optional")}
            placeholder={t("reasonPlaceholder")}
            maxLength={1000}
            error={errors.reason && t("reasonError")}
            {...register("reason")}
          />

          {error ? <FormAlert>{error}</FormAlert> : null}

          <p className="text-sm leading-6 text-muted">{t("privacyNote")}</p>

          <CTAButton type="submit" disabled={isSubmitting} className="w-full sm:!w-auto">
            <Trash2 className="h-4 w-4" aria-hidden />
            {isSubmitting ? t("working") : t("button")}
          </CTAButton>
        </form>
      </section>

      <aside className="rounded-card border border-line bg-elevated p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-ink">
          <LogIn className="rtl-flip h-4 w-4 text-accent" aria-hidden />
          {th("title")}
        </h2>
        <p className="mt-1.5 text-sm leading-6 text-muted">{th("body")}</p>
        <CTAButton href="/login" variant="secondary" className="mt-3 !w-auto !px-5 !py-2.5 text-sm">
          {th("cta")}
        </CTAButton>
      </aside>
    </div>
  );
}

/* ─────────────────────────────── Shared ─────────────────────────────── */

function SuccessCard({
  title,
  body,
  note,
  children,
}: {
  title: string;
  body: string;
  note?: string;
  children?: React.ReactNode;
}) {
  return (
    <section
      role="status"
      className="overflow-hidden rounded-card border border-accent/25 bg-accent-soft p-6 shadow-card md:p-8"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <CheckCircle2 className="h-6 w-6" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-xl font-bold tracking-tight text-ink md:text-2xl">{title}</h2>
          <p className="mt-2 text-base leading-7 text-muted">{body}</p>
          {note ? <p className="mt-2 text-sm leading-6 text-muted">{note}</p> : null}
          {children ? <div className="mt-4">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
