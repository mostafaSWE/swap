import { useEffect, useMemo, useState } from "react";
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { ArrowLeftRight, Check, ChevronLeft, ChevronRight, ImagePlus, Repeat2, X } from "lucide-react-native";
import type { ListingCondition } from "@swap/types";
import { COUNTRIES, COUNTRY_BY_ID, FREE_PLAN_MAX_IMAGES, TOP_LEVEL_CATEGORIES, citiesByCountry } from "@swap/config";
import { localizedName } from "@swap/ui";
import { supabase } from "../src/lib/supabase";
import { api } from "../src/lib/api";
import { acquireImages, uploadListingImage, type PickedImage } from "../src/lib/upload";
import { useTerms } from "../src/lib/terms";
import { locale, t } from "../src/i18n";
import { colors, radii, spacing } from "../src/theme";
import { Button, Checkbox, FormAlert, Icon, Input, SegmentedControl, Select, Textarea } from "../src/components/ui";
import { ItemArtwork } from "../src/components/ItemArtwork";
import { SafetyDisclaimer } from "../src/components/SafetyDisclaimer";

/**
 * Create a listing (web `NewListingForm`) in the same three phone-width steps:
 * photos/title/category → condition/location/description → wanted/preview/safety.
 * Submit:
 * `api.createListing` → upload each picked image in order (sort_order = cover
 * first) → route into the new listing. Images upload via the shared
 * sign→uploadToSignedUrl→addListingImage pipeline (see src/lib/upload).
 */
