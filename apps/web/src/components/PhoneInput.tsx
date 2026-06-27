"use client";

import { forwardRef } from "react";
import { COUNTRIES } from "@swap/config";
import { cn } from "@/lib/utils";
import { FieldError, FieldLabel } from "./forms";

// Active countries (from the shared countries DB) → dial-code options, in sort order.
const DIAL_OPTIONS = COUNTRIES.filter((c) => c.is_active).sort((a, b) => a.sort_order - b.sort_order);

/** "SA" → 🇸🇦 (degrades to the two letters on platforms without flag emoji, e.g. Windows). */
function flagEmoji(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/[A-Z]/g, (ch) => String.fromCodePoint(0x1f1e6 + ch.charCodeAt(0) - 65));
}

/**
 * Phone field with an integrated country dial-code dropdown (sourced from the
 * countries DB). The user picks their code and types only the local number, so we
 * always know the country and never double-prefix. Forwards its ref + spreads props
 * onto the number `<input>` so it works with react-hook-form's register().
 */
export const PhoneInput = forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & {
    label?: string;
    hint?: string;
    error?: string;
    dialCode: string;
    onDialCodeChange: (code: string) => void;
  }
>(function PhoneInput({ label, hint, error, dialCode, onDialCodeChange, className, ...props }, ref) {
  return (
    <label className="block">
      {label ? <FieldLabel label={label} hint={hint} /> : null}
      {/* Numbers + dial code are LTR even on the RTL (Arabic) form. */}
      <span className="flex gap-2" dir="ltr">
        <select
          value={dialCode}
          onChange={(e) => onDialCodeChange(e.target.value)}
          aria-label="Country dialing code"
          className="input-field w-auto shrink-0 bg-field px-2 font-semibold text-ink"
        >
          {DIAL_OPTIONS.map((c) => (
            <option key={c.id} value={c.phone_code}>
              {flagEmoji(c.iso_code)} {c.phone_code}
            </option>
          ))}
        </select>
        <input
          ref={ref}
          type="tel"
          inputMode="tel"
          aria-invalid={error ? true : undefined}
          className={cn("input-field flex-1", className)}
          {...props}
        />
      </span>
      <FieldError error={error} />
    </label>
  );
});
