import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { LifeBuoy, Mail } from "lucide-react-native";
import { colors, radii, spacing } from "../src/theme";
import { t, tList } from "../src/i18n";
import { Button, Card, Icon } from "../src/components/ui";

type Topic = { title: string; description: string };

/**
 * Support / contact screen (web `/support`). The ONLY contact channel is email —
 * `support@justswap.app` — surfaced as a mailto. Gives an App-Review reviewer a
 * discoverable published contact point (Apple 1.2 pillar). Reachable from the
 * Profile tab and the Terms/legal screens.
 */
export default function SupportScreen() {
  const router = useRouter();
  const email = t("support.email");
  const topics = tList<Topic>("support.topics");

  async function emailUs() {
    const url = `mailto:${email}`;
    const ok = await Linking.canOpenURL(url).catch(() => false);
    if (ok) Linking.openURL(url).catch(() => undefined);
  }

  return (
    <>
      <Stack.Screen options={{ title: t("support.title") }} />
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.eyebrowRow}>
            <Icon icon={LifeBuoy} size={16} color={colors.green} />
            <Text style={styles.eyebrow}>{t("support.eyebrow")}</Text>
          </View>
          <Text style={styles.title}>{t("support.title")}</Text>
          <Text style={styles.subtitle}>{t("support.subtitle")}</Text>
        </View>

        <Card style={styles.emailCard}>
          <View style={styles.eyebrowRow}>
            <Icon icon={Mail} size={18} color={colors.green} />
            <Text style={styles.cardTitle}>{t("support.emailTitle")}</Text>
          </View>
          <Text style={styles.cardNote}>{t("support.emailNote")}</Text>
          <Text style={styles.email} selectable>{email}</Text>
          <Button label={t("support.emailCta")} onPress={emailUs} fullWidth leftIcon={<Icon icon={Mail} size={18} color={colors.navy} />} />
        </Card>

        <Text style={styles.section}>{t("support.topicsTitle")}</Text>
        <View style={styles.topics}>
          {topics.map((topic, i) => (
            <Card key={i} style={styles.topic}>
              <Text style={styles.topicTitle}>{topic.title}</Text>
              <Text style={styles.topicDesc}>{topic.description}</Text>
            </Card>
          ))}
        </View>

        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>{t("support.reportTitle")}</Text>
          <Text style={styles.cardNote}>{t("support.reportNote")}</Text>
        </Card>

        <Card style={styles.infoCard}>
          <Text style={styles.cardTitle}>{t("support.selfServeTitle")}</Text>
          <Text style={styles.cardNote}>{t("support.selfServeNote")}</Text>
          <Button variant="secondary" label={t("terms.title")} onPress={() => router.push("/terms")} fullWidth />
        </Card>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing["3xl"] },
  header: { gap: spacing.xs },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  eyebrow: { color: colors.green, fontSize: 13, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 },
  title: { color: colors.text, fontSize: 24, fontWeight: "800" },
  subtitle: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  emailCard: { gap: spacing.sm },
  cardTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  cardNote: { color: colors.textMuted, fontSize: 14, lineHeight: 21 },
  email: { color: colors.green, fontSize: 16, fontWeight: "800", paddingVertical: spacing.xs },
  section: { color: colors.text, fontSize: 16, fontWeight: "800", marginTop: spacing.sm },
  topics: { gap: spacing.sm },
  topic: { gap: 4, borderRadius: radii.md },
  topicTitle: { color: colors.text, fontSize: 15, fontWeight: "700" },
  topicDesc: { color: colors.textMuted, fontSize: 13, lineHeight: 19 },
  infoCard: { gap: spacing.sm },
});
