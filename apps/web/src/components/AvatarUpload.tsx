"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { STORAGE_BUCKETS } from "@swap/config";
import { updateProfile } from "@swap/api";
import { createClient } from "@/lib/supabase/client";
import { ProfileAvatar } from "./ProfileAvatar";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Avatar picker + uploader. Uploads to the public `avatars` bucket at a fixed,
 * extension-stable key `{userId}/avatar` (RLS: owner-write) so re-uploads
 * overwrite in place (no orphans), and PERSISTS `profiles.avatar_url` itself —
 * picking a photo is the action, so it can't be lost by skipping the surrounding
 * form. It also reports the URL up so the parent's local state stays in sync.
 * Validates type + size client-side. The caller must be the signed-in user.
 */
export function AvatarUpload({
  userId,
  name,
  value,
  onUploaded,
}: {
  userId: string;
  name?: string | null;
  value?: string | null;
  onUploaded: (url: string) => void;
}) {
  const t = useTranslations("onboarding");
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState<string | null>(value ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the user re-pick the same file after an error
    if (!file) return;
    setError(null);
    // Trust the MIME type (not the filename) for both validation and routing.
    if (!EXT_BY_TYPE[file.type]) {
      setError(t("avatarType"));
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(t("avatarSize"));
      return;
    }
    setBusy(true);
    try {
      const supabase = createClient();
      // Fixed key (no extension): one object per user, re-upload overwrites in place.
      const path = `${userId}/avatar`;
      const { error: upErr } = await supabase.storage
        .from(STORAGE_BUCKETS.avatars)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(STORAGE_BUCKETS.avatars).getPublicUrl(path);
      // The key is stable (upsert), so cache-bust the public URL.
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
      // Persist immediately — picking a photo IS the action; don't let "Skip" lose it.
      await updateProfile(supabase, userId, { avatar_url: publicUrl });
      setUrl(publicUrl);
      onUploaded(publicUrl);
    } catch {
      setError(t("avatarError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={t("avatarChange")}
        className="relative rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-swap"
      >
        <ProfileAvatar src={url} name={name} size="lg" />
        <span className="absolute -end-1 -bottom-1 flex h-8 w-8 items-center justify-center rounded-full bg-swap text-white shadow-card">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Camera className="h-4 w-4" aria-hidden />}
        </span>
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onPick} />
      <span className="text-xs text-muted">{t("avatarHint")}</span>
      <p role="alert" aria-live="polite" className="min-h-4 text-xs text-danger">
        {error}
      </p>
    </div>
  );
}
