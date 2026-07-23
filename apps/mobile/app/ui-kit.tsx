import type { ReactNode } from "react";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Star } from "lucide-react-native";
import { colors, spacing } from "../src/theme";
import {
  Avatar,
  Badge,
  Button,
  Checkbox,
  Chip,
  Divider,
  Icon,
  Input,
  RatingStars,
  Select,
  StatCell,
  Textarea,
} from "../src/components/ui";

/** Dev-only preview of the RN primitive kit (like /m0-check). Not a tab —
 *  reached via the `justswap://ui-kit` route. Used to verify the kit renders
 *  correctly in both LTR and RTL. */
export default function UiKit() {
  const [rating, setRating] = useState(3);
  const [checked, setChecked] = useState(false);
  const [country, setCountry] = useState<string>();
  const [text, setText] = useState("");

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Section title="Buttons">
        <Button label="Primary" onPress={() => undefined} />
        <Button label="Secondary" variant="secondary" onPress={() => undefined} />
        <Button label="Danger" variant="danger" onPress={() => undefined} />
        <Button label="Loading" loading />
      </Section>

      <Section title="Badges">
        <View style={styles.rowWrap}>
          <Badge label="Active" tone="positive" />
          <Badge label="Pending" tone="warning" />
          <Badge label="Disputed" tone="danger" />
          <Badge label="Countered" tone="info" />
          <Badge label="Confirming" tone="special" />
          <Badge label="Hidden" tone="neutral" />
        </View>
      </Section>

      <Section title="Avatar · Stats · Rating">
        <View style={styles.rowCenter}>
          <Avatar name="Ahmed" size="lg" />
          <View style={styles.stats}>
            <StatCell value={12} label="Swaps" />
            <StatCell value="4.8" label="Rating" />
            <StatCell value={30} label="Listings" />
          </View>
        </View>
        <RatingStars value={rating} onChange={setRating} size="lg" label="Rate" />
      </Section>

      <Section title="Chips">
        <View style={styles.rowWrap}>
          <Chip label="All" active />
          <Chip label="Electronics" onPress={() => undefined} />
          <Chip label="Cars" onPress={() => undefined} />
        </View>
      </Section>

      <Section title="Inputs · Select · Checkbox">
        <Input label="Title" hint="required" placeholder="Enter a title" />
        <Select
          label="Country"
          placeholder="Select a country"
          value={country}
          onChange={setCountry}
          options={[
            { value: "sa", label: "Saudi Arabia" },
            { value: "ae", label: "United Arab Emirates" },
            { value: "qa", label: "Qatar" },
            { value: "kw", label: "Kuwait" },
          ]}
        />
        <Textarea label="Description" placeholder="Describe your item" value={text} onChangeText={setText} />
        <Checkbox checked={checked} onChange={setChecked} label="I accept the terms" hint="Required to post" />
      </Section>

      <Section title="Icon">
        <Icon icon={Star} color={colors.warning} size={28} />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
      <Divider />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg },
  section: { gap: spacing.md },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: "800" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  rowCenter: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stats: { flex: 1, flexDirection: "row" },
});
