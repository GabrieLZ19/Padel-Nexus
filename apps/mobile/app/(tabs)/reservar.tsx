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
import { SegmentTabs } from "@/src/components/ui/SegmentTabs";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { Button } from "@/src/components/ui/Button";
import { parseIsoDate } from "@/src/lib/dateUtils";
import { ReservasService } from "@/src/services/reservas";
import { ClubesService } from "@/src/services/clubes";
import type { ReservaUsuario } from "@/src/types/reserva.types";
import type { Club } from "@/src/types/club.types";

type ReservasTab = "proximas" | "pasadas";

function esPasada(reserva: ReservaUsuario): boolean {
  const fecha = parseIsoDate(reserva.fecha_reserva);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  fecha.setHours(0, 0, 0, 0);
  return fecha.getTime() < hoy.getTime();
}

export default function ReservarTab() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<ReservasTab>("proximas");
  const [reservas, setReservas] = useState<ReservaUsuario[]>([]);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [showClubes, setShowClubes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [misReservas, clubesData] = await Promise.all([
      ReservasService.getMisReservas().catch(() => []),
      ClubesService.getAll({ limit: 30 }).catch(() => []),
    ]);
    setReservas(misReservas);
    setClubes(clubesData);
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
      data={
        loading
          ? []
          : showClubes
            ? (clubes as Array<Club | ReservaUsuario>)
            : filtered
      }
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
            <Text className="font-sans-bold text-3xl text-white">
              {showClubes ? "Elegir club" : "Mis reservas"}
            </Text>
            {!showClubes ? (
              <Pressable onPress={() => setShowClubes(true)}>
                <Text className="font-sans-semibold text-sm text-brand-chartreuse">
                  Nueva
                </Text>
              </Pressable>
            ) : (
              <Pressable onPress={() => setShowClubes(false)}>
                <Text className="font-sans-semibold text-sm text-brand-chartreuse">
                  Volver
                </Text>
              </Pressable>
            )}
          </View>

          {!showClubes ? (
            <SegmentTabs
              value={tab}
              onChange={setTab}
              options={[
                { id: "proximas", label: "Próximas" },
                { id: "pasadas", label: "Pasadas" },
              ]}
            />
          ) : null}
        </View>
      }
      renderItem={({ item }) =>
        showClubes ? (
          <View className="rounded-card border border-brand-border bg-brand-surface p-4">
            <Text className="font-sans-bold text-base text-white">
              {(item as Club).nombre}
            </Text>
            <Text className="mt-1 font-sans text-sm text-brand-muted">
              {(item as Club).localidad}, {(item as Club).provincia}
            </Text>
          </View>
        ) : (
          <ReservaCard reserva={item as ReservaUsuario} />
        )
      }
      ListEmptyComponent={
        loading ? (
          <View className="gap-3">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </View>
        ) : (
          <View className="flex-1 items-center justify-center gap-4 rounded-card border border-brand-border bg-brand-surface p-6">
            <Text className="text-center font-sans text-base text-brand-muted">
              {showClubes
                ? "No hay clubes disponibles."
                : tab === "proximas"
                  ? "No tenés reservas próximas."
                  : "No tenés reservas pasadas."}
            </Text>
            {!showClubes ? (
              <Button label="Reservar cancha" onPress={() => setShowClubes(true)} />
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
