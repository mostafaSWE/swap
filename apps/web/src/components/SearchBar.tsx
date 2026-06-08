"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

/** Search input that routes to the listings page with a `search` query param. */
export function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const t = useTranslations("common");
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    router.push(q ? `/listings?search=${encodeURIComponent(q)}` : "/listings");
  }

  return (
    <form onSubmit={submit} className="relative">
      <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={t("search")}
        className="input-field ps-10"
        aria-label={t("searchAction")}
      />
    </form>
  );
}
