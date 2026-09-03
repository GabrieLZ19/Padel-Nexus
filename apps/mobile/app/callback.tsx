import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useRouter } from "expo-router";

export default function CallbackScreen() {
  const router = useRouter();

  useEffect(() => {
    // Redirige fluidamente a las pestañas principales sin mostrar 404
    const timer = setTimeout(() => {
      router.replace("/(tabs)");
    }, 150);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View className="flex-1 items-center justify-center bg-brand-black">
      <ActivityIndicator size="large" color="#CBFE01" />
    </View>
  );
}
