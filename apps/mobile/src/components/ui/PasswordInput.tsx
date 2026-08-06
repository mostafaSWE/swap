import { forwardRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { Eye, EyeOff } from "lucide-react-native";
import { colors, radii, spacing } from "../../theme";
import { t } from "../../i18n";
import { Icon } from "./Icon";

type Props = {
  label?: string;
  error?: string;
} & Omit<TextInputProps, "secureTextEntry">;

/**
 * Password field with a show/hide eye toggle. Mirrors `Input`'s look but reserves
 * a trailing slot for the reveal button. Pass `autoComplete`/`textContentType`
 * ("current-password" for login, "new-password"/"newPassword" for register/reset)
 * so the OS password manager offers autofill / strong-password suggestions.
 */
export const PasswordInput = forwardRef<TextInput, Props>(function PasswordInput(
  { label, error, style, ...props },
  ref,
) {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.field, !!error && styles.fieldError]}>
        <TextInput
          ref={ref}
          secureTextEntry={!show}
          autoCapitalize="none"
          autoCorrect={false}
          placeholderTextColor={colors.textFaint}
          style={[styles.input, style]}
          {...props}
        />
        <Pressable
          onPress={() => setShow((s) => !s)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={t(show ? "auth.hidePassword" : "auth.showPassword")}
          style={styles.toggle}
        >
          <Icon icon={show ? EyeOff : Eye} size={20} color={colors.textMuted} />
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  label: { color: colors.textMuted, fontSize: 13, fontWeight: "600" },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.elevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingEnd: spacing.sm,
  },
  fieldError: { borderColor: colors.danger },
  input: {
    flex: 1,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    minHeight: 48,
  },
  toggle: { padding: 6 },
  error: { color: colors.danger, fontSize: 12 },
});
