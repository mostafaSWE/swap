import { MessageCircle } from "lucide-react-native";
import { colors } from "../theme";
import { t } from "../i18n";
import { Button } from "./ui/Button";
import { Icon } from "./ui/Icon";

/** "Message the owner" — the primary listing CTA (web `MessageButton`).
 *  Presentational: the caller opens/reuses the conversation on press. */
export function MessageButton({
  onPress,
  variant = "primary",
  busy,
}: {
  onPress: () => void;
  variant?: "primary" | "secondary";
  busy?: boolean;
}) {
  return (
    <Button
      variant={variant}
      onPress={onPress}
      loading={busy}
      fullWidth
      leftIcon={<Icon icon={MessageCircle} size={18} color={variant === "primary" ? colors.navy : colors.text} />}
      label={t("listing.message")}
    />
  );
}
