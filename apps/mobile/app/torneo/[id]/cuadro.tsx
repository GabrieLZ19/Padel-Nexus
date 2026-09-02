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

import { BracketTreeView } from "@/src/components/torneos/BracketTreeView";
import { SegmentTabs } from "@/src/components/ui/SegmentTabs";
import {
  agruparPartidosPorRonda,
  ordenarRondasCuadro,
  separarPartidosPorFase,
  type VistaDenominacion,
} from "@/src/lib/partidoUtils";
import { hrefTorneoZonas } from "@/src/lib/navigation";
import { TorneosService } from "@/src/services/torneos";
import type { PartidoTorneo } from "@/src/types/competencia.types";
import type { Torneo } from "@/src/types/torneo.types";

export default function CuadroScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [partidos, setPartidos] = useState<PartidoTorneo[]>([]);
  const [loading, setLoading] = useState(true);
  const [rondaActiva, setRondaActiva] = useState<string>("");
  const [vista, setVista] = useState<VistaDenominacion>("nacional");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [torneoData, partidosData] = await Promise.all([
      TorneosService.getById(id),
      TorneosService.getPartidos(id),
    ]);
    setTorneo(torneoData);
    setPartidos(partidosData);

    const { cuadro } = separarPartidosPorFase(partidosData);
    const rondasCuadro = ordenarRondasCuadro(
      Object.keys(agruparPartidosPorRonda(cuadro)),
    );
    setRondaActiva(
      (prev) =>
        prev ||
        rondasCuadro[rondasCuadro.length - 2] ||
        rondasCuadro[0] ||
        "",
    );
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      void load()
        .catch((err: unknown) => {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el cuadro.",
          );
        })
        .finally(() => setLoading(false));
    }, [load]),
  );

  const { cuadro: partidosCuadro, zonas: partidosZonas } = useMemo(
    () => separarPartidosPorFase(partidos),
    [partidos],
  );

  const enVivo = useMemo(
    () =>
      torneo?.estado === "En curso" ||
      partidosCuadro.some((p) => p.estado_partido === "En curso"),
    [torneo?.estado, partidosCuadro],
  );

  const tieneZonas = partidosZonas.length > 0;
  const tieneCuadro = partidosCuadro.length > 0;

  return (
    <View className="flex-1 bg-brand-black">
      <View
        className="border-b border-brand-border px-6 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="mb-4 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full border border-brand-border bg-brand-surface"
          >
            <FontAwesome name="chevron-left" size={16} color="#FFFFFF" />
          </Pressable>
          <View className="flex-1">
            <Text className="font-sans-bold text-2xl text-white">Cuadro</Text>
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
          gap: 14,
        }}
        showsVerticalScrollIndicator={false}
      >
        {tieneZonas && id ? (
          <Pressable
            onPress={() => router.push(hrefTorneoZonas(id))}
            className="flex-row items-center justify-between rounded-card border border-brand-border bg-brand-surface px-4 py-4 active:opacity-90"
          >
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-chartreuse/10">
                <FontAwesome name="th-large" size={16} color="#CBFE01" />
              </View>
              <View>
                <Text className="font-sans-bold text-base text-white">
                  Ver fase de zonas
                </Text>
                <Text className="mt-0.5 font-sans text-xs text-brand-muted">
                  Parejas, posiciones y partidos por zona
                </Text>
              </View>
            </View>
            <FontAwesome name="chevron-right" size={12} color="#8A8A8A" />
          </Pressable>
        ) : null}

        <View className="gap-2">
          <Text className="font-sans-semibold text-xs tracking-[1.5px] text-brand-muted">
            VISTA DEL CUADRO
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
          <Text className="font-sans text-xs text-brand-muted">
            Nacional (por Provincia) · Provincial · Club (Apellido + Ciudad)
          </Text>
        </View>

        {loading ? (
          <View className="items-center py-16">
            <ActivityIndicator color="#CBFE01" />
          </View>
        ) : error ? (
          <Text className="font-sans text-sm text-red-400">{error}</Text>
        ) : !tieneCuadro ? (
          <View className="rounded-card border border-brand-border bg-brand-surface p-5">
            <Text className="font-sans text-base text-brand-muted">
              El cuadro eliminatorio todavía no está disponible.
            </Text>
          </View>
        ) : id ? (
          <BracketTreeView
            torneoId={id}
            partidos={partidosCuadro}
            vista={vista}
            rondaActiva={rondaActiva}
            onRondaActivaChange={setRondaActiva}
          />
        ) : null}

        <View className="mt-2 flex-row gap-2">
          <FontAwesome name="info-circle" size={14} color="#8A8A8A" />
          <Text className="flex-1 font-sans text-xs text-brand-muted">
            Deslizá horizontalmente para ver el avance del cuadro eliminatorio.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}
