import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TorneoCard } from "@/src/components/cards/TorneoCard";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { TorneosService } from "@/src/services/torneos";
import type { Torneo } from "@/src/types/torneo.types";

export default function TorneosTab() {
  const insets = useSafeAreaInsets();
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTorneos = useCallback(async () => {
    const data = await TorneosService.getAll({ limit: 50 });
    setTorneos(data);
  }, []);

  useEffect(() => {
    void loadTorneos()
      .catch(() => setTorneos([]))
      .finally(() => setLoading(false));
  }, [loadTorneos]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTorneos();
    } finally {
      setRefreshing(false);
    }
  }, [loadTorneos]);

  return (
    <FlatList
      className="flex-1 bg-brand-black"
      data={loading ? [] : torneos}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
        gap: 12,
        flexGrow: 1,
      }}
      ListHeaderComponent={
        <View className="mb-4 gap-1">
          <Text className="font-sans-bold text-3xl text-white">Torneos</Text>
          <Text className="font-sans text-base text-brand-muted">
            Competencias oficiales y abiertas
          </Text>
        </View>
      }
      renderItem={({ item }) => <TorneoCard torneo={item} />}
      ListEmptyComponent={
        loading ? (
          <View className="gap-3">
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
            <Skeleton className="h-44" />
          </View>
        ) : (
          <View className="flex-1 items-center justify-center rounded-card border border-brand-border bg-brand-surface p-6">
            <Text className="text-center font-sans text-base text-brand-muted">
              No hay torneos disponibles en este momento.
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
