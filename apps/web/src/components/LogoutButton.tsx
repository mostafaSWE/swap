"use client";

import { LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";

export function LogoutButton() {
  const t = useTranslations("nav");
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button type="button" onClick={logout} className="btn-secondary w-full">
      <LogOut className="h-5 w-5" aria-hidden />
      {t("logout")}
    </button>
  );
}
