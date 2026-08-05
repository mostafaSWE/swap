"use client";

import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getApi } from "@/lib/api";
import { setTermsRequester } from "@/lib/terms-gate";
import { CTAButton } from "./CTAButton";

/**
 * Terms/EULA acceptance gate (Apple 1.2 — accept the zero-tolerance agreement
 * BEFORE posting). Mounted once in the client tree; it registers itself as the
 * handler the API client calls when a write is rejected with `terms_not_accepted`.
 * On acceptance it POSTs `/me/terms` (server-stamped) and the API client retries
 * the original write. Mirrors the mobile `TermsProvider` gate. Renders nothing
 * until a gated write actually occurs.
 */
export function TermsGate() {
  const t = useTranslations("termsGate");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const resolver = useRef<((accepted: boolean) => void) | null>(null);

  useEffect(() => {
    setTermsRequester(
      () =>
        new Promise<boolean>((resolve) => {
          resolver.current = resolve;
          setError(false);
          setBusy(false);
          setOpen(true);
        }),
    );
    return () => setTermsRequester(null);
  }, []);

  function settle(accepted: boolean) {
    setOpen(false);
    const r = resolver.current;
    resolver.current = null;
    r?.(accepted);
  }

  async function accept() {
    setBusy(true);
    setError(false);
    try {
      const api = getApi();
      if (!api) throw new Error("API not configured");
      await api.acceptTerms();
      settle(true);
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <div className="animate-fade-in fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center">
      <div className="animate-slide-up max-h-[90dvh] w-full max-w-app overflow-y-auto rounded-t-card bg-surface p-6 sm:rounded-card">
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green/15">
            <ShieldCheck className="h-7 w-7 text-green" aria-hidden />
          </span>
          <h2 className="text-xl font-bold text-ink">{t("title")}</h2>
          <p className="text-ink">{t("body")}</p>
          <p className="text-sm text-muted">{t("zeroTolerance")}</p>
          <Link href="/terms" className="text-sm font-semibold text-green hover:underline">
            {t("viewTerms")}
          </Link>
          {error ? <p className="text-sm text-danger">{t("error")}</p> : null}
          <div className="mt-2 flex w-full flex-col gap-2">
            <CTAButton onClick={accept} disabled={busy}>
              {t("accept")}
            </CTAButton>
            <CTAButton variant="secondary" onClick={() => settle(false)} disabled={busy}>
              {t("decline")}
            </CTAButton>
          </div>
        </div>
      </div>
    </div>
  );
}
