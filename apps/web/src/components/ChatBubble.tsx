import { useLocale } from "next-intl";
import { formatRelativeTime } from "@swap/ui";
import type { Locale, Message } from "@swap/types";
import { cn } from "@/lib/utils";

/** A single chat message bubble. Own messages align to the end (green). */
export function ChatBubble({ message, isOwn }: { message: Message; isOwn: boolean }) {
  const locale = useLocale() as Locale;

  return (
    <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm",
          isOwn ? "bg-green text-white" : "bg-surface text-ink border border-line",
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.body}</p>
        <span className={cn("mt-1 block text-[10px]", isOwn ? "text-white/70" : "text-muted")}>
          {formatRelativeTime(message.created_at, locale)}
        </span>
      </div>
    </div>
  );
}
