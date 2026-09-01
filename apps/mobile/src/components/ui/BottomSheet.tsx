import type { ReactNode } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxHeight?: `${number}%` | number;
  sheetStyle?: StyleProp<ViewStyle>;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  footer,
  maxHeight = "78%",
  sheetStyle,
}: BottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityRole="button"
          style={StyleSheet.absoluteFillObject}
          onPress={onClose}
        />
        <View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + 16, maxHeight },
            sheetStyle,
          ]}
        >
          <View className="items-center py-3">
            <View className="h-1 w-12 rounded-full bg-brand-border" />
          </View>
          {title ? (
            <Text className="px-6 pb-4 font-sans-bold text-lg text-white">
              {title}
            </Text>
          ) : null}
          {children}
          {footer}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.88)",
  },
  sheet: {
    width: "100%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#121212",
    elevation: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
});
