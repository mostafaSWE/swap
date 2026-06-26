"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, MessageCircle, Package, Plus, UserCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Logo } from "./Logo";
import { SearchBar } from "./SearchBar";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationBell } from "./NotificationBell";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const PRIMARY_LINKS = [
  { href: "/categories", key: "categories" },
  { href: "/listings", key: "browseListings" },
] as const;

const ACCOUNT_LINKS = [
  { href: "/my-listings", key: "myListings", icon: Package },
  { href: "/messages", key: "messages", icon: MessageCircle },
  { href: "/profile", key: "account", icon: UserCircle },
] as const;

export function TopBar({ isAuthenticated }: { isAuthenticated: boolean }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-night/80 backdrop-blur-xl supports-[backdrop-filter]:bg-night/65">
      <div className="mx-auto flex min-h-16 w-full max-w-[1440px] items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3 lg:gap-4">
          <Link href="/" aria-label="JustSwap home" className="shrink-0">
            <Logo priority compactOnSmall />
          </Link>
          <nav className="hidden items-center gap-1 lg:flex" aria-label={t("primaryNav")}>
            {PRIMARY_LINKS.map((l) => (
              <Link
                key={l.key}
                href={l.href}
                className={cn(
                  "rounded-pill px-3.5 py-2 text-sm font-semibold transition-colors",
                  isActive(l.href) ? "bg-accent-soft text-accent" : "text-muted hover:bg-elevated hover:text-ink",
                )}
              >
                {t(l.key)}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden max-w-[26rem] flex-1 md:block xl:max-w-[30rem]">
          <SearchBar />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {isAuthenticated ? (
            <Link href="/new-listing" className="btn-primary hidden min-h-11 !px-4 !py-2.5 text-sm sm:inline-flex">
              <Plus className="h-4 w-4" aria-hidden />
              {t("addListing")}
            </Link>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link href="/login" className="btn-secondary min-h-11 !px-4 !py-2.5 text-sm">
                {t("login")}
              </Link>
              <Link href="/register" className="btn-primary min-h-11 !px-4 !py-2.5 text-sm">
                {t("register")}
              </Link>
            </div>
          )}
          <ThemeToggle />
          <LanguageSwitcher />
          {isAuthenticated ? <AccountMenu /> : null}
          {isAuthenticated ? <NotificationBell /> : null}
          {!isAuthenticated ? (
            <Link href="/login" className="btn-primary min-h-11 !px-3 text-xs sm:hidden max-[430px]:hidden">
              {t("login")}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}

function AccountMenu() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const isActive = (href: string) => pathname.startsWith(href);
  const hasActiveChild = ACCOUNT_LINKS.some((link) => isActive(link.href));

  async function logout() {
    setOpen(false);
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div ref={rootRef} className="relative hidden lg:block">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "inline-flex h-11 items-center gap-2 rounded-pill border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40",
          hasActiveChild || open
            ? "border-accent/30 bg-accent-soft text-accent"
            : "border-line bg-surface text-ink hover:bg-elevated",
        )}
      >
        <UserCircle className="h-4 w-4" aria-hidden />
        {t("account")}
        <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open ? (
        <div
          role="menu"
          className="animate-fade-in absolute end-0 z-40 mt-2 w-52 overflow-hidden rounded-card border border-line bg-surface p-1.5 shadow-elevated"
        >
          {ACCOUNT_LINKS.map(({ href, key, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={key}
                href={href}
                role="menuitem"
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                  active ? "bg-accent-soft text-accent" : "text-ink hover:bg-elevated",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{t(key)}</span>
              </Link>
            );
          })}
          <div className="my-1 h-px bg-line" aria-hidden />
          <button
            type="button"
            role="menuitem"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-start text-sm font-semibold text-ink transition-colors hover:bg-elevated"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            <span className="truncate">{t("logout")}</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
