import { useCallback, useEffect, useState } from "react";
import { Dimensions, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { ArrowRight, Handshake, MapPin, PackagePlus, Search, ShieldCheck } from "lucide-react-native";
import { TOP_LEVEL_CATEGORIES } from "@swap/config";
import { localizedName } from "@swap/ui";
import type { ListingWithRelations } from "@swap/types";
import { getListings } from "@swap/api";
import { supabase } from "../../src/lib/supabase";
import { HomeHero } from "../../src/components/home/HomeHero";
import { ListingCard } from "../../src/components/ListingCard";
import { ListingCardSkeleton } from "../../src/components/ListingCardSkeleton";
import { ErrorState } from "../../src/components/ErrorState";
import { EmptyState } from "../../src/components/EmptyState";
import { CategoryIcon } from "../../src/components/ui/CategoryIcon";
import { Icon } from "../../src/components/ui/Icon";
import { Button } from "../../src/components/ui/Button";
import { colors, radii, spacing } from "../../src/theme";
import { locale, t } from "../../src/i18n";

const SCREEN_W = Dimensions.get("window").width;
const RAIL_CARD_W = Math.min(300, Math.round(SCREEN_W * 0.78));

export default function Home() {
  const router = useRouter();
  const [featured, setFeatured] = useState<ListingWithRelations[] | null>(null);
  const [latest, setLatest] = useState<ListingWithRelations[] | null>(null);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try {
      const [f, l] = await Promise.all([
        getListings(supabase, { isFeatured: true, limit: 6 }),
        getListings(supabase, { sort: "newest", limit: 8 }),
      ]);
      const featuredIds = new Set(f.map((x) => x.id));
      setFeatured(f);
      // Latest excludes anything already surfaced in the Featured rail (no dup rows).
      setLatest(l.filter((x) => !featuredIds.has(x.id)).slice(0, 6));
    } catch {
      setError(true);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const openBrowse = (categoryId?: string) =>
    router.push({ pathname: "/browse", params: categoryId ? { categoryId } : {} });
  const openListing = (id: string) => router.push({ pathname: "/listings/[id]", params: { id } });
  const goAdd = () => router.push("/new-listing");

  const steps = [
    { icon: PackagePlus, title: t("home.how.step1Title"), body: t("home.how.step1Body") },
    { icon: Search, title: t("home.how.step2Title"), body: t("home.how.step2Body") },
    { icon: Handshake, title: t("home.how.step3Title"), body: t("home.how.step3Body") },
  ];
  const trust = [
    { title: t("home.trust.item1Title"), body: t("home.trust.item1Body") },
    { title: t("home.trust.item2Title"), body: t("home.trust.item2Body") },
    { title: t("home.trust.item3Title"), body: t("home.trust.item3Body") },
  ];

  /** A discovery rail: skeletons while loading, an empty box (with optional CTA)
   *  when there's nothing, otherwise a snapping horizontal card rail. */
  function Rail({ data, emptyTitle, emptyAction }: { data: ListingWithRelations[] | null; emptyTitle: string; emptyAction?: boolean }) {
    if (data === null) {
      return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail} scrollEnabled={false}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ width: RAIL_CARD_W }}>
              <ListingCardSkeleton />
            </View>
          ))}
        </ScrollView>
      );
    }
    if (data.length === 0) {
      return (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>{emptyTitle}</Text>
          {emptyAction ? (
            <View style={styles.emptyAction}>
              <Button label={t("home.cta")} onPress={goAdd} leftIcon={<Icon icon={PackagePlus} size={16} color={colors.navy} />} />
            </View>
          ) : null}
        </View>
      );
    }
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
        snapToInterval={RAIL_CARD_W + spacing.md}
        decelerationRate="fast"
      >
        {data.map((l) => (
          <View key={l.id} style={{ width: RAIL_CARD_W }}>
            <ListingCard listing={l} onPress={() => openListing(l.id)} />
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} colors={[colors.green]} />}
    >
      <HomeHero />

      <View style={styles.body}>
        {/* Search + location — a tappable bar that opens Browse (native pattern). */}
        <View style={styles.searchWrap}>
          <Pressable
            onPress={() => openBrowse()}
            accessibilityRole="search"
            accessibilityLabel={t("mobile.browse.search")}
            style={({ pressed }) => [styles.searchField, pressed && styles.pressedSoft]}
          >
            <Icon icon={Search} size={18} color={colors.textMuted} />
            <Text numberOfLines={1} style={styles.searchPlaceholder}>
              {t("mobile.browse.search")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => openBrowse()}
            accessibilityRole="button"
            accessibilityLabel={t("mobile.browse.all")}
            style={({ pressed }) => [styles.locationBtn, pressed && styles.pressedSoft]}
          >
            <Icon icon={MapPin} size={16} color={colors.green} />
            <Text numberOfLines={1} style={styles.locationText}>
              {t("mobile.browse.all")}
            </Text>
          </Pressable>
        </View>

        {/* How swapping works */}
        <Section eyebrow={t("home.how.eyebrow")} title={t("home.how.title")}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.rail}
            snapToInterval={RAIL_CARD_W + spacing.md}
            decelerationRate="fast"
          >
            {steps.map((s, i) => (
              <View key={s.title} style={[styles.stepCard, { width: RAIL_CARD_W }]}>
                <View style={styles.stepTop}>
                  <View style={styles.iconTile}>
                    <Icon icon={s.icon} size={20} color={colors.green} />
                  </View>
                  <Text style={styles.stepNum}>0{i + 1}</Text>
                </View>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Text numberOfLines={3} style={styles.stepBody}>
                  {s.body}
                </Text>
              </View>
            ))}
          </ScrollView>
        </Section>

        {/* Curated top categories (not the full wall) */}
        <Section
          eyebrow={t("home.categoriesEyebrow")}
          title={t("home.categories")}
          actionLabel={t("common.viewAll")}
          onAction={() => router.push("/categories")}
        >
          <View style={styles.catGrid}>
            {TOP_LEVEL_CATEGORIES.slice(0, 6).map((cat) => (
              <Pressable
                key={cat.id}
                onPress={() => openBrowse(cat.id)}
                accessibilityRole="button"
                accessibilityLabel={localizedName(cat, locale)}
                style={({ pressed }) => [styles.catTile, pressed && styles.pressedSoft]}
              >
                <View style={styles.catIcon}>
                  <CategoryIcon icon={cat.icon} size={20} color={colors.green} />
                </View>
                <Text numberOfLines={2} style={styles.catName}>
                  {localizedName(cat, locale)}
                </Text>
              </Pressable>
            ))}
          </View>
        </Section>

        {error ? (
          <ErrorState onRetry={load} />
        ) : (
          <>
            {/* Featured listings rail */}
            <Section eyebrow={t("home.featuredEyebrow")} title={t("home.featured")} actionLabel={t("common.viewAll")} onAction={() => openBrowse()}>
              <Rail data={featured} emptyTitle={t("home.featuredEmpty")} />
            </Section>

            {/* Latest listings rail */}
            <Section eyebrow={t("home.latestEyebrow")} title={t("home.latest")} actionLabel={t("common.viewAll")} onAction={() => openBrowse()}>
              <Rail data={latest} emptyTitle={t("home.emptyTitle")} emptyAction />
            </Section>
          </>
        )}

        {/* Trust & safety */}
        <Section eyebrow={t("home.trust.title")} title={t("home.trust.title")} hideEyebrow>
          <View style={styles.trustList}>
            {trust.map((item) => (
              <View key={item.title} style={styles.trustCard}>
                <View style={styles.trustIcon}>
                  <Icon icon={ShieldCheck} size={18} color={colors.green} />
                </View>
                <View style={styles.trustBody}>
                  <Text style={styles.trustTitle}>{item.title}</Text>
                  <Text style={styles.trustText}>{item.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </Section>

        {/* Final CTA */}
        <View style={styles.ctaCard}>
          <Text style={styles.ctaEyebrow}>{t("home.ctaEyebrow")}</Text>
          <Text style={styles.ctaTitle}>{t("home.ctaTitle")}</Text>
          <Text style={styles.ctaText}>{t("home.ctaDescription")}</Text>
          <View style={styles.ctaButtons}>
            <Button label={t("home.cta")} onPress={goAdd} leftIcon={<Icon icon={PackagePlus} size={18} color={colors.navy} />} fullWidth />
            <Button
              label={t("home.browseCategories")}
              variant="secondary"
              onPress={() => openBrowse()}
              leftIcon={<Icon icon={ArrowRight} size={18} color={colors.text} mirror />}
              fullWidth
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

/** Section wrapper: eyebrow + title on the leading side, optional trailing action. */
function Section({
  eyebrow,
  title,
  actionLabel,
  onAction,
  hideEyebrow,
  children,
}: {
  eyebrow: string;
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  hideEyebrow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <View style={{ flex: 1 }}>
          {hideEyebrow ? null : <Text style={styles.eyebrow}>{eyebrow}</Text>}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {actionLabel && onAction ? (
          <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8} style={({ pressed }) => [styles.viewAll, pressed && styles.pressedSoft]}>
            <Text style={styles.viewAllText}>{actionLabel}</Text>
            <Icon icon={ArrowRight} size={15} color={colors.green} mirror />
          </Pressable>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: spacing["2xl"] },
  body: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.xl },

  searchWrap: { gap: spacing.sm },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 48,
  },
  searchPlaceholder: { color: colors.textMuted, fontSize: 15, flex: 1 },
  locationBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
  },
  locationText: { color: colors.text, fontSize: 13, fontWeight: "600" },
  pressedSoft: { opacity: 0.7 },

  section: { gap: spacing.md },
  sectionHead: { flexDirection: "row", alignItems: "flex-end", gap: spacing.md },
  eyebrow: { color: colors.green, fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: "800", marginTop: 2 },
  viewAll: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  viewAllText: { color: colors.green, fontSize: 13, fontWeight: "700" },

  rail: { gap: spacing.md, paddingEnd: spacing.xs, paddingVertical: spacing.xs },
  stepCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    minHeight: 168,
  },
  stepTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  iconTile: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.greenLight, alignItems: "center", justifyContent: "center" },
  stepNum: { color: colors.textMuted, fontSize: 12, fontWeight: "800", backgroundColor: colors.background, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radii.pill },
  stepTitle: { color: colors.text, fontSize: 16, fontWeight: "700", marginTop: spacing.xs },
  stepBody: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },

  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  catTile: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    width: (SCREEN_W - spacing.lg * 2 - spacing.sm) / 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  catIcon: { width: 40, height: 40, borderRadius: radii.sm, backgroundColor: colors.greenLight, alignItems: "center", justifyContent: "center" },
  catName: { color: colors.text, fontSize: 13, fontWeight: "600", flex: 1 },

  emptyBox: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, padding: spacing.xl, alignItems: "center", gap: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: "center" },
  emptyAction: { alignSelf: "stretch" },

  trustList: { gap: spacing.sm },
  trustCard: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  trustIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.greenLight, alignItems: "center", justifyContent: "center" },
  trustBody: { flex: 1, gap: 3 },
  trustTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  trustText: { color: colors.textMuted, fontSize: 13, lineHeight: 20 },

  ctaCard: {
    backgroundColor: colors.navy,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    overflow: "hidden",
  },
  ctaEyebrow: { color: colors.green, fontSize: 12, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  ctaTitle: { color: colors.white, fontSize: 22, fontWeight: "800", lineHeight: 29 },
  ctaText: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  ctaButtons: { gap: spacing.sm, marginTop: spacing.md },
});
