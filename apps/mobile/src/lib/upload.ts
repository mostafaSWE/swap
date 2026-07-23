import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { STORAGE_BUCKETS } from "@swap/config";
import { supabase } from "./supabase";
import { api } from "./api";

export type PickedImage = {
  uri: string;
  base64: string | null;
  fileName: string;
  mimeType: string;
  fileSize?: number;
};

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // matches the storage bucket file_size_limit

/**
 * Launch the system photo library and return the picked images (with base64 so
 * we can upload the bytes — `uploadToSignedUrl` needs bytes, and RN's picker
 * only hands back a URI). `quality: 0.7` re-encodes to keep files under the 5 MB
 * bucket cap. `mediaTypes` is omitted → images only (the default).
 */
export async function pickImages(limit: number): Promise<PickedImage[]> {
  const res = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: limit > 1,
    selectionLimit: limit,
    quality: 0.7,
    base64: true,
  });
  if (res.canceled) return [];
  return res.assets.map((a, i) => ({
    uri: a.uri,
    base64: a.base64 ?? null,
    fileName: a.fileName ?? `photo-${i}.jpg`,
    mimeType: a.mimeType ?? "image/jpeg",
    fileSize: a.fileSize,
  }));
}

/**
 * Upload one picked image to a listing, mirroring the web pipeline:
 * sign (server derives the `{uid}/{listingId}/…` path + a token) → upload the
 * bytes to that signed URL → register the `listing_images` row with the public
 * URL. Returns the public URL; throws on any failure so the caller can count it.
 */
export async function uploadListingImage(listingId: string, img: PickedImage): Promise<string> {
  if (!img.base64) throw new Error("missing image bytes");
  const { path, token } = await api.signListingImageUpload(listingId, img.fileName);
  const contentType = ALLOWED_MIME.includes(img.mimeType) ? img.mimeType : "image/jpeg";
  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKETS.listingImages)
    .uploadToSignedUrl(path, token, decode(img.base64), { contentType });
  if (upErr) throw upErr;
  const { data } = supabase.storage.from(STORAGE_BUCKETS.listingImages).getPublicUrl(path);
  await api.addListingImage(listingId, data.publicUrl);
  return data.publicUrl;
}
