"use client";

import { forwardRef, useState, useRef, useEffect } from "react";
import { AlertCircle, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {hint ? (
        <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-medium text-muted">{hint}</span>
      ) : null}
    </span>
  );
}

export function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  // Pair the colour with an icon + text so errors never rely on colour alone.
  return (
    <span className="mt-1.5 flex items-center gap-1 text-xs font-medium text-danger">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {error}
    </span>
  );
}

/** Form-level error banner: icon + border + fill, so it reads without colour. */
export function FormAlert({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-3 py-2.5 text-sm font-medium text-danger"
    >
      <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/**
 * Groups related fields under a subtle, accessible section heading (`fieldset` +
 * `legend`). Used to break the signup form into Personal / Contact / Location /
 * Security so a long form scans as a few short ones.
 */
export function FormSection({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn("m-0 border-0 p-0", className)}>
      <legend className="mb-3 flex w-full items-center gap-3 p-0 text-xs font-semibold uppercase tracking-wide text-faint">
        <span>{title}</span>
        <span aria-hidden className="h-px flex-1 bg-line" />
      </legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

export const FormInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string }
>(function FormInput({ label, hint, error, className, ...props }, ref) {
  return (
    <label className="block">
      {label ? <FieldLabel label={label} hint={hint} /> : null}
      <input ref={ref} aria-invalid={error ? true : undefined} className={cn("input-field", className)} {...props} />
      <FieldError error={error} />
    </label>
  );
});

export const FormTextarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; hint?: string; error?: string }
>(function FormTextarea({ label, hint, error, className, ...props }, ref) {
  return (
    <label className="block">
      {label ? <FieldLabel label={label} hint={hint} /> : null}
      <textarea
        ref={ref}
        aria-invalid={error ? true : undefined}
        className={cn("input-field min-h-24 resize-y", className)}
        {...props}
      />
      <FieldError error={error} />
    </label>
  );
});

export interface SelectOption {
  value: string;
  label: string;
}

export const SelectInput = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & {
    label?: string;
    error?: string;
    options: SelectOption[];
    placeholder?: string;
  }
>(function SelectInput({ label, error, options, placeholder, className, value, defaultValue, onChange, disabled, ...props }, ref) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState((value ?? defaultValue ?? "") as string);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectRef = useRef<HTMLSelectElement | null>(null);

  // Sync with value prop changes
  useEffect(() => {
    if (value !== undefined) {
      setSelectedValue(value as string);
    }
  }, [value]);

  // Sync with native select changes (uncontrolled)
  useEffect(() => {
    const selectEl = selectRef.current;
    if (!selectEl) return;

    function handleNativeChange() {
      if (selectEl) {
        setSelectedValue(selectEl.value);
      }
    }

    selectEl.addEventListener("change", handleNativeChange);
    return () => selectEl.removeEventListener("change", handleNativeChange);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleOptionClick(optValue: string) {
    if (disabled) return;

    const selectEl = selectRef.current;
    if (selectEl) {
      const nativeSelectValueSetter = Object.getOwnPropertyDescriptor(
        HTMLSelectElement.prototype,
        "value"
      )?.set;
      if (nativeSelectValueSetter) {
        nativeSelectValueSetter.call(selectEl, optValue);
      } else {
        selectEl.value = optValue;
      }
      selectEl.dispatchEvent(new Event("change", { bubbles: true }));
    }
    setIsOpen(false);
  }

  const selectedOption = options.find((o) => o.value === selectedValue);
  const displayLabel = selectedOption
    ? selectedOption.label
    : placeholder ?? (options[0]?.label || "");

  return (
    <label className="block">
      {label ? <FieldLabel label={label} /> : null}
      <div className="relative" ref={containerRef}>
        {/* Hidden native select keeps HTML Form & validation logic working */}
        <select
          ref={(node) => {
            selectRef.current = node;
            if (typeof ref === "function") ref(node);
            else if (ref) ref.current = node;
          }}
          value={value}
          defaultValue={defaultValue}
          onChange={onChange}
          disabled={disabled}
          className="sr-only"
          {...props}
        >
          {placeholder ? (
            <option value="" disabled>
              {placeholder}
            </option>
          ) : null}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Visual Custom Toggle Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className={cn(
            "input-field flex items-center justify-between text-start cursor-pointer w-full bg-field px-4 py-3 select-none pr-10 rtl:pl-10 rtl:pr-4",
            disabled && "opacity-50 cursor-not-allowed bg-elevated",
            error && "border-danger",
            className,
          )}
        >
          <span className="truncate text-ink font-semibold">{displayLabel}</span>
          <ChevronDown className={cn("h-4 w-4 text-muted shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
        </button>

        {/* Visual Styled Options List Popover */}
        {isOpen && !disabled && (
          <div className="absolute z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-line bg-surface py-1 shadow-elevated focus:outline-none scrollbar-thin">
            {placeholder && (
              <button
                type="button"
                onClick={() => handleOptionClick("")}
                className="w-full px-4 py-2.5 text-start text-sm text-muted hover:bg-canvas transition-colors"
              >
                {placeholder}
              </button>
            )}
            {options.map((o) => {
              const isSelected = o.value === selectedValue;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => handleOptionClick(o.value)}
                  className={cn(
                    "w-full px-4 py-2.5 text-start text-sm text-ink transition-colors hover:bg-canvas flex items-center justify-between",
                    isSelected && "bg-accent-soft text-accent font-bold hover:bg-accent-soft",
                  )}
                >
                  <span className="truncate">{o.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <FieldError error={error} />
    </label>
  );
});
export const FormCheckbox = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string }
>(function FormCheckbox({ label, hint, error, className, ...props }, ref) {
  return (
    <div className="block">
      <label className="flex items-start gap-2.5 cursor-pointer">
        <input
          type="checkbox"
          ref={ref}
          aria-invalid={error ? true : undefined}
          className={cn(
            "mt-0.5 h-4 w-4 rounded border-linestrong text-accent focus:ring-accent/25 focus:ring-2",
            className
          )}
          {...props}
        />
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-ink leading-tight">{label}</span>
          {hint ? <span className="mt-1 text-[11px] text-muted">{hint}</span> : null}
        </div>
      </label>
      <FieldError error={error} />
    </div>
  );
});
