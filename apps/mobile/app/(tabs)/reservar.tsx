import { useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ReservaCard } from "@/src/components/cards/ReservaCard";
import { Button } from "@/src/components/ui/Button";
import { SegmentTabs } from "@/src/components/ui/SegmentTabs";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { parseIsoDate } from "@/src/lib/dateUtils";
import { hrefReservaDetalle, hrefReservarNueva } from "@/src/lib/navigation";
import { ReservasService } from "@/src/services/reservas";
import type { ReservaUsuario } from "@/src/types/reserva.types";

type ReservasTab = "proximas" | "pasadas";

function esPasada(reserva: ReservaUsuario): boolean {
  const fecha = parseIsoDate(reserva.fecha_reserva);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fecha.setHours(0, 0, 0, 0);
  return fecha.getTime() < hoy.getTime();
}

export default function ReservarTab() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<ReservasTab>("proximas");
  const [reservas, setReservas] = useState<ReservaUsuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const misReservas = await ReservasService.getMisReservas().catch(() => []);
    setReservas(misReservas);
  }, []);

  useEffect(() => {
    void loadData().finally(() => setLoading(false));
  }, [loadData]);

  const filtered = useMemo(() => {
    const sorted = [...reservas].sort((a, b) => {
      const fa = parseIsoDate(a.fecha_reserva).getTime();
      const fb = parseIsoDate(b.fecha_reserva).getTime();
      return tab === "proximas" ? fa - fb : fb - fa;
    });
    return sorted.filter((r) =>
      tab === "proximas" ? !esPasada(r) : esPasada(r),
    );
  }, [reservas, tab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  return (
    <FlatList
      className="flex-1 bg-brand-black"
      data={loading ? [] : filtered}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
        gap: 12,
        flexGrow: 1,
      }}
      ListHeaderComponent={
        <View className="mb-4 gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans-bold text-3xl text-white">Mis reservas</Text>
            <Pressable onPress={() => router.push(hrefReservarNueva())}>
              <Text className="font-sans-semibold text-sm text-brand-chartreuse">
                Nueva
              </Text>
            </Pressable>
          </View>

          <SegmentTabs
            value={tab}
            onChange={setTab}
            options={[
              { id: "proximas", label: "Próximas" },
              { id: "pasadas", label: "Pasadas" },
            ]}
          />
        </View>
      }
      renderItem={({ item }) => (
        <ReservaCard
          reserva={item}
          onPress={() => router.push(hrefReservaDetalle(item.id))}
          onDetalle={() => router.push(hrefReservaDetalle(item.id))}
        />
      )}
      ListEmptyComponent={
        loading ? (
          <View className="gap-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </View>
        ) : (
          <View className="flex-1 items-center justify-center gap-4 rounded-card border border-brand-border bg-brand-surface p-6">
            <Text className="text-center font-sans text-base text-brand-muted">
              {tab === "proximas"
                ? "No tenés reservas próximas."
                : "No tenés reservas pasadas."}
            </Text>
            {tab === "proximas" ? (
              <Button
                label="Reservar cancha"
                onPress={() => router.push(hrefReservarNueva())}
              />
            ) : null}
          </View>
        )
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor="#CBFE01"
        />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}
