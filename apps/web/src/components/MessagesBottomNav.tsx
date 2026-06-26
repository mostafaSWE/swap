"use client";

import { usePathname } from "@/i18n/navigation";
import { MobileBottomNav } from "./MobileBottomNav";

/**
 * Route-aware bottom nav for the messages section. The nav stays visible on the
 * conversation list (/messages) so users can switch tabs, but hides inside a
 * chat room (/messages/[id]) where the message composer occupies the bottom of
 * the screen and a fixed nav would overlap it.
 */
export function MessagesBottomNav({ isAuthenticated }: { isAuthenticated: boolean }) {
  const pathname = usePathname();
  const inRoom = pathname.startsWith("/messages/");
  if (inRoom) return null;
  return <MobileBottomNav isAuthenticated={isAuthenticated} />;
}
