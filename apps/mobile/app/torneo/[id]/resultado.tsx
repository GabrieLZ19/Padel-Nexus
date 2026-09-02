import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { Button } from "@/src/components/ui/Button";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { formatDateShort } from "@/src/lib/format";
import { hrefTorneoCuadro } from "@/src/lib/navigation";
import { TorneosService } from "@/src/services/torneos";
import type { PartidoTorneo } from "@/src/types/competencia.types";
import type { Torneo } from "@/src/types/torneo.types";

function setValue(
  a?: number | null,
  b?: number | null,
  lado: "a" | "b" = "a",
): string {
  const value = lado === "a" ? a : b;
  return value == null ? "—" : String(value);
}

export default function ResultadoScreen() {
  const { id, partidoId } = useLocalSearchParams<{
    id: string;
    partidoId?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [partido, setPartido] = useState<PartidoTorneo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [torneoData, partidos] = await Promise.all([
      TorneosService.getById(id),
      TorneosService.getPartidos(id),
    ]);
    setTorneo(torneoData);
    const found =
      partidos.find((p) => p.id === partidoId) ||
      partidos.find((p) => Boolean(p.ganador)) ||
      partidos[0] ||
      null;
    setPartido(found);
  }, [id, partidoId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      void load()
        .catch((err: unknown) => {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar el resultado.",
          );
        })
        .finally(() => setLoading(false));
    }, [load]),
  );

  const ganoA =
    Boolean(partido?.ganador) && partido?.ganador === partido?.equipo_a_id;
  const victoria = Boolean(partido?.ganador);

  const equipoA = [partido?.equipo_a_j1, partido?.equipo_a_j2]
    .filter(Boolean)
    .join(" / ");
  const equipoB = [partido?.equipo_b_j1, partido?.equipo_b_j2]
    .filter(Boolean)
    .join(" / ");

  const gamesA =
    (partido?.set1_a || 0) + (partido?.set2_a || 0) + (partido?.set3_a || 0);
  const gamesB =
    (partido?.set1_b || 0) + (partido?.set2_b || 0) + (partido?.set3_b || 0);

  async function onShare() {
    if (!partido || !torneo) return;
    await Share.share({
      message: `Resultado ${partido.ronda} · ${torneo.nombre}\n${equipoA} ${gamesA}-${gamesB} ${equipoB}`,
    });
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-black">
        <ActivityIndicator color="#CBFE01" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-black px-6">
      <ScreenHeader title="Resultado" />
      <ScrollView
        contentContainerStyle={{ gap: 16, paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
      >
        {error ? (
          <Text className="font-sans text-sm text-red-400">{error}</Text>
        ) : null}

        {!partido ? (
          <View className="rounded-card border border-brand-border bg-brand-surface p-5">
            <Text className="font-sans text-base text-brand-muted">
              Todavía no hay resultados publicados para este torneo.
            </Text>
          </View>
        ) : (
          <>
            <View className="overflow-hidden rounded-card border border-brand-border bg-brand-surface">
              <LinearGradient
                colors={["rgba(203,254,1,0.18)", "rgba(0,0,0,0)"]}
                style={{ paddingVertical: 28, paddingHorizontal: 20, alignItems: "center" }}
              >
                <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-brand-chartreuse">
                  <FontAwesome name="trophy" size={28} color="#000000" />
                </View>
                <Text className="font-sans-bold text-3xl text-brand-chartreuse">
                  {victoria ? "¡VICTORIA!" : "EN JUEGO"}
                </Text>
                <Text className="mt-2 text-center font-sans text-sm text-brand-muted">
                  {partido.ronda} · {torneo?.nombre} ·{" "}
                  {formatDateShort(torneo?.fecha)}
                </Text>
              </LinearGradient>
            </View>

            <View className="rounded-card border border-brand-border bg-brand-surface p-4">
              <View className="mb-3 flex-row items-center">
                <Text className="flex-1 font-sans-semibold text-xs tracking-widest text-brand-muted">
                  EQUIPOS
                </Text>
                <Text className="w-10 text-center font-sans-semibold text-xs text-brand-muted">
                  S1
                </Text>
                <Text className="w-10 text-center font-sans-semibold text-xs text-brand-muted">
                  S2
                </Text>
                <Text className="w-10 text-center font-sans-semibold text-xs text-brand-muted">
                  S3
                </Text>
              </View>

              <View className="mb-3 flex-row items-center">
                <View className="flex-1 flex-row items-center gap-2">
                  {ganoA ? (
                    <FontAwesome name="trophy" size={12} color="#CBFE01" />
                  ) : (
                    <Text className="text-brand-muted">—</Text>
                  )}
                  <Text className="flex-1 font-sans-semibold text-sm text-white" numberOfLines={1}>
                    {equipoA || "Equipo A"}
                  </Text>
                </View>
                <Text className={`w-10 text-center font-sans-bold ${ganoA ? "text-brand-chartreuse" : "text-white"}`}>
                  {setValue(partido.set1_a, partido.set1_b, "a")}
                </Text>
                <Text className={`w-10 text-center font-sans-bold ${ganoA ? "text-brand-chartreuse" : "text-white"}`}>
                  {setValue(partido.set2_a, partido.set2_b, "a")}
                </Text>
                <Text className={`w-10 text-center font-sans-bold ${ganoA ? "text-brand-chartreuse" : "text-white"}`}>
                  {setValue(partido.set3_a, partido.set3_b, "a")}
                </Text>
              </View>

              <View className="flex-row items-center">
                <View className="flex-1 flex-row items-center gap-2">
                  {!ganoA && partido.ganador ? (
                    <FontAwesome name="trophy" size={12} color="#CBFE01" />
                  ) : (
                    <Text className="text-brand-muted">—</Text>
                  )}
                  <Text className="flex-1 font-sans-semibold text-sm text-white" numberOfLines={1}>
                    {equipoB || "Equipo B"}
                  </Text>
                </View>
                <Text className={`w-10 text-center font-sans-bold ${!ganoA && partido.ganador ? "text-brand-chartreuse" : "text-brand-muted"}`}>
                  {setValue(partido.set1_a, partido.set1_b, "b")}
                </Text>
                <Text className={`w-10 text-center font-sans-bold ${!ganoA && partido.ganador ? "text-brand-chartreuse" : "text-brand-muted"}`}>
                  {setValue(partido.set2_a, partido.set2_b, "b")}
                </Text>
                <Text className={`w-10 text-center font-sans-bold ${!ganoA && partido.ganador ? "text-brand-chartreuse" : "text-brand-muted"}`}>
                  {setValue(partido.set3_a, partido.set3_b, "b")}
                </Text>
              </View>
            </View>

            <View className="flex-row gap-3">
              <View className="flex-1 rounded-card border border-brand-border bg-brand-surface p-4">
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-chartreuse/10">
                  <MaterialCommunityIcons
                    name="timer-outline"
                    size={20}
                    color="#CBFE01"
                  />
                </View>
                <Text className="mt-3 font-sans text-xs text-brand-muted">
                  Duración
                </Text>
                <Text className="font-sans-bold text-lg text-white">—</Text>
              </View>
              <View className="flex-1 rounded-card border border-brand-border bg-brand-surface p-4">
                <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-chartreuse/10">
                  <MaterialCommunityIcons
                    name="pulse"
                    size={20}
                    color="#CBFE01"
                  />
                </View>
                <Text className="mt-3 font-sans text-xs text-brand-muted">
                  Games
                </Text>
                <Text className="font-sans-bold text-lg text-white">
                  {gamesA} - {gamesB}
                </Text>
              </View>
            </View>

            <Button
              label="Compartir resultado"
              onPress={() => void onShare()}
            />
            <Pressable
              onPress={() => router.replace(hrefTorneoCuadro(String(id)))}
              className="h-14 items-center justify-center rounded-cta border border-brand-chartreuse"
            >
              <Text className="font-sans-bold text-base text-brand-chartreuse">
                Volver al cuadro
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}
