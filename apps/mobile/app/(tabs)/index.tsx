import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuthStore } from "@/src/stores/authStore";
import { Button } from "@/src/components/ui/Button";
import { useRouter } from "expo-router";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const logout = useAuthStore((s) => s.logout);
  const router = useRouter();

  const name = usuario?.nombre || "jugador";

  return (
    <View
      className="flex-1 bg-brand-black px-6"
      style={{ paddingTop: insets.top + 20 }}
    >
      <Text className="font-sans-bold text-3xl text-white">Hola, {name}</Text>
      <Text className="mt-2 font-sans text-base text-brand-muted">
        {usuario?.categoria_padel
          ? `${usuario.categoria_padel}ª Categoría`
          : "Shell de Home — Gate 2"}
      </Text>
      <View className="mt-8 rounded-card border border-brand-border bg-brand-surface p-5">
        <Text className="font-sans-semibold text-xs tracking-widest text-brand-chartreuse">
          PRÓXIMO BLOQUE
        </Text>
        <Text className="mt-2 font-sans text-base text-white">
          Acá va M05_Home con turnos, quick actions y torneos cerca tuyo.
        </Text>
      </View>
      <View className="mt-8">
        <Button
          label="Cerrar sesión"
          variant="ghost"
          onPress={() => {
            void logout().then(() => router.replace("/(auth)/login"));
          }}
        />
      </View>
    </View>
  );
}
