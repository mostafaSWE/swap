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
    <div className="app-container flex min-h-dvh flex-col">
      {hideTopBar ? null : <TopBar />}
      <main className="flex-1">{children}</main>
      {hideNav ? null : <MobileBottomNav />}
    </div>
  );
}
