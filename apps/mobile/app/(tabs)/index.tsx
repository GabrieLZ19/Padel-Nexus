import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { QuickAction } from "@/src/components/cards/QuickAction";
import { TorneoCard } from "@/src/components/cards/TorneoCard";
import { HomeHeader } from "@/src/components/home/HomeHeader";
import { ProximoTurnoCard } from "@/src/components/home/ProximoTurnoCard";
import { AppScreen } from "@/src/components/layout/AppScreen";
import { Skeleton } from "@/src/components/ui/Skeleton";
import {
  filtrarTorneosCerca,
  filtrarTorneosInscribibles,
  getProximaReserva,
} from "@/src/lib/format";
import { NotificacionesService } from "@/src/services/notificaciones";
import { ReservasService } from "@/src/services/reservas";
import { TorneosService } from "@/src/services/torneos";
import { useAuthStore } from "@/src/stores/authStore";
import type { ReservaUsuario } from "@/src/types/reserva.types";
import type { Torneo } from "@/src/types/torneo.types";

export default function HomeScreen() {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [proximaReserva, setProximaReserva] = useState<ReservaUsuario | null>(
    null,
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [torneosData, reservasData, notificaciones] = await Promise.all([
      TorneosService.getAll({ limit: 100 }),
      ReservasService.getMisReservas().catch(() => []),
      NotificacionesService.listar().catch(() => []),
    ]);

    const inscribibles = filtrarTorneosInscribibles(torneosData);
    const cerca = filtrarTorneosCerca(
      inscribibles,
      usuario?.lugar_residencia,
      5,
    );
    setTorneos(cerca);
    setProximaReserva(getProximaReserva(reservasData));
    setUnreadCount(notificaciones.filter((n) => !n.leido).length);
  }, [usuario?.lugar_residencia]);

  useEffect(() => {
    void loadData()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  return (
    <AppScreen refreshing={refreshing} onRefresh={() => void onRefresh()}>
      <Animated.View entering={FadeInDown.duration(400)} className="gap-6">
        <HomeHeader
          usuario={usuario}
          unreadCount={unreadCount}
          onNotificationsPress={() => router.push("/notificaciones")}
          onAvatarPress={() => router.push("/(tabs)/perfil")}
        />

        <ProximoTurnoCard
          reserva={proximaReserva}
          loading={loading}
          onReservarPress={() => router.push("/(tabs)/reservar")}
          onPress={() => router.push("/(tabs)/reservar")}
        />

        <View className="flex-row gap-2">
          <QuickAction
            label="Torneos"
            icon={{ set: "fa", name: "trophy" }}
            onPress={() => router.push("/(tabs)/torneos")}
          />
          <QuickAction
            label="Reservar"
            icon={{ set: "fa", name: "calendar" }}
            onPress={() => router.push("/(tabs)/reservar")}
          />
          <QuickAction
            label="Ranking"
            icon={{ set: "mci", name: "medal-outline" }}
            onPress={() => router.push("/(tabs)/torneos")}
          />
          <QuickAction
            label="Licencia"
            icon={{ set: "mci", name: "shield-check-outline" }}
            onPress={() => router.push("/(tabs)/perfil")}
          />
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans-bold text-lg text-white">
              Torneos cerca tuyo
            </Text>
            <Text
              className="font-sans-semibold text-sm text-brand-chartreuse"
              onPress={() => router.push("/(tabs)/torneos")}
            >
              Ver todos
            </Text>
          </View>

          {loading ? (
            <View className="gap-3">
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
            </View>
          ) : torneos.length > 0 ? (
            <View className="gap-4">
              {torneos.map((torneo) => (
                <TorneoCard
                  key={torneo.id}
                  torneo={torneo}
                  variant="featured"
                  onPress={() => router.push("/(tabs)/torneos")}
                  onInscribirmePress={() => router.push("/(tabs)/torneos")}
                />
              ))}
            </View>
          ) : (
            <View className="rounded-card border border-brand-border bg-brand-surface p-4">
              <Text className="font-sans text-sm text-brand-muted">
                No hay torneos con inscripción abierta por ahora.
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    </AppScreen>
  );
}
