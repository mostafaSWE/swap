import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { Check } from "lucide-react-native";
import type { ListingWithRelations } from "@swap/types";
import { getListings } from "@swap/api";
import { supabase } from "../lib/supabase";
import { t } from "../i18n";
import { colors, radii, spacing } from "../theme";
import { ItemArtwork } from "./ItemArtwork";
import { Icon } from "./ui";

/** Cover image = first by sort_order (mirrors ListingCard). */
function cover(l: ListingWithRelations): string | undefined {
  return [...(l.images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.image_url;
}

/**
 * Multi-select grid of the viewer's own **active** listings — the bundle picker
 * for a swap proposal (web `ListingPicker`). Enforces `max` (blocks selecting
 * past the cap); `excludeListingId` drops the target listing from the grid.
 */
export function ListingPicker({
  ownerId,
  excludeListingId,
  value,
  onChange,
  max,
}: {
  ownerId: string;
  excludeListingId?: string;
  value: string[];
  onChange: (ids: string[]) => void;
  max: number;
}) {
  const [listings, setListings] = useState<ListingWithRelations[] | null>(null);

  useEffect(() => {
    let active = true;
    getListings(supabase, { ownerId, limit: 50 })
      .then((all) => active && setListings(all.filter((l) => l.id !== excludeListingId)))
      .catch(() => active && setListings([]));
    return () => {
      active = false;
    };
  }, [ownerId, excludeListingId]);

  if (listings === null) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.green} />
      </View>
    );
  }
  if (listings.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>{t("proposal.noListings")}</Text>
        <Text style={styles.emptyHint}>{t("proposal.noListingsHint")}</Text>
      </View>
    );
  }

  function toggle(id: string) {
    if (value.includes(id)) onChange(value.filter((x) => x !== id));
    else if (value.length < max) onChange([...value, id]);
  }

  return (
    <View style={styles.grid}>
      {listings.map((l) => {
        const selected = value.includes(l.id);
        return (
          <Pressable
            key={l.id}
            onPress={() => toggle(l.id)}
            style={styles.tile}
            accessibilityRole="button"
            accessibilityState={{ selected }}
          >
            <View style={styles.artBox}>
              <ItemArtwork imageUrl={cover(l)} title={l.title} categoryIcon={l.category?.icon} style={styles.art} />
              <View style={[styles.ring, selected && styles.ringOn]} pointerEvents="none" />
              {selected ? (
                <View style={styles.check}>
                  <Icon icon={Check} size={15} color={colors.navy} />
                </View>
              ) : null}
            </View>
            <Text numberOfLines={1} style={styles.tileTitle}>
              {l.title}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { paddingVertical: spacing.xl, alignItems: "center" },
  empty: { paddingVertical: spacing.lg, gap: spacing.xs, alignItems: "center" },
  emptyTitle: { color: colors.text, fontSize: 15, fontWeight: "700", textAlign: "center" },
  emptyHint: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: { width: "31%", gap: spacing.xs },
  artBox: { position: "relative", width: "100%" },
  art: { width: "100%", aspectRatio: 1, borderRadius: radii.md },
  ring: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: "transparent",
  },
  ringOn: { borderColor: colors.green },
  check: {
    position: "absolute",
    top: spacing.xs,
    right: spacing.xs,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  tileTitle: { color: colors.textMuted, fontSize: 11 },
});
