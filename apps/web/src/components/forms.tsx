import { forwardRef } from "react";
import { cn } from "@/lib/utils";

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <span className="mb-1.5 flex items-baseline justify-between">
      <span className="text-sm font-semibold text-ink">{label}</span>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </span>
  );
}

function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <span className="mt-1 block text-xs text-danger">{error}</span>;
}

export const FormInput = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string }
>(function FormInput({ label, hint, error, className, ...props }, ref) {
  return (
    <label className="block">
      {label ? <FieldLabel label={label} hint={hint} /> : null}
      <input ref={ref} className={cn("input-field", error && "border-danger", className)} {...props} />
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
        className={cn("input-field min-h-24 resize-y", error && "border-danger", className)}
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
>(function SelectInput({ label, error, options, placeholder, className, ...props }, ref) {
  return (
    <label className="block">
      {label ? <FieldLabel label={label} /> : null}
      <select
        ref={ref}
        className={cn("input-field appearance-none bg-white", error && "border-danger", className)}
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
      <FieldError error={error} />
    </label>
  );
});
