import * as ImagePicker from "expo-image-picker";
import { decode } from "base64-arraybuffer";
import { STORAGE_BUCKETS } from "@swap/config";
import type { SwapProposalWithRelations } from "@swap/types";
import { updateProfile } from "@swap/api";
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

/**
 * Confirm one side of a completed handover. The confirmation bucket is private,
 * but its RLS policy deliberately allows both proposal parties to view both
 * photos. The server owns the state transition: it atomically records this
 * path and completes the swap only once the other party has confirmed too.
 */
export async function uploadSwapConfirmation(
  proposalId: string,
  img: PickedImage,
): Promise<SwapProposalWithRelations> {
  if (!img.base64) throw new Error("missing image bytes");
  const { path, token } = await api.signConfirmationUpload(proposalId, img.fileName);
  const contentType = ALLOWED_MIME.includes(img.mimeType) ? img.mimeType : "image/jpeg";
  const { error: upErr } = await supabase.storage
    .from(STORAGE_BUCKETS.swapConfirmations)
    .uploadToSignedUrl(path, token, decode(img.base64), { contentType });
  if (upErr) throw upErr;
  return api.confirmSwap(proposalId, { photo_path: path });
}

/** Upload the current user's avatar exactly as the web does: stable object key,
 * public URL cache-busted on each replacement, then immediately persisted. */
export async function uploadAvatar(userId: string, img: PickedImage): Promise<string> {
  if (!img.base64) throw new Error("missing image bytes");
  if (img.fileSize && img.fileSize > MAX_IMAGE_BYTES) throw new Error("image too large");
  const contentType = ALLOWED_MIME.includes(img.mimeType) ? img.mimeType : "image/jpeg";
  const path = `${userId}/avatar`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.avatars)
    .upload(path, decode(img.base64), { upsert: true, contentType });
  if (error) throw error;
  const { data } = supabase.storage.from(STORAGE_BUCKETS.avatars).getPublicUrl(path);
  const url = `${data.publicUrl}?v=${Date.now()}`;
  await updateProfile(supabase, userId, { avatar_url: url });
  return url;
}
