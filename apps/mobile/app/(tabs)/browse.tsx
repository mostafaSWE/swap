import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { PackageSearch } from "lucide-react-native";
import { TOP_LEVEL_CATEGORIES, COUNTRIES, citiesByCountry } from "@swap/config";
import { localizedName } from "@swap/ui";
import type { ListingCondition, ListingWithRelations, SortOption } from "@swap/types";
import { getListings } from "@swap/api";
import { supabase } from "../../src/lib/supabase";
import { locale, t } from "../../src/i18n";
import { colors, spacing } from "../../src/theme";
import { Button, Chip, Input, SegmentedControl, Select } from "../../src/components/ui";
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          <Chip label={t("mobile.browse.all")} active={!categoryId} onPress={() => setCategoryId(undefined)} />
          {TOP_LEVEL_CATEGORIES.map((c) => (
            <Chip key={c.id} label={localizedName(c, locale)} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
          ))}
        </ScrollView>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <SegmentedControl
              segments={[
                { value: "newest", label: t("mobile.browse.newest") },
                { value: "most_viewed", label: t("mobile.browse.mostViewed") },
              ]}
              value={sort}
              onChange={(v) => setSort(v as SortOption)}
            />
          </View>
          <Button
            label={hasFilters ? `${t("listings.filters")} ·` : t("listings.filters")}
            variant={filtersOpen || hasFilters ? "primary" : "secondary"}
            onPress={() => setFiltersOpen((open) => !open)}
          />
        </View>
        {filtersOpen ? (
          <View style={styles.filters}>
            <Select label={t("newListing.fieldCountry")} placeholder={t("auth.country")} value={countryId} onChange={setCountryId} options={countryOptions} />
            {countryId ? <Select label={t("newListing.fieldCity")} placeholder={t("auth.city")} value={cityId} onChange={setCityId} options={cityOptions} /> : null}
            <SegmentedControl
              segments={[
                { value: "", label: t("mobile.browse.all") },
                { value: "new", label: t("mobile.detail.conditions.new") },
                { value: "used", label: t("mobile.detail.conditions.used") },
              ]}
              value={condition ?? ""}
              onChange={(value) => setCondition((value || undefined) as ListingCondition | undefined)}
            />
            <View style={styles.filterFooter}>
              <Chip label={t("listings.featuredOnly")} active={featuredOnly} onPress={() => setFeaturedOnly((value) => !value)} />
              {hasFilters ? <Button label={t("common.reset")} variant="ghost" onPress={resetFilters} /> : null}
            </View>
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
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  filters: { gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  filterFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: spacing.sm },
  list: { padding: spacing.lg, gap: spacing.lg },
  count: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: spacing.xs },
  endText: { color: colors.textFaint, fontSize: 13, textAlign: "center", marginVertical: spacing.lg },
});
