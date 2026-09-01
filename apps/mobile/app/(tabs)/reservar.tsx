import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ReservarTab() {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 bg-brand-black px-6" style={{ paddingTop: insets.top + 20 }}>
      <Text className="font-sans-bold text-3xl text-white">Reservar</Text>
      <Text className="mt-2 font-sans text-brand-muted">Placeholder M15 — Gate 2</Text>
    </View>
  );
}
