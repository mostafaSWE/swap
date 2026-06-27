"use client";

import { Check } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/** Hard requirements the password MUST meet (mirrored by RegisterForm validation). */
export const PASSWORD_RULES = [
  { key: "reqMinLength", test: (p: string) => p.length >= 8 },
  { key: "reqLetter", test: (p: string) => /[A-Za-z]/.test(p) },
  { key: "reqNumber", test: (p: string) => /\d/.test(p) },
] as const;

/** True when the password satisfies every hard requirement. */
export function passwordMeetsRules(p: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(p));
}

/** 0–4 strength score (separate from the hard requirements — rewards length + variety). */
function strengthScore(p: string): number {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 4);
}

/** Strength meter (4 segments + label) and the live requirements checklist. */
export function PasswordStrength({ value }: { value: string }) {
  const t = useTranslations("auth");
  const score = strengthScore(value);
  const labels = ["", t("strengthWeak"), t("strengthFair"), t("strengthGood"), t("strengthStrong")];
  const fill = ["bg-line", "bg-danger", "bg-warning", "bg-accent", "bg-success"][score];

  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <span className="flex flex-1 gap-1" aria-hidden>
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={cn("h-1.5 flex-1 rounded-full transition-colors", i <= score ? fill : "bg-line")}
            />
          ))}
        </span>
        {value ? <span className="w-12 text-end text-xs font-semibold text-muted">{labels[score]}</span> : null}
      </div>
      <span className="sr-only" role="status">
        {t("strength")}: {labels[score] || labels[1]}
      </span>
      <ul className="space-y-1">
        {PASSWORD_RULES.map((r) => {
          const ok = r.test(value);
          return (
            <li
              key={r.key}
              className={cn("flex items-center gap-1.5 text-xs", ok ? "text-success" : "text-faint")}
            >
              <Check className={cn("h-3.5 w-3.5 shrink-0", ok ? "opacity-100" : "opacity-40")} aria-hidden />
              {t(r.key)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
