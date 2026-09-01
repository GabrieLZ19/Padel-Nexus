import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "@/src/stores/authStore";

export default function PerfilTab() {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);

  return (
    <View className="flex-1 bg-brand-black px-6" style={{ paddingTop: insets.top + 20 }}>
      <Text className="font-sans-bold text-3xl text-white">Perfil</Text>
      <Text className="mt-2 font-sans text-brand-muted">
        {usuario?.email || "Placeholder M23 — Gate 2"}
      </Text>
    </View>
  );
}
