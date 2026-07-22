import { Screen } from "../../src/components/Screen";
import { EmptyState } from "../../src/components/EmptyState";
import { t } from "../../src/i18n";

export default function Browse() {
  return (
    <Screen>
      <EmptyState icon="🔍" title={t("mobile.soon.title")} subtitle={t("mobile.soon.browse")} />
    </Screen>
  );
}
