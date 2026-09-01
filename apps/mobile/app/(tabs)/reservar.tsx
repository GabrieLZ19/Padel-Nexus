import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ClubCard } from "@/src/components/cards/ClubCard";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { ClubesService } from "@/src/services/clubes";
import { useAuthStore } from "@/src/stores/authStore";
import type { Club } from "@/src/types/club.types";

export default function ReservarTab() {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadClubes = useCallback(async () => {
    const data = await ClubesService.getAll({
      limit: 40,
      provincia: usuario?.lugar_residencia || undefined,
    });
    setClubes(data);
  }, [usuario?.lugar_residencia]);

  useEffect(() => {
    void loadClubes()
      .catch(() => setClubes([]))
      .finally(() => setLoading(false));
  }, [loadClubes]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadClubes();
    } finally {
      setRefreshing(false);
    }
  }, [loadClubes]);

  return (
    <FlatList
      className="flex-1 bg-brand-black"
      data={loading ? [] : clubes}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
        gap: 12,
        flexGrow: 1,
      }}
      ListHeaderComponent={
        <View className="mb-4 gap-2">
          <Text className="font-sans-bold text-3xl text-white">Reservar</Text>
          <Text className="font-sans text-base text-brand-muted">
            Elegí un club para ver disponibilidad de canchas
          </Text>
          <View className="mt-2 rounded-card border border-brand-border bg-brand-surface/70 px-4 py-3">
            <Text className="font-sans text-sm text-brand-muted">
              La selección de turno y pago llega en el próximo bloque (Gate 3).
            </Text>
          </View>
        </View>
      }
      renderItem={({ item }) => <ClubCard club={item} />}
      ListEmptyComponent={
        loading ? (
          <View className="gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </View>
        ) : (
          <View className="flex-1 items-center justify-center rounded-card border border-brand-border bg-brand-surface p-6">
            <Text className="text-center font-sans text-base text-brand-muted">
              No encontramos clubes para mostrar.
            </Text>
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
