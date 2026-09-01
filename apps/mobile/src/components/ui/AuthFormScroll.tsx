import type { ReactNode } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

interface AuthFormScrollProps {
  children: ReactNode;
  bottomInset: number;
  topInset: number;
}

export function AuthFormScroll({
  children,
  bottomInset,
  topInset,
}: AuthFormScrollProps) {
  return (
    <KeyboardAwareScrollView
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: topInset,
        paddingBottom: bottomInset + 24,
        paddingHorizontal: 24,
      }}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </KeyboardAwareScrollView>
  );
}
