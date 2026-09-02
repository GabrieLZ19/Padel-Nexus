import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { hrefMarketOrden, hrefReservaDetalle } from "@/src/lib/navigation";

type PaymentStatus = "success" | "failure" | "pending" | string;

/**
 * Deep link de retorno post Mercado Pago: padelnexus://pago/retorno?...
 * Redirige al flujo correspondiente según los query params.
 */
export default function PagoRetornoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    payment?: PaymentStatus;
    orden_id?: string;
    reserva_id?: string;
    licencia_id?: string;
  }>();

  useEffect(() => {
    const payment = String(params.payment ?? "").toLowerCase();
    const ordenId = params.orden_id ? String(params.orden_id) : null;
    const reservaId = params.reserva_id ? String(params.reserva_id) : null;
    const licenciaId = params.licencia_id ? String(params.licencia_id) : null;

    if (ordenId) {
      router.replace(hrefMarketOrden(ordenId));
      return;
    }

    if (reservaId) {
      router.replace(hrefReservaDetalle(reservaId));
      return;
    }

    if (licenciaId) {
      router.replace("/perfil/licencia");
      return;
    }

    if (payment === "success" || payment === "pending") {
      router.replace("/(tabs)");
      return;
    }

    router.replace("/(tabs)");
  }, [params, router]);

  return (
    <View className="flex-1 items-center justify-center bg-brand-black px-6">
      <ActivityIndicator color="#CBFE01" size="large" />
      <Text className="mt-4 text-center font-museo text-base text-white">
        Procesando retorno del pago…
      </Text>
    </View>
  );
}
