import { MessageCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { ConversationCard } from "@/components/ConversationCard";
import { EmptyState } from "@/components/primitives";
import { CTAButton } from "@/components/CTAButton";
import { getCurrentUser } from "@/lib/auth";
import { fetchConversations } from "@/lib/chat";
import { isSupabaseConfigured } from "@/lib/env";

export default async function MessagesPage({ params: { locale } }: { params: { locale: Locale } }) {
  setRequestLocale(locale);
  const t = await getTranslations("chat");
  const tn = await getTranslations("nav");

  const user = isSupabaseConfigured() ? await getCurrentUser() : null;

  if (!user) {
    return (
      <AppShell>
        <EmptyState
          icon={<MessageCircle className="h-10 w-10" />}
          title={t("empty")}
          action={<CTAButton href="/login">{tn("login")}</CTAButton>}
        />
      </AppShell>
    );
  }

  const conversations = await fetchConversations(user.id);

  return (
    <AppShell>
      <div className="py-2">
        <h1 className="px-4 py-2 text-xl font-bold text-ink">{t("title")}</h1>
        {conversations.length > 0 ? (
          <div>
            {conversations.map((c) => (
              <ConversationCard key={c.id} conversation={c} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<MessageCircle className="h-10 w-10" />} title={t("empty")} />
        )}
      </div>
    </AppShell>
  );
}
