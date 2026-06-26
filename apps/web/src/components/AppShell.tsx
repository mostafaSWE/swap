import { TopBar } from "./TopBar";
import { MobileBottomNav } from "./MobileBottomNav";
import { Footer } from "./Footer";
import { VerifyEmailBanner } from "./VerifyEmailBanner";
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
  // Signed in but email not yet confirmed → the marketplace actions are gated
  // (EmailVerifiedGuard / RLS). Surface a resend-able banner so it's never a silent 403.
  const emailUnverified = Boolean(user && !user.email_confirmed_at && !user.confirmed_at);
  const mainClassName = hideNav
    ? "flex-1"
    : hideFooter
      ? "flex-1 pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-6"
      : "flex-1 md:pb-6";

  return (
    <div className="flex min-h-dvh w-full flex-col bg-canvas">
      {hideTopBar ? null : <TopBar isAuthenticated={isAuthenticated} />}
      {!hideTopBar && emailUnverified && user?.email ? <VerifyEmailBanner email={user.email} /> : null}
      <main className={mainClassName}>{children}</main>
      {hideNav || hideFooter ? null : <Footer />}
      {hideNav ? null : <MobileBottomNav isAuthenticated={isAuthenticated} />}
    </div>
  );
}
