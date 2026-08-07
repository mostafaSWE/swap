import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { COUNTRIES, TOP_LEVEL_CATEGORIES, citiesByCountry } from "@swap/config";
import { localizedName } from "@swap/ui";
import type { ListingCondition, ListingWithRelations } from "@swap/types";
import { getListingById } from "@swap/api";
import { api } from "../../../src/lib/api";
import { supabase } from "../../../src/lib/supabase";
import { useTerms } from "../../../src/lib/terms";
import { locale, t } from "../../../src/i18n";
import { colors, spacing } from "../../../src/theme";
import { Eye, EyeOff, Trash2 } from "lucide-react-native";
import { ListingImageManager } from "../../../src/components/ListingImageManager";
import { Badge, Button, Checkbox, FormAlert, Icon, Input, SegmentedControl, Select, Textarea } from "../../../src/components/ui";

/** Owner-only edit screen. The API remains the authority for ownership, status,
 * delete, and image mutations; this mirrors web EditListingForm on mobile. */
export default function EditListing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { ensureAccepted } = useTerms();
  const [listing, setListing] = useState<ListingWithRelations | null | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string>();
  const [condition, setCondition] = useState<ListingCondition>("used");
  const [countryId, setCountryId] = useState<string>();
  const [cityId, setCityId] = useState<string>();
  const [description, setDescription] = useState("");
  const [wanted, setWanted] = useState("");
  const [openToAny, setOpenToAny] = useState(false);
  const [paused, setPaused] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [loaded, { data }] = await Promise.all([getListingById(supabase, id), supabase.auth.getUser()]);
        if (!active) return;
        // Owner-only, and only active/paused listings are editable — never let a
        // completed (swapped)/deleted listing be re-activated via Save.
        if (!loaded || loaded.owner_id !== data.user?.id || (loaded.status !== "active" && loaded.status !== "hidden")) {
          setListing(null);
          return;
        }
        setListing(loaded);
        setTitle(loaded.title);
        setCategoryId(loaded.category_id);
        setCondition(loaded.condition);
        setCountryId(loaded.country_id);
        setCityId(loaded.city_id);
        setDescription(loaded.description);
        setOpenToAny(loaded.wanted_exchange === "__any__");
        setWanted(loaded.wanted_exchange === "__any__" ? "" : loaded.wanted_exchange);
        setPaused(loaded.status === "hidden");
      } catch {
        if (active) setListing(null);
      }
    }
    if (id) void load();
    return () => { active = false; };
  }, [id]);

  const countries = useMemo(() => COUNTRIES.map((country) => ({ value: country.id, label: localizedName(country, locale) })), []);
  const cities = useMemo(() => countryId ? citiesByCountry(countryId).map((city) => ({ value: city.id, label: localizedName(city, locale) })) : [], [countryId]);
  const categories = useMemo(() => TOP_LEVEL_CATEGORIES.map((category) => ({ value: category.id, label: localizedName(category, locale) })), []);

  async function save() {
    if (!listing || busy) return;
    setError(null);
    setTitleError(null);
    if (title.trim().length < 3) return setTitleError(t("newListing.titleShort"));
    if (!categoryId || !countryId || !cityId) return setError(t("common.selectCity"));
    setBusy(true); // flip before the ensureAccepted await so the guard closes immediately
    if (!(await ensureAccepted())) { setBusy(false); return; } // Apple 1.2 — accept Terms before editing content
    try {
      await api.updateListing(listing.id, { title: title.trim(), description: description.trim(), wanted_exchange: openToAny ? "__any__" : wanted.trim(), condition, category_id: categoryId, country_id: countryId, city_id: cityId, status: paused ? "hidden" : "active" });
      router.replace({ pathname: "/listings/[id]", params: { id: listing.id } });
    } catch {
      setError(t("editListing.saveError"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!listing || deleting) return;
    setDeleting(true);
    setError(null);
    try {
      await api.deleteListing(listing.id);
      router.replace("/(tabs)/profile");
    } catch {
      setError(t("editListing.saveError"));
      setDeleting(false);
    }
  }

  if (listing === undefined) return <View style={styles.center}><ActivityIndicator color={colors.green} /></View>;
  if (!listing) return <View style={styles.center}><Text style={styles.error}>{t("mobile.detail.notFound")}</Text></View>;

  return (
    <>
      <Stack.Screen options={{ title: t("editListing.title") }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View><Text style={styles.label}>{t("newListing.images")}</Text><ListingImageManager listingId={listing.id} initialImages={listing.images} /></View>
          <Input label={t("newListing.fieldTitle")} value={title} error={titleError ?? undefined} onChangeText={(v) => { setTitle(v); if (titleError) setTitleError(null); }} />
          <Select label={t("newListing.fieldCategory")} placeholder={t("common.selectCategory")} value={categoryId} onChange={setCategoryId} options={categories} />
          <View><Text style={styles.label}>{t("newListing.fieldCondition")}</Text><SegmentedControl segments={[{ value: "new", label: t("mobile.detail.conditions.new") }, { value: "used", label: t("mobile.detail.conditions.used") }]} value={condition} onChange={setCondition} /></View>
          <Select label={t("newListing.fieldCountry")} placeholder={t("common.selectCountry")} value={countryId} onChange={(value) => { setCountryId(value); setCityId(undefined); }} options={countries} />
          <Select label={t("newListing.fieldCity")} placeholder={t("common.selectCity")} value={cityId} onChange={setCityId} options={cities} disabled={!countryId} />
          <Textarea label={t("newListing.fieldDescription")} hint={`${description.length}/2000`} value={description} onChangeText={setDescription} maxLength={2000} />
          <Checkbox checked={openToAny} onChange={setOpenToAny} label={t("newListing.fieldOpenToAny")} />
          {!openToAny ? <Textarea label={t("newListing.fieldWanted")} hint={`${wanted.length}/500`} value={wanted} onChangeText={setWanted} maxLength={500} /> : null}
          <View style={styles.statusRow}>
            <Badge label={paused ? t("editListing.paused") : t("editListing.active")} tone={paused ? "warning" : "positive"} />
            <View style={styles.flex}>
              <Button
                label={paused ? t("editListing.statusPaused") : t("editListing.statusActive")}
                variant="secondary"
                onPress={() => setPaused((value) => !value)}
                leftIcon={<Icon icon={paused ? EyeOff : Eye} size={16} color={colors.text} />}
                fullWidth
              />
            </View>
          </View>
          {error ? <FormAlert message={error} /> : null}
          <Button label={t("common.save")} onPress={save} loading={busy} fullWidth />
          {confirmDelete ? <View style={styles.deleteConfirm}>
            <Text style={styles.deleteText}>{t("editListing.deleteConfirm")}</Text>
            <View style={styles.deleteActions}><View style={styles.flex}><Button label={t("editListing.deleteYes")} variant="danger" onPress={remove} loading={deleting} fullWidth /></View><View style={styles.flex}><Button label={t("common.cancel")} variant="secondary" onPress={() => setConfirmDelete(false)} disabled={deleting} fullWidth /></View></View>
          </View> : <Button label={t("editListing.delete")} variant="ghost" onPress={() => setConfirmDelete(true)} disabled={busy || deleting} leftIcon={<Icon icon={Trash2} size={16} color={colors.danger} />} fullWidth />}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["3xl"] },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: spacing.xs },
  error: { color: colors.danger, fontSize: 13, textAlign: "center" },
  statusRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  deleteConfirm: { gap: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.lg },
  deleteText: { color: colors.text, fontSize: 14, textAlign: "center" },
  deleteActions: { flexDirection: "row", gap: spacing.sm },
  flex: { flex: 1 },
});