export default function NewListing() {
  const router = useRouter();
  const { ensureAccepted } = useTerms();
  const [step, setStep] = useState(1);
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
  const [titleError, setTitleError] = useState<string | null>(null);

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
    const remaining = FREE_PLAN_MAX_IMAGES - images.length;
    if (remaining <= 0) return;
    const picked = await acquireImages(remaining);
    if (picked.length) setImages((prev) => [...prev, ...picked].slice(0, FREE_PLAN_MAX_IMAGES));
  }

  /** Reorder photos locally (index 0 = cover). Purely local — these upload in
   *  order on submit, so no API call is needed until publish. */
  function movePhoto(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    setImages((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target]!, next[index]!];
      return next;
    });
  }

  function next() {
    setError(null);
    setTitleError(null);
    if (step === 1) {
      if (title.trim().length < 3) return setTitleError(t("newListing.titleShort"));
      if (!categoryId) return setError(t("common.selectCategory"));
    }
    if (step === 2 && (!countryId || !cityId)) return setError(t("common.selectCity"));
    setStep((current) => Math.min(3, current + 1));
  }

  function back() {
    setError(null);
    if (step === 1) router.back();
    else setStep((current) => current - 1);
  }

  async function submit() {
    setError(null);
    setTitleError(null);
    // Jump back to the offending step so the user can fix it.
    if (title.trim().length < 3) { setStep(1); return setTitleError(t("newListing.titleShort")); }
    if (!categoryId) { setStep(1); return setError(t("common.selectCategory")); }
    if (!countryId || !cityId) { setStep(2); return setError(t("common.selectCity")); }

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      router.push("/login");
      return;
    }
    // Apple 1.2 — a listing is UGC; require accepted Terms before publishing.
    if (!(await ensureAccepted())) return;

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
          <View style={styles.heading}>
            <Text style={styles.pageTitle}>{t("newListing.title")}</Text>
            <Text style={styles.hint}>{t("newListing.step", { current: step, total: 3 })}</Text>
          </View>
          <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 1, max: 3, now: step }}>
            {[1, 2, 3].map((item) => <View key={item} style={[styles.progressPart, item <= step && styles.progressPartActive]} />)}
          </View>

          {step === 1 ? (
            <>
              <View>
                <Text style={styles.label}>{t("newListing.images")}</Text>
                <Text style={styles.hint}>{t("newListing.imagesHint", { max: FREE_PLAN_MAX_IMAGES })}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
                  {images.map((img, i) => (
                    <View key={img.uri} style={styles.thumbBox}>
                      <Image source={{ uri: img.uri }} style={styles.thumb} />
                      {i === 0 ? <View style={styles.coverTag}><Text style={styles.coverText}>{t("newListing.cover")}</Text></View> : null}
                      <Pressable onPress={() => setImages((prev) => prev.filter((_, j) => j !== i))} style={styles.removeBtn} accessibilityRole="button" accessibilityLabel={t("newListing.removeImage")}>
                        <Icon icon={X} size={14} color={colors.white} />
                      </Pressable>
                      {images.length > 1 ? (
                        <View style={styles.moveRow}>
                          <Pressable onPress={() => movePhoto(i, -1)} disabled={i === 0} hitSlop={4} accessibilityRole="button" accessibilityLabel={t("newListing.moveBack")}>
                            <Icon icon={ChevronLeft} size={16} color={i === 0 ? colors.textFaint : colors.white} mirror />
                          </Pressable>
                          <Pressable onPress={() => movePhoto(i, 1)} disabled={i === images.length - 1} hitSlop={4} accessibilityRole="button" accessibilityLabel={t("newListing.moveForward")}>
                            <Icon icon={ChevronRight} size={16} color={i === images.length - 1 ? colors.textFaint : colors.white} mirror />
                          </Pressable>
                        </View>
                      ) : null}
                    </View>
                  ))}
                  {images.length < FREE_PLAN_MAX_IMAGES ? (
                    <Pressable onPress={addPhotos} style={styles.addTile} accessibilityRole="button" accessibilityLabel={t("newListing.addImage")}>
                      <Icon icon={ImagePlus} size={26} color={colors.textMuted} />
                    </Pressable>
                  ) : null}
                </ScrollView>
              </View>
              <Input label={t("newListing.fieldTitle")} value={title} error={titleError ?? undefined} onChangeText={(v) => { setTitle(v); if (titleError) setTitleError(null); }} />
              <Select label={t("newListing.fieldCategory")} placeholder={t("common.selectCategory")} value={categoryId} onChange={setCategoryId} options={categoryOptions} />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <View>
                <Text style={styles.label}>{t("newListing.fieldCondition")}</Text>
                <SegmentedControl segments={[{ value: "new", label: t("mobile.detail.conditions.new") }, { value: "used", label: t("mobile.detail.conditions.used") }]} value={condition} onChange={setCondition} />
              </View>
              <Select label={t("newListing.fieldCountry")} placeholder={t("common.selectCountry")} value={countryId} onChange={setCountryId} options={countryOptions} />
              <Select label={t("newListing.fieldCity")} placeholder={t("common.selectCity")} value={cityId} onChange={setCityId} options={cityOptions} disabled={!countryId} />
              <Textarea label={t("newListing.fieldDescription")} hint={`${description.length}/2000`} value={description} onChangeText={setDescription} maxLength={2000} />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <View style={styles.wantedCard}>
                <Checkbox checked={openToAny} onChange={setOpenToAny} label={t("newListing.fieldOpenToAny")} />
                <Text style={styles.hint}>{t("newListing.fieldOpenToAnyHint")}</Text>
              </View>
              <Textarea label={t("newListing.fieldWanted")} hint={openToAny ? undefined : `${wanted.length}/500`} value={wanted} onChangeText={setWanted} maxLength={500} editable={!openToAny} />
              <ExchangePreview title={title.trim() || t("newListing.yourItem")} imageUrl={images[0]?.uri} categoryId={categoryId} wanted={openToAny ? t("listing.openToAnyExchange") : wanted.trim() || t("listing.openToOffers")} />
              <SafetyDisclaimer text={t("safety.points.userResponsibility")} />
            </>
          ) : null}

          {error ? <FormAlert message={error} /> : null}
          <View style={styles.footer}>
            <View style={styles.footerButton}><Button label={t("common.back")} onPress={back} variant="secondary" fullWidth /></View>
            <View style={styles.footerButton}><Button label={step === 3 ? t("newListing.submit") : t("common.next")} onPress={step === 3 ? submit : next} loading={busy} leftIcon={step === 3 ? <Icon icon={Check} size={18} color={colors.navy} /> : undefined} fullWidth /></View>
          </View>
          {busy && status ? <Text style={styles.status}>{status}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

function ExchangePreview({ title, imageUrl, categoryId, wanted }: { title: string; imageUrl?: string; categoryId?: string; wanted: string }) {
  const category = categoryId ? TOP_LEVEL_CATEGORIES.find((item) => item.id === categoryId) : undefined;
  return (
    <View style={styles.preview} accessibilityLiveRegion="polite">
      <Text style={styles.previewLabel}>{t("newListing.swapPreview")}</Text>
      <View style={styles.previewRow}>
        <View style={styles.previewSide}>
          <Text style={styles.previewEyebrow}>{t("newListing.yourItem")}</Text>
          <ItemArtwork imageUrl={imageUrl} title={title} categoryIcon={category?.icon} style={styles.previewArt} />
          <Text style={styles.previewTitle} numberOfLines={2}>{title}</Text>
        </View>
        <View style={styles.swapIcon}><Icon icon={ArrowLeftRight} size={22} color={colors.white} mirror /></View>
        <View style={[styles.previewSide, styles.previewWanted]}>
          <Text style={styles.previewEyebrow}>{t("newListing.previewWanted")}</Text>
          <View style={styles.repeatIcon}><Icon icon={Repeat2} size={26} color={colors.white} /></View>
          <Text style={styles.previewTitle} numberOfLines={2}>{wanted}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["3xl"] },
  heading: { gap: 2 },
  pageTitle: { color: colors.text, fontSize: 20, fontWeight: "800" },
  progress: { flexDirection: "row", gap: spacing.xs },
  progressPart: { height: 6, flex: 1, borderRadius: radii.pill, backgroundColor: colors.border },
  progressPartActive: { backgroundColor: colors.green },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: "600", marginBottom: spacing.xs },
  hint: { color: colors.textFaint, fontSize: 12, marginBottom: spacing.sm },
  photoRow: { gap: spacing.sm, paddingVertical: spacing.xs },
  thumbBox: { position: "relative", width: 96, height: 96 },
  thumb: { width: 96, height: 96, borderRadius: radii.md, backgroundColor: colors.elevated },
  coverTag: {
    position: "absolute",
    top: spacing.xs,
    start: spacing.xs,
    backgroundColor: colors.green,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  coverText: { color: colors.navy, fontSize: 10, fontWeight: "800" },
  removeBtn: {
    position: "absolute",
    top: -6,
    end: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
  },
  moveRow: {
    position: "absolute",
    bottom: 0,
    start: 0,
    end: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: "rgba(0,0,0,0.5)",
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
  wantedCard: { gap: spacing.xs, backgroundColor: colors.surface, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  preview: { gap: spacing.sm, borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surface, padding: spacing.md },
  previewLabel: { color: colors.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  previewRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  previewSide: { flex: 1, minHeight: 150, alignItems: "center", justifyContent: "space-between", gap: spacing.xs, borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, padding: spacing.sm, backgroundColor: colors.background },
  previewWanted: { borderColor: colors.green, backgroundColor: colors.greenLight },
  previewEyebrow: { color: colors.textMuted, fontSize: 10, fontWeight: "800", textTransform: "uppercase" },
  previewArt: { width: 56, height: 56, borderRadius: radii.md },
  previewTitle: { color: colors.text, fontSize: 12, fontWeight: "800", textAlign: "center" },
  swapIcon: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  repeatIcon: { width: 56, height: 56, borderRadius: radii.md, backgroundColor: colors.green, alignItems: "center", justifyContent: "center" },
  status: { color: colors.textMuted, fontSize: 13, textAlign: "center" },
  footer: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  footerButton: { flex: 1 },
});
