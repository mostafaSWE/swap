"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { ErrorState } from "@/components/primitives";
import { Link } from "@/i18n/navigation";

/**
 * Shared recovery UI for every App Router `error.tsx` boundary. Reuses the
 * `ErrorState` primitive + the `states` i18n namespace so all boundaries look
 * the same and stay bilingual. `reset` re-renders the failed segment in place;
 * a Home link is offered as the fallback when retrying keeps failing.
 */
export function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("states");
  const tNav = useTranslations("nav");

  useEffect(() => {
    // Surface the error in dev/observability; a real logging sink would hook here.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <ErrorState
        title={t("errorTitle")}
        description={t("errorBody")}
        retryLabel={t("retry")}
        onRetry={reset}
      />
      <Link
        href="/"
        className="mt-1 text-sm font-semibold text-ink underline underline-offset-4 hover:text-danger"
      >
        {tNav("home")}
      </Link>
    </div>
  );
}
