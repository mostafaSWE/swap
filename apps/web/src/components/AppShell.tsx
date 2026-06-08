import { TopBar } from "./TopBar";
import { MobileBottomNav } from "./MobileBottomNav";

/**
 * Standard app chrome: top bar + scrollable content + bottom navigation.
 * Use on the main user-facing pages. Pass `hideNav`/`hideTopBar` for focused
 * flows (e.g. auth) where the chrome is not wanted.
 */
export function AppShell({
  children,
  hideTopBar,
  hideNav,
}: {
  children: React.ReactNode;
  hideTopBar?: boolean;
  hideNav?: boolean;
}) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col bg-canvas md:max-w-6xl md:bg-transparent">
      {hideTopBar ? null : <TopBar />}
      {/* Extra bottom padding on mobile to clear the fixed bottom nav. */}
      <main className={hideNav ? "flex-1" : "flex-1 pb-20 md:pb-6"}>{children}</main>
      {hideNav ? null : <MobileBottomNav />}
    </div>
  );
}
