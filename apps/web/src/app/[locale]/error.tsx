"use client";

import { RouteError } from "@/components/RouteError";

/**
 * Catch-all error boundary for everything under a locale. Lives inside the
 * locale layout, so the i18n provider + RTL/LTR direction are already in scope.
 */
export default function LocaleError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteError {...props} />;
}
