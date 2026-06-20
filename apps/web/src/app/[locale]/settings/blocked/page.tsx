import { Ban } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/primitives";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { UnblockButton } from "@/components/UnblockButton";
import { CTAButton } from "@/components/CTAButton";
import { getCurrentUser } from "@/lib/auth";
import { fetchBlockedUsers } from "@/lib/social";

export default async function BlockedUsersPage({
  params: { locale },
}: {
  params: { locale: Locale };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("block");
  const tn = await getTranslations("nav");

  const user = await getCurrentUser();
  if (!user) {
    return (
      <AppShell>
        <EmptyState
          icon={<Ban className="h-10 w-10" />}
          title={t("blockedTitle")}
          action={<CTAButton href="/login">{tn("login")}</CTAButton>}
        />
      </AppShell>
    );
  }

  const blocked = await fetchBlockedUsers(user.id);

  return (
    <AppShell>
      <div className="space-y-4 px-4 py-4">
        <h1 className="text-xl font-bold text-ink">{t("blockedTitle")}</h1>
        {blocked.length > 0 ? (
          <ul className="space-y-2">
            {blocked.map((u) => (
              <li key={u.id} className="card flex items-center gap-3 p-3">
                <ProfileAvatar src={u.avatar_url} name={u.full_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-ink">{u.full_name}</p>
                  <p className="truncate text-sm text-muted">@{u.username}</p>
                </div>
                <UnblockButton userId={u.id} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<Ban className="h-10 w-10" />} title={t("blockedEmpty")} />
        )}
      </div>
    </AppShell>
  );
}
