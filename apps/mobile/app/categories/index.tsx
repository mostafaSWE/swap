import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { TOP_LEVEL_CATEGORIES } from "@swap/config";
import { t } from "../../src/i18n";
import { colors, spacing } from "../../src/theme";
import { CategoryCard } from "../../src/components/ui";

/**
 * Dedicated category index (web `/categories`) — the FULL wall of top-level
 * categories in a 2-column grid, distinct from the Explore/Browse discovery feed.
 * Tapping a category deep-links into the filtered feed (`/browse?categoryId=…`),
 * exactly like the website's category cards → `/listings?category=…`.
 */
export default function CategoriesScreen() {
  const router = useRouter();
  const openCategory = (id: string) => router.push({ pathname: "/browse", params: { categoryId: id } });

  return (
    <>
      <Stack.Screen options={{ title: t("nav.categories") }} />
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <Text style={styles.heading} accessibilityRole="header">{t("nav.categories")}</Text>
        <View style={styles.grid}>
          {TOP_LEVEL_CATEGORIES.map((cat) => (
            <View key={cat.id} style={styles.cell}>
              <CategoryCard category={cat} onPress={() => openCategory(cat.id)} />
            </View>
          ))}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing["3xl"] },
  heading: { color: colors.text, fontSize: 22, fontWeight: "800", marginBottom: spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -spacing.xs },
  // Two-column grid (web is grid-cols-2 at phone width). Each cell is half-width.
  cell: { width: "50%", paddingHorizontal: spacing.xs, paddingBottom: spacing.sm },
});
