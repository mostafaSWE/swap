"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useLocale } from "next-intl";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/**
 * Light / dark theme switch. Renders a neutral placeholder until mounted so the
 * server (theme-unaware) and client markup match. Persists via next-themes.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const locale = useLocale();
  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";
  const label = locale === "ar" ? (isDark ? "الوضع الفاتح" : "الوضع الداكن") : isDark ? "Light mode" : "Dark mode";

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex h-11 w-11 items-center justify-center rounded-pill border border-line bg-surface text-ink transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
        className,
      )}
    >
      {mounted ? (
        isDark ? <Sun className="h-[18px] w-[18px]" aria-hidden /> : <Moon className="h-[18px] w-[18px]" aria-hidden />
      ) : (
        <span className="h-[18px] w-[18px]" aria-hidden />
      )}
    </button>
  );
}
