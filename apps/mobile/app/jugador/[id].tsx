import FontAwesome from "@expo/vector-icons/FontAwesome";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { JugadorDetalleView } from "@/src/components/jugador/JugadorDetalleView";
import { PerfilService } from "@/src/services/perfil";
import { RankingsService } from "@/src/services/rankings";
import type { RankingPerfilJugador } from "@/src/types/competencia.types";
import type { PerfilPublico } from "@/src/types/user.types";

export default function JugadorDetalleScreen() {
  const { id, posicion, scope } = useLocalSearchParams<{
    id: string;
    posicion?: string;
    scope?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [perfil, setPerfil] = useState<PerfilPublico | null>(null);
  const [registros, setRegistros] = useState<RankingPerfilJugador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [perfilData, rankingData] = await Promise.all([
      PerfilService.getPublico(id),
      RankingsService.getByUserId(id),
    ]);
    setPerfil(perfilData);
    setRegistros(rankingData);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      void load()
        .catch((err: unknown) => {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el jugador.",
          );
        })
        .finally(() => setLoading(false));
    }, [load]),
  );

  const principal = useMemo(() => {
    if (registros.length === 0) return null;
    if (scope) {
      const match = registros.find((r) => r.alcance === scope);
      if (match) return match;
    }
    return [...registros].sort((a, b) => b.puntos - a.puntos)[0];
  }, [registros, scope]);

  const historial = useMemo(() => {
    const items =
      principal?.historial_ranking?.filter((h) => h.created_at) || [];
    return [...items].sort(
      (a, b) =>
        new Date(b.created_at || 0).getTime() -
        new Date(a.created_at || 0).getTime(),
    );
  }, [principal?.historial_ranking]);

  const tieneDatos = Boolean(perfil || principal);

  return (
    <View className="flex-1 bg-brand-black">
      <LinearGradient
        colors={["rgba(203,254,1,0.16)", "rgba(110,137,1,0.08)", "transparent"]}
        locations={[0, 0.45, 1]}
        style={{
          position: "absolute",
          left: -40,
          right: -40,
          top: 0,
          height: 360,
        }}
      />
      <View
        style={{
          position: "absolute",
          right: -30,
          top: 120,
          width: 160,
          height: 160,
          borderRadius: 160,
          backgroundColor: "rgba(203,254,1,0.06)",
        }}
      />

      <View
        className="border-b border-brand-border/60 px-6 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full border border-brand-border bg-brand-surface/90"
          >
            <FontAwesome name="chevron-left" size={16} color="#FFFFFF" />
          </Pressable>
          <View className="flex-1">
            <Text className="font-sans-bold text-2xl text-white">Jugador</Text>
            <Text className="font-sans text-sm text-brand-muted">
              Ficha deportiva y ranking
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="items-center py-24">
            <ActivityIndicator color="#CBFE01" size="large" />
          </View>
        ) : error || !tieneDatos ? (
          <View className="rounded-[28px] border border-brand-border bg-brand-surface p-6">
            <Text className="font-sans-bold text-lg text-white">
              No pudimos cargar la ficha
            </Text>
            <Text className="mt-2 font-sans text-sm text-red-400">
              {error || "No encontramos datos de este jugador."}
            </Text>
          </View>
        ) : (
          <JugadorDetalleView
            perfil={perfil}
            registros={registros}
            principal={principal}
            historial={historial}
            posicion={posicion}
            scope={scope}
          />
        )}
      </ScrollView>
    </View>
  );
}
