import { useEffect, useState } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { colors, radii } from "../../theme";

const SIZES = { sm: 32, md: 48, lg: 80 } as const;

/** Round avatar with initials fallback (web `ProfileAvatar`). The initial stays
 *  underneath the photo, so a slow or broken avatar URL degrades to the initial
 *  instead of an empty circle. */
export function Avatar({
  uri,
  name,
  size = "md",
}: {
  uri?: string | null;
  name?: string | null;
  size?: keyof typeof SIZES;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);

  const dim = SIZES[size];
  const initial = (name?.trim()?.[0] ?? "?").toUpperCase();
  return (
    <View style={[styles.wrap, { width: dim, height: dim, borderRadius: radii.pill }]}>
      <Text style={[styles.initial, { fontSize: dim * 0.42 }]}>{initial}</Text>
      {uri && !failed ? (
        <Image
          source={{ uri }}
          style={[styles.img, { width: dim, height: dim }]}
          resizeMode="cover"
          onError={() => setFailed(true)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.elevated, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  img: { position: "absolute", top: 0, start: 0 },
  initial: { color: colors.textMuted, fontWeight: "700" },
});
