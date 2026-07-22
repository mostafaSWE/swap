import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { ListingWithRelations } from "@swap/types";
import { APP_NAME, SLOGAN } from "@swap/config";
import { getListings } from "@swap/api";
import { supabase } from "../../src/lib/supabase";
import { Screen } from "../../src/components/Screen";
import { CategoryGrid } from "../../src/components/CategoryGrid";
import { ListingCard } from "../../src/components/ListingCard";
import { EmptyState } from "../../src/components/EmptyState";
import { colors, radii, spacing } from "../../src/theme";
import { locale, t } from "../../src/i18n";

export default function Home() {
  const [listings, setListings] = useState<ListingWithRelations[] | null>(null);

  useEffect(() => {
    let active = true;
    getListings(supabase, { isFeatured: true, limit: 6 })
      .then((rows) => active && setListings(rows))
      .catch(() => active && setListings([]));
    return () => {
      active = false;
    };
  }, []);

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.brand}>{APP_NAME}</Text>
        <Text style={styles.slogan}>{SLOGAN[locale]}</Text>
      </View>

      <Text style={styles.section}>{t("home.categories")}</Text>
      <CategoryGrid />

      <Text style={styles.section}>{t("home.featured")}</Text>
      {listings === null ? (
        <ActivityIndicator color={colors.green} style={{ marginTop: spacing.lg }} />
      ) : listings.length === 0 ? (
        <EmptyState title={t("home.empty")} />
      ) : (
        <View style={{ gap: spacing.lg }}>
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: colors.navy, borderRadius: radii.lg, padding: spacing.xl, gap: spacing.xs },
  brand: { color: colors.green, fontSize: 28, fontWeight: "800" },
  slogan: { color: colors.white, fontSize: 16, fontWeight: "600" },
  section: { color: colors.text, fontSize: 16, fontWeight: "700" },
});
