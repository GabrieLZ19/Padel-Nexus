import FontAwesome from "@expo/vector-icons/FontAwesome";
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

import { ZonasDetalleView } from "@/src/components/torneos/ZonasDetalleView";
import { SegmentTabs } from "@/src/components/ui/SegmentTabs";
import { separarPartidosPorFase, type VistaDenominacion } from "@/src/lib/partidoUtils";
import { TorneosService } from "@/src/services/torneos";
import type { GrupoZonaTorneo, PartidoTorneo } from "@/src/types/competencia.types";
import type { Torneo } from "@/src/types/torneo.types";

export default function ZonasScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [partidos, setPartidos] = useState<PartidoTorneo[]>([]);
  const [grupos, setGrupos] = useState<GrupoZonaTorneo[]>([]);
  const [loading, setLoading] = useState(true);
  const [vista, setVista] = useState<VistaDenominacion>("nacional");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [torneoData, partidosData, zonasData] = await Promise.all([
      TorneosService.getById(id),
      TorneosService.getPartidos(id),
      TorneosService.getZonas(id),
    ]);
    setTorneo(torneoData);
    setPartidos(partidosData);
    setGrupos(zonasData);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      void load()
        .catch((err: unknown) => {
          setError(
            err instanceof Error ? err.message : "No se pudieron cargar las zonas.",
          );
        })
        .finally(() => setLoading(false));
    }, [load]),
  );

  const { zonas: partidosZonas } = useMemo(
    () => separarPartidosPorFase(partidos),
    [partidos],
  );

  const enVivo = useMemo(
    () => partidosZonas.some((p) => p.estado_partido === "En curso"),
    [partidosZonas],
  );

  return (
    <View className="flex-1 bg-brand-black">
      <View
        className="border-b border-brand-border px-6 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full border border-brand-border bg-brand-surface"
          >
            <FontAwesome name="chevron-left" size={16} color="#FFFFFF" />
          </Pressable>
          <View className="flex-1">
            <Text className="font-sans-bold text-2xl text-white">Zonas</Text>
            <Text className="font-sans text-sm text-brand-muted" numberOfLines={1}>
              {torneo?.nombre}
              {torneo?.nivel ? ` · ${torneo.nivel}` : ""}
            </Text>
          </View>
          {enVivo ? (
            <View className="flex-row items-center gap-1.5 rounded-full border border-red-900/60 bg-red-950/50 px-3 py-1.5">
              <View className="h-2 w-2 rounded-full bg-red-500" />
              <Text className="font-sans-semibold text-xs text-red-400">
                EN VIVO
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 12,
          paddingBottom: insets.bottom + 24,
          gap: 16,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View className="gap-2">
          <Text className="font-sans-semibold text-xs tracking-[1.5px] text-brand-muted">
            VISTA DE EQUIPOS
          </Text>
          <SegmentTabs
            value={vista}
            onChange={setVista}
            options={[
              { id: "nacional", label: "Nacional" },
              { id: "provincial", label: "Provincial" },
              { id: "club", label: "Club" },
            ]}
          />
        </View>

        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#CBFE01" />
          </View>
        ) : error ? (
          <Text className="font-sans text-sm text-red-400">{error}</Text>
        ) : partidosZonas.length === 0 && grupos.length === 0 ? (
          <View className="rounded-card border border-brand-border bg-brand-surface p-5">
            <Text className="font-sans text-base text-brand-muted">
              Todavía no hay zonas publicadas para este torneo.
            </Text>
          </View>
        ) : id ? (
          <ZonasDetalleView
            grupos={grupos}
            partidos={partidosZonas}
            vista={vista}
            torneoId={id}
          />
        ) : null}
      </ScrollView>
    </View>
  );
}
