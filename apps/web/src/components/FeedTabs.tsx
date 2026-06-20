import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * Home feed switch: "Latest" (everyone's newest) vs "Following" (newest from the
 * users you follow). Server-rendered as two links driven by the `?feed=` param,
 * so no client state is needed. Only shown to signed-in users.
 */
export function FeedTabs({
  active,
  labels,
}: {
  active: "latest" | "following";
  labels: { latest: string; following: string };
}) {
  const tab = (key: "latest" | "following", label: string, href: string) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={cn(
        "rounded-pill px-4 py-1.5 text-sm font-semibold transition-colors",
        active === key ? "bg-green text-white" : "text-muted hover:text-ink",
      )}
    >
      {label}
    </Link>
  );

  return (
    <div className="inline-flex gap-1 rounded-pill border border-line bg-white p-1">
      {tab("latest", labels.latest, "/")}
      {tab("following", labels.following, "/?feed=following")}
    </div>
  );
}
