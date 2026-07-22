import { Screen } from "../../src/components/Screen";
import { EmptyState } from "../../src/components/EmptyState";
import { t } from "../../src/i18n";

export default function Profile() {
  return (
    <Screen>
      <EmptyState icon="👤" title={t("mobile.soon.title")} subtitle={t("mobile.soon.profile")} />
    </Screen>
  );
}
