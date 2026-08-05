import { useState } from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronLeft, ChevronRight, ImagePlus, X } from "lucide-react-native";
import { FREE_PLAN_MAX_IMAGES } from "@swap/config";
import { getListingById } from "@swap/api";
import type { ListingImage } from "@swap/types";
import { api } from "../lib/api";
import { pickImages, uploadListingImage } from "../lib/upload";
import { supabase } from "../lib/supabase";
import { useTerms } from "../lib/terms";
import { t } from "../i18n";
import { colors, radii, spacing } from "../theme";
import { Icon } from "./ui";

/** Native implementation of the web ListingImageManager. Every add/remove/order
 * operation uses the owner-checked API and persists immediately. */
export function ListingImageManager({ listingId, initialImages }: { listingId: string; initialImages: ListingImage[] }) {
  const { ensureAccepted } = useTerms();
  const [images, setImages] = useState(() => [...initialImages].sort((a, b) => a.sort_order - b.sort_order));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const listing = await getListingById(supabase, listingId);
    if (listing) setImages([...listing.images].sort((a, b) => a.sort_order - b.sort_order));
  }

  async function add() {
    if (busy) return;
    if (!(await ensureAccepted())) return; // Apple 1.2 — accept Terms before uploading UGC
    const selected = await pickImages(FREE_PLAN_MAX_IMAGES - images.length);
    if (!selected.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const image of selected) await uploadListingImage(listingId, image);
      await refresh();
    } catch {
      setError(t("editListing.imageError"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(imageId: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.removeListingImage(listingId, imageId);
      setImages((current) => current.filter((image) => image.id !== imageId));
    } catch {
      setError(t("editListing.imageError"));
    } finally {
      setBusy(false);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (busy || target < 0 || target >= images.length) return;
    const next = [...images];
    [next[index], next[target]] = [next[target]!, next[index]!];
    setImages(next);
    setBusy(true);
    setError(null);
    try {
      await api.reorderListingImages(listingId, next.map((image) => image.id));
    } catch {
      setError(t("editListing.imageError"));
      await refresh().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {images.map((image, index) => (
          <View key={image.id} style={styles.tile}>
            <Image source={{ uri: image.image_url }} style={styles.image} />
            {index === 0 ? <View style={styles.cover}><Text style={styles.coverText}>{t("newListing.cover")}</Text></View> : null}
            <Pressable onPress={() => remove(image.id)} disabled={busy} style={styles.remove} accessibilityRole="button" accessibilityLabel={t("newListing.removeImage")}>
              <Icon icon={X} size={14} color={colors.white} />
            </Pressable>
            {images.length > 1 ? <View style={styles.order}>
              <Pressable onPress={() => move(index, -1)} disabled={busy || index === 0} accessibilityRole="button" accessibilityLabel={t("newListing.moveBack")}><Icon icon={ChevronLeft} size={16} color={colors.white} mirror /></Pressable>
              <Pressable onPress={() => move(index, 1)} disabled={busy || index === images.length - 1} accessibilityRole="button" accessibilityLabel={t("newListing.moveForward")}><Icon icon={ChevronRight} size={16} color={colors.white} mirror /></Pressable>
            </View> : null}
          </View>
        ))}
        {images.length < FREE_PLAN_MAX_IMAGES ? <Pressable onPress={add} disabled={busy} style={styles.add} accessibilityRole="button" accessibilityLabel={t("newListing.addImage")}>
          {busy ? <ActivityIndicator color={colors.green} /> : <Icon icon={ImagePlus} size={25} color={colors.textMuted} />}
        </Pressable> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  tile: { width: "23%", aspectRatio: 1, position: "relative", overflow: "hidden", borderRadius: radii.md, backgroundColor: colors.elevated },
  image: { width: "100%", height: "100%" },
  cover: { position: "absolute", top: 4, left: 4, backgroundColor: colors.green, borderRadius: radii.sm, paddingHorizontal: 4, paddingVertical: 2 },
  coverText: { color: colors.navy, fontSize: 9, fontWeight: "800" },
  remove: { position: "absolute", top: 4, end: 4, width: 22, height: 22, borderRadius: radii.pill, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.65)" },
  order: { position: "absolute", bottom: 0, start: 0, end: 0, flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4, paddingVertical: 3, backgroundColor: "rgba(0,0,0,0.52)" },
  add: { width: "23%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: radii.md, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, backgroundColor: colors.elevated },
  error: { color: colors.danger, fontSize: 12 },
});
