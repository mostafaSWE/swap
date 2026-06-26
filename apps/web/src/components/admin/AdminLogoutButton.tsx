"use client";

import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "@/i18n/navigation";

export function AdminLogoutButton() {
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="inline-flex h-11 w-11 items-center justify-center rounded-pill border border-line bg-surface text-muted hover:bg-elevated hover:text-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/40"
      aria-label="Logout"
    >
      <LogOut className="h-4 w-4" aria-hidden />
    </button>
  );
}
