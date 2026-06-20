import { useLocale, useTranslations } from "next-intl";
import { formatRelativeTime } from "@swap/ui";
import type { ConversationPreview, Locale } from "@swap/types";
import { Link } from "@/i18n/navigation";
import { ProfileAvatar } from "./ProfileAvatar";
import { ProposalStatusBadge } from "./badges";

/** Row in the conversations list. */
export function ConversationCard({ conversation }: { conversation: ConversationPreview }) {
  const locale = useLocale() as Locale;
  const tp = useTranslations("proposal");
  const { other_user, last_message, unread_count, proposal_status } = conversation;

  return (
    <Link
      href={`/messages/${conversation.id}`}
      className="flex items-center gap-3 border-b border-line bg-white px-4 py-3 transition-colors hover:bg-canvas"
    >
      <ProfileAvatar src={other_user.avatar_url} name={other_user.full_name} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className="truncate font-semibold text-ink">{other_user.full_name}</span>
          {last_message ? (
            <span className="shrink-0 text-xs text-muted">
              {formatRelativeTime(last_message.created_at, locale)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-1.5">
          {proposal_status ? (
            <ProposalStatusBadge status={proposal_status} label={tp(`status.${proposal_status}`)} />
          ) : null}
          <p className="truncate text-sm text-muted">{last_message?.body ?? "—"}</p>
        </div>
      </div>
      {unread_count > 0 ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-green px-1.5 text-xs font-semibold text-white">
          {unread_count}
        </span>
      ) : null}
    </Link>
  );
}
