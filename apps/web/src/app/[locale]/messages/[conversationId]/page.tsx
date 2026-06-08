import { getTranslations, setRequestLocale } from "next-intl/server";
import { getMessages } from "@swap/api";
import type { Locale } from "@swap/types";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/primitives";
import { CTAButton } from "@/components/CTAButton";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fetchOtherParticipant } from "@/lib/chat";
import { isSupabaseConfigured } from "@/lib/env";
import { ChatRoom } from "./ChatRoom";

export default async function ChatRoomPage({
  params: { locale, conversationId },
}: {
  params: { locale: Locale; conversationId: string };
}) {
  setRequestLocale(locale);

  if (!isSupabaseConfigured()) {
    const tn = await getTranslations("nav");
    return (
      <AppShell hideNav>
        <EmptyState title={tn("login")} action={<CTAButton href="/login">{tn("login")}</CTAButton>} />
      </AppShell>
    );
  }

  const user = await requireUser(locale);
  const supabase = createClient();
  const [messages, otherUser] = await Promise.all([
    getMessages(supabase, conversationId),
    fetchOtherParticipant(conversationId, user.id),
  ]);

  return (
    <ChatRoom
      conversationId={conversationId}
      currentUserId={user.id}
      otherUser={otherUser}
      initialMessages={messages}
    />
  );
}
