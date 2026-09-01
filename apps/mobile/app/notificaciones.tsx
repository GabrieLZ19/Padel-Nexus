import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { NotificacionesService } from "@/src/services/notificaciones";
import type { Notificacion } from "@/src/types/notificacion.types";
import { Skeleton } from "@/src/components/ui/Skeleton";

function iconForTipo(tipo: Notificacion["tipo"]) {
  switch (tipo) {
    case "success":
      return "check-circle";
    case "warning":
      return "exclamation-circle";
    case "error":
      return "times-circle";
    default:
      return "info-circle";
  }
}

export default function NotificacionesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const data = await NotificacionesService.listar();
    setItems(data);
  }, []);

  useEffect(() => {
    void load()
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const handleOpen = async (item: Notificacion) => {
    if (!item.leido) {
      try {
        await NotificacionesService.marcarLeida(item.id);
        setItems((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, leido: true } : n)),
        );
      } catch {
        /* noop */
      }
    }
  };

  return (
    <View className="flex-1 bg-brand-black" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between px-6 py-4">
        <Pressable onPress={() => router.back()} className="h-10 w-10 items-center justify-center">
          <FontAwesome name="arrow-left" size={18} color="#FFFFFF" />
        </Pressable>
        <Text className="font-sans-bold text-xl text-white">Notificaciones</Text>
        <Pressable
          onPress={() => void NotificacionesService.marcarTodasLeidas().then(load)}
          className="px-2 py-1"
        >
          <Text className="font-sans-medium text-sm text-brand-chartreuse">
            Leer todo
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={loading ? [] : items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 24,
          gap: 10,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            tintColor="#CBFE01"
          />
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => void handleOpen(item)}
            className={`rounded-card border p-4 ${
              item.leido
                ? "border-brand-border bg-brand-surface"
                : "border-brand-chartreuse/40 bg-brand-surface"
            }`}
          >
            <View className="flex-row items-start gap-3">
              <FontAwesome
                name={iconForTipo(item.tipo)}
                size={18}
                color="#CBFE01"
              />
              <View className="flex-1 gap-1">
                <Text className="font-sans-bold text-base text-white">
                  {item.titulo}
                </Text>
                <Text className="font-sans text-sm text-brand-muted">
                  {item.mensaje}
                </Text>
              </View>
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          loading ? (
            <View className="gap-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </View>
          ) : (
            <View className="flex-1 items-center justify-center py-16">
              <Text className="text-center font-sans text-base text-brand-muted">
                No tenés notificaciones por ahora.
              </Text>
            </View>
          )
        }
      />
    </View>
  );
}
