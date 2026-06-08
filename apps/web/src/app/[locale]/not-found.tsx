import { useTranslations } from "next-intl";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/primitives";
import { CTAButton } from "@/components/CTAButton";

export default function NotFound() {
  const t = useTranslations("nav");
  return (
    <AppShell hideNav>
      <EmptyState
        title="404"
        description="—"
        action={<CTAButton href="/">{t("home")}</CTAButton>}
      />
    </AppShell>
  );
}
