import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { ConversationList } from "@/components/ConversationList";
import { getCurrentUser } from "@/lib/auth";
import { fetchConversations } from "@/lib/chat";
import { isSupabaseConfigured } from "@/lib/env";

/**
 * Messages layout. On desktop it's a two-pane view: a persistent conversation
 * list sidebar + the active conversation (children). On mobile, the sidebar is
 * hidden and each route (list / room) takes the full width.
 */
export default async function MessagesLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: Locale };
}) {
  setRequestLocale(locale);
  const t = await getTranslations("chat");
  const user = isSupabaseConfigured() ? await getCurrentUser() : null;
  const conversations = user ? await fetchConversations(user.id) : [];

  return (
    <AppShell hideNav>
      <div className="md:grid md:min-h-[calc(100dvh-61px)] md:grid-cols-[340px_1fr]">
        <aside className="hidden border-e border-line bg-white md:block md:overflow-y-auto">
          <h1 className="px-4 py-3 text-lg font-bold text-ink">{t("title")}</h1>
          <ConversationList conversations={conversations} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </AppShell>
  );
}
