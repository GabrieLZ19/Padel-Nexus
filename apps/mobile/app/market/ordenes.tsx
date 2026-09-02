import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { formatCurrencyArs, formatDateShort, formatOrdenSlug } from "@/src/lib/format";
import { hrefMarketOrden } from "@/src/lib/navigation";
import { MarketplaceService } from "@/src/services/marketplace";
import type { OrdenMarketplace } from "@/src/types/marketplace.types";

function estadoOrdenLabel(estado: string): string {
  const e = estado.toLowerCase();
  if (e === "pagada") return "Pagada";
  if (e === "pendiente") return "Pendiente de pago";
  if (e === "entregada") return "Entregada";
  if (e === "cancelada") return "Cancelada";
  return estado;
}

export default function MisOrdenesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [ordenes, setOrdenes] = useState<OrdenMarketplace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      void MarketplaceService.getMisOrdenes()
        .then((res) => setOrdenes(res.ordenes))
        .catch((err: unknown) => {
          setError(
            err instanceof Error ? err.message : "No se pudieron cargar órdenes.",
          );
        })
        .finally(() => setLoading(false));
    }, []),
  );

  return (
    <View className="flex-1 bg-brand-black px-6">
      <ScreenHeader title="Mis compras" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 28,
          gap: 12,
          flexGrow: 1,
        }}
      >
        {loading ? (
          <View className="h-40 items-center justify-center">
            <ActivityIndicator color="#CBFE01" />
          </View>
        ) : error ? (
          <Text className="font-sans text-sm text-red-400">{error}</Text>
        ) : ordenes.length === 0 ? (
          <View className="rounded-card border border-brand-border bg-brand-surface p-6">
            <Text className="text-center font-sans text-base text-brand-muted">
              Todavía no realizaste compras en el market.
            </Text>
          </View>
        ) : (
          ordenes.map((orden) => (
            <Pressable
              key={orden.id}
              onPress={() => router.push(hrefMarketOrden(orden.id))}
              className="rounded-card border border-brand-border bg-brand-surface p-4 active:opacity-90"
            >
              <View className="mb-2 flex-row items-center justify-between">
                <Text className="font-sans-semibold text-sm text-white">
                  {formatOrdenSlug(orden.id)}
                </Text>
                <Text className="font-sans text-xs text-brand-muted">
                  {orden.created_at
                    ? formatDateShort(orden.created_at.slice(0, 10))
                    : ""}
                </Text>
              </View>
              <View className="flex-row items-center justify-between">
                <Text className="font-sans text-sm text-brand-muted">
                  {estadoOrdenLabel(orden.estado)}
                </Text>
                <Text className="font-sans-bold text-base text-brand-chartreuse">
                  {formatCurrencyArs(orden.total)}
                </Text>
              </View>
            </Pressable>
          ))
        )}
      </ScrollView>
    </View>
  );
}
