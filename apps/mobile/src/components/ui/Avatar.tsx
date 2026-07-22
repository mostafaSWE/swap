import { Image, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../../theme";

const SIZES = { sm: 32, md: 48, lg: 80 } as const;

/** Round avatar with initials fallback (web `ProfileAvatar`). */
export function Avatar({
  uri,
  name,
  size = "md",
}: {
  uri?: string | null;
  name?: string | null;
  size?: keyof typeof SIZES;
}) {
  const dim = SIZES[size];
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <View style={[styles.wrap, { width: dim, height: dim, borderRadius: radii.pill }]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: dim, height: dim }} resizeMode="cover" />
      ) : (
        <Text style={[styles.initial, { fontSize: dim * 0.42 }]}>{initial}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  initial: { color: colors.textMuted, fontWeight: "700" },
});
