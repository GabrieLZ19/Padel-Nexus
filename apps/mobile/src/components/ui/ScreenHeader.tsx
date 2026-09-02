import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
}

export function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View
      className="mb-6 flex-row items-center gap-3"
      style={{ paddingTop: insets.top + 8 }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Volver"
        onPress={onBack ?? (() => router.back())}
        className="h-11 w-11 items-center justify-center rounded-full border border-brand-border bg-brand-surface"
      >
        <FontAwesome name="chevron-left" size={16} color="#FFFFFF" />
      </Pressable>
      <Text className="font-sans-bold text-2xl text-white">{title}</Text>
    </View>
  );
}
