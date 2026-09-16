import { useEffect, useState, type ReactNode } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, View, type StyleProp, type ViewStyle } from "react-native";

/**
 * Cross-platform keyboard avoidance for form screens.
 *
 * **iOS** keeps the stock `<KeyboardAvoidingView behavior="padding">` — it works,
 * and this component must not change it.
 *
 * **Android** needs a different mechanism. Expo SDK 57 ships edge-to-edge, where
 * the window no longer resizes for the IME, so `android:windowSoftInputMode=
 * "adjustResize"` is inert and a `KeyboardAvoidingView` has nothing to react to —
 * which is why every form here passed `behavior={undefined}` on Android and, in
 * practice, let the keyboard sit on top of the fields. Tracking the keyboard
 * height ourselves and reserving it at the bottom restores exactly what
 * `adjustResize` used to do, including the scroll-focused-input-into-view
 * behaviour: shrinking the container fires Android's `ScrollView.onSizeChanged`,
 * which scrolls the focused child back on screen.
 *
 * This is the same technique the chat composer already uses (`app/messages/[id]`),
 * lifted into one component so every form behaves identically on both platforms.
 */
export function KeyboardAvoider({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const keyboardHeight = useAndroidKeyboardHeight();

  if (Platform.OS === "ios") {
    return (
      <KeyboardAvoidingView behavior="padding" style={style}>
        {children}
      </KeyboardAvoidingView>
    );
  }
  return <View style={[style, keyboardHeight > 0 ? { paddingBottom: keyboardHeight } : null]}>{children}</View>;
}

/** Live keyboard height on Android; always 0 elsewhere (no listeners attached). */
function useAndroidKeyboardHeight(): number {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const show = Keyboard.addListener("keyboardDidShow", (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener("keyboardDidHide", () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}
