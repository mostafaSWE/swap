import { MessageCircle } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { ConversationList } from "@/components/ConversationList";
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
      <EmptyState
        icon={<MessageCircle className="h-10 w-10" />}
        title={t("empty")}
        action={<CTAButton href="/login">{tn("login")}</CTAButton>}
      />
    );
  }

  const conversations = await fetchConversations(user.id);

  return (
    <>
      {/* Mobile: full conversation list (the desktop sidebar is in the layout). */}
      <div className="md:hidden">
        <h1 className="px-4 py-3 text-xl font-bold text-ink">{t("title")}</h1>
        <ConversationList conversations={conversations} />
      </div>
      {/* Desktop: prompt to pick a conversation. */}
      <div className="hidden h-full items-center justify-center md:flex">
        <EmptyState icon={<MessageCircle className="h-12 w-12" />} title={t("title")} description={t("empty")} />
      </div>
    </>
  );
}
