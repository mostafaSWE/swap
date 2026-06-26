"use client";

import { useEffect } from "react";

/**
 * Root error boundary — catches failures in the locale layout itself, so it has
 * no i18n context and must render its own <html>/<body>. Kept dependency-free
 * (inline styles + bilingual copy using the brand tokens) so it still renders
 * even when the app shell is the thing that broke. Defaults to the app's primary
 * locale (Arabic, RTL); the English lines are tagged lang="en"/dir="ltr" so
 * screen readers announce each language correctly.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // This is the last-resort boundary — make sure the failure is surfaced.
    console.error(error);
  }, [error]);

  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, -apple-system, sans-serif",
          background: "#0A0E1A",
          color: "#E9EDF6",
        }}
      >
        <main
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.75rem",
            padding: "1.5rem",
            textAlign: "center",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700, margin: 0 }}>
            <span>حدث خطأ ما</span>
            <span lang="en" dir="ltr" style={{ display: "block" }}>
              Something went wrong
            </span>
          </h1>
          <p style={{ maxWidth: "28rem", margin: 0, color: "#97A1B7" }}>
            <span>تعذّر تحميل التطبيق. حاول مجدداً.</span>
            <span lang="en" dir="ltr" style={{ display: "block" }}>
              We couldn’t load the app. Please try again.
            </span>
          </p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              marginTop: "0.5rem",
              padding: "0.625rem 1.25rem",
              borderRadius: "9999px",
              border: "none",
              background: "#18B66A",
              color: "#ffffff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <span>إعادة المحاولة</span>
            <span aria-hidden="true"> · </span>
            <span lang="en" dir="ltr">
              Try again
            </span>
          </button>
        </main>
      </body>
    </html>
  );
}
