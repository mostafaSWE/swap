import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Camera } from "lucide-react-native";
import { colors, radii } from "../theme";
import { t } from "../i18n";
import { Avatar } from "./ui/Avatar";
import { Icon } from "./ui/Icon";

/**
 * Avatar picker shell (web `AvatarUpload`) — the avatar with a camera badge on
 * the trailing-bottom corner. Presentational: `onPick` opens the native image
 * picker + upload (wired at the profile-edit screen in M3, via expo-image-picker).
 */
export function AvatarUpload({
  uri,
  name,
  busy,
  onPick,
  error,
}: {
  uri?: string | null;
  name?: string | null;
  busy?: boolean;
  onPick?: () => void;
  error?: string | null;
}) {
  return (
    <View style={styles.wrap}>
      <Pressable
        onPress={onPick}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel={t("onboarding.avatarChange")}
        style={styles.btn}
      >
        <Avatar uri={uri} name={name} size="lg" />
        <View style={styles.badge}>
          {busy ? <ActivityIndicator size="small" color={colors.navy} /> : <Icon icon={Camera} size={16} color={colors.navy} />}
        </View>
      </Pressable>
      <Text style={styles.hint}>{t("onboarding.avatarHint")}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 8 },
  btn: { position: "relative" },
  badge: {
    position: "absolute",
    bottom: -2,
    end: -2,
    width: 32,
    height: 32,
    borderRadius: radii.pill,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  hint: { color: colors.textMuted, fontSize: 12 },
  error: { color: colors.danger, fontSize: 12, minHeight: 16 },
});
