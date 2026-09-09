import { Text, View } from "react-native";

import { useAuthStore } from "@/src/stores/authStore";

export function MinorModeBanner() {
  const usuario = useAuthStore((s) => s.usuario);
  if (!usuario?.es_menor) return null;

  const pendiente =
    usuario.cuenta_estado === "PENDING_PARENTAL_CONSENT" ||
    usuario.cuenta_estado === "DRAFT_MINOR";

  return (
    <View className="mb-4 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
      <Text className="font-sans-bold text-sm text-amber-200">
        Modo de protección para menores activo
      </Text>
      <Text className="mt-1 font-sans text-xs leading-5 text-amber-100/80">
        {pendiente
          ? "Tu cuenta está pendiente de consentimiento parental. Algunas funciones permanecen bloqueadas."
          : "Privacidad reforzada: sin foto pública, sin datos de contacto públicos y chat restringido."}
      </Text>
    </View>
  );
}
