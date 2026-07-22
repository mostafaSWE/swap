import { Screen } from "../../src/components/Screen";
import { EmptyState } from "../../src/components/EmptyState";
import { t } from "../../src/i18n";

export default function Messages() {
  return (
    <Screen>
      <EmptyState icon="💬" title={t("common.soon")} subtitle={t("messages.soon")} />
    </Screen>
  );
}
