"use client";

/**
 * URL-driven table controls for the admin queues. State lives in the query
 * string so the server components can read it, pages are deep-linkable, and the
 * back button works. All navigation goes through next-intl's locale-aware
 * router/Link so the language prefix is preserved.
 */
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

function useQueryString() {
  const sp = useSearchParams();
  return (updates: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "") p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    return s ? `?${s}` : "";
  };
}

/** Filter / sort pills. The active option is highlighted; selecting one resets paging. */
export function UrlTabs({
  paramName,
  value,
  options,
}: {
  paramName: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  const pathname = usePathname();
  const buildQs = useQueryString();
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Link
            key={o.value}
            href={`${pathname}${buildQs({ [paramName]: o.value, page: null })}`}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-pill px-3 py-1.5 text-sm font-medium transition-colors",
              active ? "bg-accent text-white" : "border border-linestrong text-ink hover:bg-elevated",
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

/** Debounce-free search box: submits on Enter / button; clear resets it. Resets paging. */
export function UrlSearch({
  paramName = "search",
  placeholder,
  initial = "",
}: {
  paramName?: string;
  placeholder: string;
  initial?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const buildQs = useQueryString();
  const [term, setTerm] = useState(initial);

  const submit = (value: string) => {
    router.push(`${pathname}${buildQs({ [paramName]: value.trim() || null, page: null })}`);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(term);
      }}
      className="relative w-full max-w-sm"
    >
      <Search
        className="pointer-events-none absolute inset-y-0 my-auto h-4 w-4 text-muted ltr:left-3 rtl:right-3"
        aria-hidden
      />
      <input
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input-field w-full ltr:pl-9 rtl:pr-9"
      />
      {term ? (
        <button
          type="button"
          onClick={() => {
            setTerm("");
            submit("");
          }}
          aria-label={placeholder}
          className="absolute inset-y-0 my-auto flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-elevated ltr:right-2 rtl:left-2"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </form>
  );
}

/** Prev / next pager that preserves the current filters. */
export function AdminPagination({
  page,
  pageCount,
  labels,
}: {
  page: number;
  pageCount: number;
  labels: { prev: string; next: string; pageOf: string };
}) {
  const pathname = usePathname();
  const buildQs = useQueryString();
  const t = useTranslations("admin");
  if (pageCount <= 1) return null;

  const Btn = ({ to, disabled, children }: { to: number; disabled: boolean; children: React.ReactNode }) => {
    const cls = "rounded-pill border border-linestrong px-3 py-1.5 text-sm font-medium";
    if (disabled) return <span className={cn(cls, "cursor-not-allowed text-muted opacity-50")}>{children}</span>;
    return (
      <Link href={`${pathname}${buildQs({ page: String(to) })}`} className={cn(cls, "text-ink hover:bg-elevated")}>
        {children}
      </Link>
    );
  };

  return (
    <nav className="mt-4 flex items-center justify-between gap-2" aria-label={t("pagination.nav")}>
      <Btn to={page - 1} disabled={page <= 1}>
        {labels.prev}
      </Btn>
      <span className="text-sm text-muted">{labels.pageOf}</span>
      <Btn to={page + 1} disabled={page >= pageCount}>
        {labels.next}
      </Btn>
    </nav>
  );
}
