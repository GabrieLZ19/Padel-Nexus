import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { QuickAction } from "@/src/components/cards/QuickAction";
import { TorneoCard } from "@/src/components/cards/TorneoCard";
import { AppScreen } from "@/src/components/layout/AppScreen";
import { Skeleton } from "@/src/components/ui/Skeleton";
import {
  filtrarTorneosCerca,
  formatDateShort,
  formatTime,
  getProximaReserva,
} from "@/src/lib/format";
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [torneosData, reservasData] = await Promise.all([
      TorneosService.getAll({ limit: 30 }),
      ReservasService.getMisReservas().catch(() => []),
    ]);

    const cerca = filtrarTorneosCerca(
      torneosData,
      usuario?.lugar_residencia,
      5,
    );
    setTorneos(cerca);
    setProximaReserva(getProximaReserva(reservasData));
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

  const nombre = usuario?.nombre || "jugador";

  return (
    <AppScreen
      title={`Hola, ${nombre}`}
      subtitle={
        usuario?.categoria_padel
          ? `${usuario.categoria_padel} · ${usuario.lugar_residencia || "Argentina"}`
          : "Tu ecosistema de pádel en un solo lugar"
      }
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}
    >
      <Animated.View entering={FadeInDown.duration(400)} className="gap-6">
        <View className="gap-3">
          <Text className="font-sans-semibold text-xs uppercase tracking-widest text-brand-chartreuse">
            Próximo turno
          </Text>
          {loading ? (
            <Skeleton className="h-28" />
          ) : proximaReserva ? (
            <View className="rounded-card border border-brand-border bg-brand-surface p-4">
              <Text className="font-sans-bold text-lg text-white">
                {proximaReserva.turnos?.canchas?.clubes?.nombre || "Reserva"}
              </Text>
              <Text className="mt-1 font-sans text-sm text-brand-muted">
                {proximaReserva.turnos?.canchas?.nombre}
              </Text>
              <View className="mt-3 flex-row items-center gap-4">
                <View className="flex-row items-center gap-2">
                  <FontAwesome name="calendar" size={14} color="#CBFE01" />
                  <Text className="font-sans-medium text-sm text-white">
                    {formatDateShort(proximaReserva.fecha_reserva)}
                  </Text>
                </View>
                <View className="flex-row items-center gap-2">
                  <FontAwesome name="clock-o" size={14} color="#CBFE01" />
                  <Text className="font-sans-medium text-sm text-white">
                    {formatTime(proximaReserva.turnos?.hora_inicio)}
                  </Text>
                </View>
              </View>
            </View>
          ) : (
            <View className="rounded-card border border-dashed border-brand-border bg-brand-surface/60 p-4">
              <Text className="font-sans text-sm text-brand-muted">
                No tenés turnos próximos. Reservá una cancha para jugar.
              </Text>
            </View>
          )}
        </View>

        <View className="gap-3">
          <Text className="font-sans-semibold text-xs uppercase tracking-widest text-brand-chartreuse">
            Acciones rápidas
          </Text>
          <View className="flex-row flex-wrap gap-3">
            <QuickAction
              label="Torneos"
              icon="trophy"
              onPress={() => router.push("/(tabs)/torneos")}
            />
            <QuickAction
              label="Reservar"
              icon="calendar"
              onPress={() => router.push("/(tabs)/reservar")}
            />
            <QuickAction
              label="Market"
              icon="shopping-bag"
              onPress={() => router.push("/(tabs)/market")}
            />
            <QuickAction
              label="Mi perfil"
              icon="user"
              onPress={() => router.push("/(tabs)/perfil")}
            />
          </View>
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans-semibold text-xs uppercase tracking-widest text-brand-chartreuse">
              Torneos cerca tuyo
            </Text>
            <Text
              className="font-sans-medium text-sm text-brand-muted"
              onPress={() => router.push("/(tabs)/torneos")}
            >
              Ver todos
            </Text>
          </View>

          {loading ? (
            <View className="gap-3">
              <Skeleton className="h-44" />
              <Skeleton className="h-44" />
            </View>
          ) : torneos.length > 0 ? (
            <View className="gap-3">
              {torneos.map((torneo) => (
                <TorneoCard key={torneo.id} torneo={torneo} />
              ))}
            </View>
          ) : (
            <View className="rounded-card border border-brand-border bg-brand-surface p-4">
              <Text className="font-sans text-sm text-brand-muted">
                No hay torneos publicados por ahora.
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    </AppScreen>
  );
}
