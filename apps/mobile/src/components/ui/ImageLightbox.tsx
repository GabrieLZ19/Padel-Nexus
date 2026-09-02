import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Image } from "expo-image";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ImageLightboxProps {
  uri: string | null;
  visible: boolean;
  onClose: () => void;
}

export function ImageLightbox({ uri, visible, onClose }: ImageLightboxProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black">
        <Pressable
          onPress={onClose}
          className="absolute z-10 h-11 w-11 items-center justify-center rounded-full bg-white/10"
          style={{ top: insets.top + 12, right: 16 }}
          accessibilityRole="button"
          accessibilityLabel="Cerrar imagen"
        >
          <FontAwesome name="times" size={20} color="#FFFFFF" />
        </Pressable>
        {uri ? (
          <Pressable className="flex-1" onPress={onClose}>
            <Image
              source={{ uri }}
              style={{ flex: 1, width: "100%" }}
              contentFit="contain"
            />
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}
