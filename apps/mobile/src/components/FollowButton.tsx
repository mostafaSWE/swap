import { UserCheck, UserPlus } from "lucide-react-native";
import { colors } from "../theme";
import { t } from "../i18n";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";

/** Follow / unfollow toggle (web `FollowButton`). Presentational: the caller
 *  owns the `following` state + persistence; this just renders + fires onToggle. */
export function FollowButton({
  following,
  onToggle,
  busy,
  fullWidth = true,
}: {
  following: boolean;
  onToggle: () => void;
  busy?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <Button
      variant="secondary"
      onPress={onToggle}
      loading={busy}
      fullWidth={fullWidth}
      leftIcon={<Icon icon={following ? UserCheck : UserPlus} size={18} color={following ? colors.green : colors.text} />}
      label={following ? t("listing.following") : t("listing.follow")}
    />
  );
}
