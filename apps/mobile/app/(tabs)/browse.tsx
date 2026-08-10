import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PackageSearch, SlidersHorizontal } from "lucide-react-native";
import { TOP_LEVEL_CATEGORIES, COUNTRIES, citiesByCountry } from "@swap/config";
import { localizedName } from "@swap/ui";
import type { ListingCondition, ListingWithRelations, SortOption } from "@swap/types";
import { getListings } from "@swap/api";
import { supabase } from "../../src/lib/supabase";
import { locale, t } from "../../src/i18n";
import { colors, radii, spacing } from "../../src/theme";
import { Button, Chip, Input, Select } from "../../src/components/ui";
import { Icon } from "../../src/components/ui/Icon";
import { ListingCard } from "../../src/components/ListingCard";
import { ListingCardSkeleton } from "../../src/components/ListingCardSkeleton";
import { EmptyState } from "../../src/components/EmptyState";
import { ErrorState } from "../../src/components/ErrorState";

const PAGE = 20;

export default function Browse() {
  const router = useRouter();
  // Seed filters from route params (home category tiles, deep links, web parity).
  const params = useLocalSearchParams<{
    categoryId?: string; search?: string; countryId?: string; cityId?: string; condition?: string; sort?: string;
  }>();
  const [search, setSearch] = useState(params.search ?? "");
  const [debounced, setDebounced] = useState(params.search?.trim() ?? "");
  const [categoryId, setCategoryId] = useState<string | undefined>(params.categoryId || undefined);
  const [countryId, setCountryId] = useState<string | undefined>(params.countryId || undefined);
  const [cityId, setCityId] = useState<string | undefined>(params.cityId || undefined);
  const [condition, setCondition] = useState<ListingCondition | undefined>(
    params.condition === "new" || params.condition === "used" ? params.condition : undefined,
  );
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sort, setSort] = useState<SortOption>(params.sort === "most_viewed" ? "most_viewed" : "newest");
  const [items, setItems] = useState<ListingWithRelations[] | null>(null);
  const [more, setMore] = useState(false);
  const [end, setEnd] = useState(false);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Apply a category passed from Home's category tiles (only when present, so
  // switching to the Browse tab directly never clears an in-place filter).
  useEffect(() => {
    if (params.categoryId) setCategoryId(params.categoryId);
  }, [params.categoryId]);
  useEffect(() => setCityId(undefined), [countryId]);

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const query = useMemo(
    () => ({
      search: debounced || undefined,
      categoryId,
      countryId,
      cityId,
      condition,
      isFeatured: featuredOnly || undefined,
      sort,
    }),
    [debounced, categoryId, countryId, cityId, condition, featuredOnly, sort],
  );

  const hasFilters = Boolean(debounced || categoryId || countryId || cityId || condition || featuredOnly);
  // Count only the *advanced* filters (the ones behind the Filters panel) for its badge —
  // search + category have their own visible controls (the box + the chip row).
  const advancedCount = [countryId, cityId, condition].filter(Boolean).length + (featuredOnly ? 1 : 0);
  const filtersActive = filtersOpen || advancedCount > 0;

  const loadFirst = useCallback(() => {
    let cancelled = false;
    setItems(null);
    setEnd(false);
    setError(false);
    getListings(supabase, { ...query, limit: PAGE, offset: 0 })
      .then((rows) => {
        if (cancelled) return;
        setItems(rows);
        setEnd(rows.length < PAGE);
      })
      .catch(() => !cancelled && setError(true));
    return () => {
      cancelled = true;
    };
  }, [query]);

  // Reset + first page whenever a filter changes.
  useEffect(() => loadFirst(), [loadFirst]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    getListings(supabase, { ...query, limit: PAGE, offset: 0 })
      .then((rows) => {
        setItems(rows);
        setEnd(rows.length < PAGE);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setRefreshing(false));
  }, [query]);

  const loadMore = useCallback(() => {
    if (more || end || error || !items || items.length === 0) return;
    setMore(true);
    getListings(supabase, { ...query, limit: PAGE, offset: items.length })
      .then((rows) => {
        setItems((prev) => [...(prev ?? []), ...rows]);
        setEnd(rows.length < PAGE);
      })
      .catch(() => undefined)
      .finally(() => setMore(false));
  }, [more, end, error, items, query]);

  function resetFilters() {
    setSearch("");
    setDebounced("");
    setCategoryId(undefined);
    setCountryId(undefined);
    setCityId(undefined);
    setCondition(undefined);
    setFeaturedOnly(false);
  }

  const countryOptions = useMemo(
    () => COUNTRIES.map((country) => ({ value: country.id, label: localizedName(country, locale) })),
    [],
  );
  const cityOptions = useMemo(
    () => (countryId ? citiesByCountry(countryId).map((city) => ({ value: city.id, label: localizedName(city, locale) })) : []),
    [countryId],
  );

  return (
    <View style={styles.root}>
      <View style={styles.controls}>
        <Input placeholder={t("mobile.browse.search")} value={search} onChangeText={setSearch} returnKeyType="search" />

        {/* Category chips — the website's top scroller. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          <Chip label={t("mobile.browse.all")} active={!categoryId} onPress={() => setCategoryId(undefined)} />
          {TOP_LEVEL_CATEGORIES.map((c) => (
            <Chip key={c.id} label={localizedName(c, locale)} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
          ))}
        </ScrollView>

        {/* Filters (icon+text toggle, left) ⟷ compact sort dropdown (right) — the website toolbar row. */}
        <View style={styles.toolRow}>
          <Pressable
            onPress={() => setFiltersOpen((open) => !open)}
            accessibilityRole="button"
            accessibilityState={{ expanded: filtersOpen }}
            hitSlop={8}
            style={({ pressed }) => [styles.filtersBtn, filtersActive && styles.filtersBtnActive, pressed && styles.pressed]}
          >
            <Icon icon={SlidersHorizontal} size={16} color={filtersActive ? colors.green : colors.text} />
            <Text style={[styles.filtersLabel, filtersActive && styles.filtersLabelActive]}>{t("listings.filters")}</Text>
            {advancedCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{advancedCount}</Text>
              </View>
            ) : null}
          </Pressable>

          <View style={styles.sortSelect}>
            <Select
              value={sort}
              onChange={(v) => setSort(v as SortOption)}
              sheetTitle={t("sort.label")}
              options={[
                { value: "newest", label: t("sort.newest") },
                { value: "most_viewed", label: t("sort.most_viewed") },
              ]}
            />
          </View>
        </View>

        {/* Expandable filter card — stacked Selects, mirroring the website's phone-width filter panel. */}
        {filtersOpen ? (
          <View style={styles.filters}>
            <Select
              label={t("common.country")}
              placeholder={t("common.all")}
              value={countryId ?? ""}
              onChange={(v) => { setCountryId(v || undefined); setCityId(undefined); }}
              options={[{ value: "", label: t("common.all") }, ...countryOptions]}
            />
            <Select
              label={t("common.city")}
              placeholder={t("common.all")}
              value={cityId ?? ""}
              onChange={(v) => setCityId(v || undefined)}
              options={[{ value: "", label: t("common.all") }, ...cityOptions]}
              disabled={!countryId}
            />
            <Select
              label={t("common.condition")}
              placeholder={t("common.all")}
              value={condition ?? ""}
              onChange={(v) => setCondition((v || undefined) as ListingCondition | undefined)}
              options={[
                { value: "", label: t("common.all") },
                { value: "new", label: t("condition.new") },
                { value: "used", label: t("condition.used") },
              ]}
            />
            <Select
              label={t("listings.featured")}
              placeholder={t("common.all")}
              value={featuredOnly ? "true" : ""}
              onChange={(v) => setFeaturedOnly(v === "true")}
              options={[
                { value: "", label: t("common.all") },
                { value: "true", label: t("listings.featuredOnly") },
              ]}
            />
            {hasFilters ? (
              <View style={styles.filterFooter}>
                <Button label={t("common.reset")} variant="ghost" onPress={resetFilters} />
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {items === null ? (
        <View style={styles.list}>
          {[0, 1, 2].map((i) => (
            <ListingCardSkeleton key={i} />
          ))}
        </View>
      ) : error ? (
        <ErrorState onRetry={loadFirst} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Icon icon={PackageSearch} size={26} color={colors.textMuted} />}
          title={hasFilters ? t("mobile.browse.empty") : t("home.emptyTitle")}
          subtitle={hasFilters ? t("mobile.browse.emptyHint") : undefined}
          action={hasFilters ? <Button label={t("common.reset")} variant="secondary" onPress={resetFilters} /> : undefined}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(l) => l.id}
          renderItem={({ item }) => (
            <ListingCard listing={item} onPress={() => router.push({ pathname: "/listings/[id]", params: { id: item.id } })} />
          )}
          ListHeaderComponent={<Text style={styles.count}>{t("listings.resultsCount", { count: items.length })}</Text>}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            more ? (
              <ActivityIndicator color={colors.green} style={{ marginVertical: spacing.lg }} />
            ) : end && items.length > 0 ? (
              <Text style={styles.endText}>{t("listings.endOfResults")}</Text>
            ) : null
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.green} colors={[colors.green]} />}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  controls: { padding: spacing.lg, gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  chips: { gap: spacing.sm, paddingVertical: 2 },
  toolRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  filtersBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "transparent",
  },
  filtersBtnActive: { backgroundColor: colors.greenLight, borderColor: "rgba(24,182,106,0.35)" },
  filtersLabel: { color: colors.text, fontSize: 14, fontWeight: "700" },
  filtersLabelActive: { color: colors.green },
  badge: { minWidth: 20, height: 20, borderRadius: radii.pill, backgroundColor: colors.green, alignItems: "center", justifyContent: "center", paddingHorizontal: 6, marginStart: 2 },
  badgeText: { color: colors.navy, fontSize: 12, fontWeight: "800" },
  sortSelect: { width: 168 },
  pressed: { opacity: 0.7 },
  filters: {
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  filterFooter: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", flexWrap: "wrap", gap: spacing.sm },
  list: { padding: spacing.lg, gap: spacing.lg },
  count: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: spacing.xs },
  endText: { color: colors.textFaint, fontSize: 13, textAlign: "center", marginVertical: spacing.lg },
});
