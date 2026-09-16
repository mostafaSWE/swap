import { forwardRef } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { X } from "lucide-react-native";
import { colors, radii, spacing } from "../../theme";
import { Icon } from "./Icon";

type FieldProps = {
  label?: string;
  hint?: string;
  error?: string;
  /** Renders a trailing clear button whenever `value` is non-empty (search fields). */
  onClear?: () => void;
  clearAccessibilityLabel?: string;
} & TextInputProps;

/** Labeled text field (web `FormInput`). Text/placeholder align to start
 *  automatically under RTL; the label/hint row is space-between so it swaps, and
 *  the optional clear button uses the logical `end` edge so it follows suit. */
export const Input = forwardRef<TextInput, FieldProps>(function Input(
  { label, hint, error, style, multiline, onClear, clearAccessibilityLabel, ...props },
  ref,
) {
  const showClear = !!onClear && !multiline && !!props.value;
  return (
    <View style={styles.wrap}>
      {label || hint ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label ?? ""}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
      ) : null}
      <View style={styles.field}>
        <TextInput
          ref={ref}
          multiline={multiline}
          placeholderTextColor={colors.textFaint}
          style={[
            styles.input,
            multiline && styles.multiline,
            !!error && styles.inputError,
            showClear && styles.inputClearable,
            style,
          ]}
          {...props}
        />
        {showClear ? (
          <Pressable
            onPress={onClear}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={clearAccessibilityLabel}
            style={styles.clear}
          >
            <Icon icon={X} size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

/** Multiline variant (web `FormTextarea`). */
export const Textarea = forwardRef<TextInput, FieldProps>(function Textarea(props, ref) {
  return <Input ref={ref} multiline numberOfLines={4} textAlignVertical="top" {...props} />;
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  labelRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  hint: { color: colors.textFaint, fontSize: 12 },
  field: { justifyContent: "center" },
  input: {
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    minHeight: 48,
  },
  /** Keeps typed text from running under the clear button. */
  inputClearable: { paddingEnd: 44 },
  clear: {
    position: "absolute",
    end: spacing.xs,
    top: 0,
    bottom: 0,
    width: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  multiline: { minHeight: 96, paddingTop: spacing.md },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12 },
});
