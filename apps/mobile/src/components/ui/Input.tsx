import { forwardRef } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { colors, radii, spacing } from "../../theme";

type FieldProps = { label?: string; hint?: string; error?: string } & TextInputProps;

/** Labeled text field (web `FormInput`). Text/placeholder align to start
 *  automatically under RTL; the label/hint row is space-between so it swaps. */
export const Input = forwardRef<TextInput, FieldProps>(function Input(
  { label, hint, error, style, multiline, ...props },
  ref,
) {
  return (
    <View style={styles.wrap}>
      {label || hint ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label ?? ""}</Text>
          {hint ? <Text style={styles.hint}>{hint}</Text> : null}
        </View>
      ) : null}
      <TextInput
        ref={ref}
        multiline={multiline}
        placeholderTextColor={colors.textFaint}
        style={[styles.input, multiline && styles.multiline, !!error && styles.inputError, style]}
        {...props}
      />
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
  multiline: { minHeight: 96, paddingTop: spacing.md },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 12 },
});
