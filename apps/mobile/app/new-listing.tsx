import { useEffect, useMemo, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { ImagePlus, X } from "lucide-react-native";
import type { ListingCondition } from "@swap/types";
import { COUNTRIES, COUNTRY_BY_ID, TOP_LEVEL_CATEGORIES, citiesByCountry } from "@swap/config";
import { localizedName } from "@swap/ui";
import { supabase } from "../src/lib/supabase";
import { api } from "../src/lib/api";
import { pickImages, uploadListingImage, type PickedImage } from "../src/lib/upload";
import { locale, t } from "../src/i18n";
import { colors, radii, spacing } from "../src/theme";
import { Button, Checkbox, Icon, Input, SegmentedControl, Select, Textarea } from "../src/components/ui";

const MAX_IMAGES = 4; // free plan; the backend enforces the real cap on sign/add

/**
 * Create a listing (web `NewListingForm`, flattened to a single scroll). Submit:
 * `api.createListing` → upload each picked image in order (sort_order = cover
 * first) → route into the new listing. Images upload via the shared
 * sign→uploadToSignedUrl→addListingImage pipeline (see src/lib/upload).
 */
export default function NewListing() {
  const router = useRouter();
  const [images, setImages] = useState<PickedImage[]>([]);
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<string>();
  const [condition, setCondition] = useState<ListingCondition>("used");
  const [countryId, setCountryId] = useState<string>();
  const [cityId, setCityId] = useState<string>();
  const [description, setDescription] = useState("");
  const [wanted, setWanted] = useState("");
  const [openToAny, setOpenToAny] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categoryOptions = useMemo(
    () => TOP_LEVEL_CATEGORIES.map((c) => ({ value: c.id, label: localizedName(c, locale) })),
    [],
  );
  const countryOptions = useMemo(() => COUNTRIES.map((c) => ({ value: c.id, label: localizedName(c, locale) })), []);
  const cityOptions = useMemo(
    () => (countryId ? citiesByCountry(countryId).map((c) => ({ value: c.id, label: localizedName(c, locale) })) : []),
    [countryId],
  );
  useEffect(() => setCityId(undefined), [countryId]);

  async function addPhotos() {
    const remaining = MAX_IMAGES - images.length;
    if (remaining <= 0) return;
    const picked = await pickImages(remaining);
    if (picked.length) setImages((prev) => [...prev, ...picked].slice(0, MAX_IMAGES));
  }

  async function submit() {
    setError(null);
    if (title.trim().length < 3) return setError(t("auth.errorGeneric"));
    if (!categoryId) return setError(t("common.selectCategory"));
    if (!countryId || !cityId) return setError(t("common.selectCity"));

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      router.push("/login");
      return;
    }

    setBusy(true);
    setStatus(t("newListing.submit"));
    try {
      const listing = await api.createListing({
        category_id: categoryId,
        country_id: countryId,
        city_id: cityId,
        title: title.trim(),
        description: description.trim(),
        condition,
        wanted_exchange: openToAny ? "__any__" : wanted.trim(),
      });
      // Best-effort per image, in array order (index → sort_order → cover first).
      for (let i = 0; i < images.length; i++) {
        setStatus(`${t("newListing.images")} ${i + 1}/${images.length}`);
        try {
          await uploadListingImage(listing.id, images[i]);
        } catch {
          /* skip a failed image — the listing still exists */
        }
      }
      router.replace({ pathname: "/listings/[id]", params: { id: listing.id } });
    } catch {
      setError(t("auth.errorGeneric"));
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t("newListing.title") }} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Photos */}
          <View>
            <Text style={styles.label}>{t("newListing.images")}</Text>
            <Text style={styles.hint}>{t("newListing.imagesHint", { max: MAX_IMAGES })}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {images.map((img, i) => (
                <View key={img.uri} style={styles.thumbBox}>
                  <Image source={{ uri: img.uri }} style={styles.thumb} />
                  {i === 0 ? (
                    <View style={styles.coverTag}>
                      <Text style={styles.coverText}>{t("newListing.cover")}</Text>
                    </View>
                  ) : null}
                  <Pressable
                    onPress={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    style={styles.removeBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t("newListing.removeImage")}
                  >
                    <Icon icon={X} size={14} color={colors.white} />
                  </Pressable>
                </View>
              ))}
              {images.length < MAX_IMAGES ? (
                <Pressable onPress={addPhotos} style={styles.addTile} accessibilityRole="button" accessibilityLabel={t("newListing.addImage")}>
                  <Icon icon={ImagePlus} size={26} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </ScrollView>
          </View>

          <Input label={t("newListing.fieldTitle")} value={title} onChangeText={setTitle} />

          <Select
            label={t("newListing.fieldCategory")}
            placeholder={t("common.selectCategory")}
            value={categoryId}
            onChange={setCategoryId}
            options={categoryOptions}
          />

          <View>
            <Text style={styles.label}>{t("newListing.fieldCondition")}</Text>
            <SegmentedControl
              segments={[
                { value: "new", label: t("mobile.detail.conditions.new") },
                { value: "used", label: t("mobile.detail.conditions.used") },
              ]}
              value={condition}
              onChange={setCondition}
            />
          </View>

          <Select
            label={t("newListing.fieldCountry")}
            placeholder={t("auth.country")}
            value={countryId}
            onChange={setCountryId}
            options={countryOptions}
          />
          {countryId ? (
            <Select
              label={t("newListing.fieldCity")}
              placeholder={t("auth.city")}
              value={cityId}
              onChange={setCityId}
              options={cityOptions}
            />
          ) : null}

          <Textarea label={t("newListing.fieldDescription")} value={description} onChangeText={setDescription} maxLength={2000} />

          <Checkbox checked={openToAny} onChange={setOpenToAny} label={t("newListing.fieldOpenToAny")} />
          {openToAny ? (
            <Text style={styles.hint}>{t("newListing.fieldOpenToAnyHint")}</Text>
          ) : (
            <Textarea label={t("newListing.fieldWanted")} value={wanted} onChangeText={setWanted} maxLength={500} />
          )}

          <Text style={styles.safety}>{t("safety.points.meetPublic")}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={t("newListing.submit")} onPress={submit} loading={busy} fullWidth />
          {busy && status ? <Text style={styles.status}>{status}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["3xl"] },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: spacing.xs },
  hint: { color: colors.textFaint, fontSize: 12, marginBottom: spacing.sm },
  photoRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  thumbBox: { position: "relative", width: 96, height: 96 },
  thumb: { width: 96, height: 96, borderRadius: radii.md, backgroundColor: colors.elevated },
  coverTag: {
    position: "absolute",
    bottom: spacing.xs,
    left: spacing.xs,
    backgroundColor: colors.green,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coverText: { color: colors.navy, fontSize: 10, fontWeight: "800" },
  removeBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  addTile: {
    width: 96,
    height: 96,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    backgroundColor: colors.elevated,
    alignItems: "center",
    justifyContent: "center",
  },
  safety: { color: colors.textMuted, fontSize: 12, lineHeight: 17 },
  error: { color: colors.danger, fontSize: 13 },
  status: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
});
