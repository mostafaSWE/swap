import { TopBar } from "./TopBar";
import { MobileBottomNav } from "./MobileBottomNav";
import { Footer } from "./Footer";
import { getCurrentUser } from "@/lib/auth";

/**
 * Standard app chrome: top bar + scrollable content + bottom navigation.
 * Use on the main user-facing pages. Pass `hideNav`/`hideTopBar` for focused
 * flows (e.g. auth) where the chrome is not wanted.
 */
export async function AppShell({
  children,
  hideTopBar,
  hideNav,
  hideFooter,
}: {
  children: React.ReactNode;
  hideTopBar?: boolean;
  hideNav?: boolean;
  hideFooter?: boolean;
}) {
  const user = await getCurrentUser();
  const isAuthenticated = Boolean(user);

  return (
    <div className="flex min-h-dvh w-full flex-col bg-canvas">
      {hideTopBar ? null : <TopBar isAuthenticated={isAuthenticated} />}
      {/* Extra bottom padding on mobile to clear the fixed bottom nav. */}
      <main className={hideNav ? "flex-1" : "flex-1 pb-20 md:pb-6"}>{children}</main>
      {hideNav || hideFooter ? null : <Footer />}
      {hideNav ? null : <MobileBottomNav isAuthenticated={isAuthenticated} />}
    </div>
  );
}
