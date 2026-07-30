import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, ScrollView, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CATEGORIES, COUNTRIES, citiesByCountry } from "@swap/config";
import { localizedName } from "@swap/ui";
import type { ListingCondition, ListingWithRelations, SortOption } from "@swap/types";
import { getListings } from "@swap/api";
import { supabase } from "../../src/lib/supabase";
import { locale, t } from "../../src/i18n";
import { colors, spacing } from "../../src/theme";
import { Button, Chip, Input, SegmentedControl, Select } from "../../src/components/ui";
import { ListingCard } from "../../src/components/ListingCard";
import { EmptyState } from "../../src/components/EmptyState";

const PAGE = 20;

export default function Browse() {
  const router = useRouter();
  const params = useLocalSearchParams<{ categoryId?: string }>();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(params.categoryId || undefined);
  const [countryId, setCountryId] = useState<string | undefined>();
  const [cityId, setCityId] = useState<string | undefined>();
  const [condition, setCondition] = useState<ListingCondition | undefined>();
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Apply a category passed from Home's category chips (only when present, so
  // switching to the Browse tab directly never clears an in-place filter).
  useEffect(() => {
    if (params.categoryId) setCategoryId(params.categoryId);
  }, [params.categoryId]);
  useEffect(() => setCityId(undefined), [countryId]);
  const [sort, setSort] = useState<SortOption>("newest");
  const [items, setItems] = useState<ListingWithRelations[] | null>(null);
  const [more, setMore] = useState(false);
  const [end, setEnd] = useState(false);

  // Debounce the search box so we don't hit the API on every keystroke.
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  // Reset + first page whenever a filter changes.
  useEffect(() => {
    let active = true;
    setItems(null);
    setEnd(false);
    getListings(supabase, {
      search: debounced || undefined,
      categoryId,
      countryId,
      cityId,
      condition,
      isFeatured: featuredOnly || undefined,
      sort,
      limit: PAGE,
      offset: 0,
    })
      .then((rows) => {
        if (!active) return;
        setItems(rows);
        setEnd(rows.length < PAGE);
      })
      .catch(() => active && setItems([]));
    return () => {
      active = false;
    };
  }, [debounced, categoryId, countryId, cityId, condition, featuredOnly, sort]);

  const loadMore = useCallback(() => {
    if (more || end || !items || items.length === 0) return;
    setMore(true);
    getListings(supabase, {
      search: debounced || undefined,
      categoryId,
      countryId,
      cityId,
      condition,
      isFeatured: featuredOnly || undefined,
      sort,
      limit: PAGE,
      offset: items.length,
    })
      .then((rows) => {
        setItems((prev) => [...(prev ?? []), ...rows]);
        setEnd(rows.length < PAGE);
      })
      .catch(() => undefined)
      .finally(() => setMore(false));
  }, [more, end, items, debounced, categoryId, countryId, cityId, condition, featuredOnly, sort]);

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
          {CATEGORIES.map((c) => (
            <Chip key={c.id} label={localizedName(c, locale)} active={categoryId === c.id} onPress={() => setCategoryId(c.id)} />
          ))}
        </ScrollView>
        <SegmentedControl
          segments={[
            { value: "newest", label: t("mobile.browse.newest") },
            { value: "most_viewed", label: t("mobile.browse.mostViewed") },
          ]}
          value={sort}
          onChange={(v) => setSort(v as SortOption)}
        />
        <Button
          label={t("listings.filters")}
          variant="secondary"
          onPress={() => setFiltersOpen((open) => !open)}
          fullWidth
        />
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
            <Chip label={t("listings.featuredOnly")} active={featuredOnly} onPress={() => setFeaturedOnly((value) => !value)} />
          </View>
        ) : null}
      </View>

      {items === null ? (
        <ActivityIndicator color={colors.green} style={styles.spinner} />
      ) : items.length === 0 ? (
        <EmptyState icon="🔍" title={t("mobile.browse.empty")} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(l) => l.id}
          renderItem={({ item }) => (
            <ListingCard listing={item} onPress={() => router.push({ pathname: "/listings/[id]", params: { id: item.id } })} />
          )}
          contentContainerStyle={styles.list}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={more ? <ActivityIndicator color={colors.green} style={{ marginVertical: spacing.lg }} /> : null}
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
  filters: { gap: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  list: { padding: spacing.lg, gap: spacing.lg },
  spinner: { marginTop: spacing["2xl"] },
});
