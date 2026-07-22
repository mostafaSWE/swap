import { Screen } from "../../src/components/Screen";
import { EmptyState } from "../../src/components/EmptyState";
import { t } from "../../src/i18n";

export default function Profile() {
  return (
    <Screen>
      <EmptyState icon="👤" title={t("common.soon")} subtitle={t("profile.soon")} />
    </Screen>
  );
}
