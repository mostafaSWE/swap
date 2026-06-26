"use client";

import { forwardRef, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { FieldError, FieldLabel } from "./forms";

/**
 * Password field with a show/hide toggle. Drop-in for {@link FormInput} on
 * password inputs — forwards its ref and spreads props onto the `<input>`, so it
 * works with `react-hook-form`'s `register()`. The `type` is owned internally and
 * cannot be overridden.
 */
export const PasswordInput = forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
    label?: string;
    hint?: string;
    error?: string;
  }
>(function PasswordInput({ label, hint, error, className, ...props }, ref) {
  const t = useTranslations("auth");
  const [show, setShow] = useState(false);

  return (
    <label className="block">
      {label ? <FieldLabel label={label} hint={hint} /> : null}
      <span className="relative block">
        <input
          ref={ref}
          type={show ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          className={cn("input-field pe-11", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? t("hidePassword") : t("showPassword")}
          aria-pressed={show}
          className="absolute inset-y-0 end-0 flex w-11 items-center justify-center rounded-e-xl text-muted transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50"
        >
          {show ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
        </button>
      </span>
      <FieldError error={error} />
    </label>
  );
});
