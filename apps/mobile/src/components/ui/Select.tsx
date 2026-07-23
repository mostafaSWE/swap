import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { colors, radii, spacing } from "../../theme";
import { Icon } from "./Icon";
import { BottomSheet } from "./BottomSheet";

export type SelectOption = { value: string; label: string };

/** Select — a field that opens a BottomSheet of options (web `SelectInput`,
 *  rebuilt for native). Field row + option rows are `flexDirection:row` → they
 *  auto-swap the chevron/check to the correct edge under RTL. */
export function Select({
  value,
  onChange,
  options,
  placeholder = "Select",
  label,
  sheetTitle,
  disabled,
}: {
  value?: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  sheetTitle?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <Pressable
        onPress={() => !disabled && setOpen(true)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled }}
        style={({ pressed }) => [styles.field, pressed && styles.pressed, disabled && styles.disabled]}
      >
        <Text style={[styles.value, !selected && styles.placeholder]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <Icon icon={ChevronDown} size={18} color={colors.textMuted} />
      </Pressable>
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={sheetTitle ?? label ?? placeholder}>
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {options.map((o) => {
            const active = o.value === value;
            return (
              <Pressable
                key={o.value}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={({ pressed }) => [styles.option, pressed && styles.optionPressed]}
              >
                <Text style={[styles.optionLabel, active && styles.optionActive]} numberOfLines={1}>
                  {o.label}
                </Text>
                {active ? <Icon icon={Check} size={18} color={colors.green} /> : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textMuted, fontSize: 13, marginBottom: spacing.xs, fontWeight: "600" },
  field: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
  value: { color: colors.text, fontSize: 15, flex: 1 },
  placeholder: { color: colors.textFaint },
  list: { maxHeight: 360 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  optionPressed: { opacity: 0.6 },
  optionLabel: { color: colors.text, fontSize: 15, flex: 1 },
  optionActive: { color: colors.green, fontWeight: "700" },
});
