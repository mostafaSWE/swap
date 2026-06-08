import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ConversationPreview } from "@swap/types";
import { ConversationCard } from "./ConversationCard";
import { EmptyState } from "./primitives";

export function ConversationList({ conversations }: { conversations: ConversationPreview[] }) {
  const t = useTranslations("chat");
  if (!conversations.length) {
    return <EmptyState icon={<MessageCircle className="h-10 w-10" />} title={t("empty")} />;
  }
  return (
    <div>
      {conversations.map((c) => (
        <ConversationCard key={c.id} conversation={c} />
      ))}
    </div>
  );
}
