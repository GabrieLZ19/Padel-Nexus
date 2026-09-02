import FontAwesome from "@expo/vector-icons/FontAwesome";
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
import {
  colorEstadoTorneoCard,
  esTorneoInscripcionAbierta,
  etiquetaEstadoTorneoCard,
  formatCurrencyArs,
  formatDateShort,
  formatTime,
} from "@/src/lib/format";
import {
  hrefTorneoCuadro,
  hrefTorneoInscripcion,
  hrefTorneoZonas,
} from "@/src/lib/navigation";
import { TorneosService } from "@/src/services/torneos";
import { useAuthStore } from "@/src/stores/authStore";
import type { PartidoTorneo } from "@/src/types/competencia.types";
import type { Torneo } from "@/src/types/torneo.types";
import { separarPartidosPorFase } from "@/src/lib/partidoUtils";

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  label: string;
  value: string;
}) {
  return (
    <View className="min-w-[47%] flex-1 rounded-card border border-brand-border bg-brand-surface p-3">
      <FontAwesome name={icon} size={14} color="#CBFE01" />
      <Text className="mt-2 font-sans text-xs text-brand-muted">{label}</Text>
      <Text className="mt-0.5 font-sans-semibold text-base text-white" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export default function TorneoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [partidos, setPartidos] = useState<PartidoTorneo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [torneoData, partidosData] = await Promise.all([
      TorneosService.getById(id),
      TorneosService.getPartidos(id),
    ]);
    setTorneo(torneoData);
    setPartidos(partidosData);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      void load()
        .catch((err: unknown) => {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el torneo.",
          );
        })
        .finally(() => setLoading(false));
    }, [load]),
  );

  const abierto = torneo ? esTorneoInscripcionAbierta(torneo.estado) : false;
  const yaInscripto = Boolean(
    usuario?.id &&
      torneo?.inscripciones?.some(
        (i) => i.usuario_id === usuario.id || i.usuario2_id === usuario.id,
      ),
  );
  const categoria = [torneo?.nivel, torneo?.categoria].filter(Boolean).join(" ");
  const hora = formatTime(torneo?.hora_inicio_jornada);
  const { zonas: partidosZonas, cuadro: partidosCuadro } = separarPartidosPorFase(partidos);
  const tieneZonas = partidosZonas.length > 0;
  const tieneCuadro = partidosCuadro.length > 0;

  async function onShare() {
    if (!torneo) return;
    await Share.share({
      message: `${torneo.nombre} · ${categoria || "Torneo"} · ${formatDateShort(torneo.fecha)}`,
    });
  }

  if (loading && !torneo) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-black">
        <ActivityIndicator color="#CBFE01" />
      </View>
    );
  }

  if (!torneo) {
    return (
      <View
        className="flex-1 bg-brand-black px-6"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Pressable
          onPress={() => router.back()}
          className="mb-6 h-11 w-11 items-center justify-center rounded-full border border-brand-border bg-brand-surface"
        >
          <FontAwesome name="chevron-left" size={16} color="#FFFFFF" />
        </Pressable>
        <Text className="font-sans text-base text-red-400">
          {error || "Torneo no encontrado."}
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-brand-black">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 120,
          gap: 18,
        }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={["rgba(110,137,1,0.25)", "transparent"]}
          start={{ x: 1, y: 0 }}
          end={{ x: 0.2, y: 0.7 }}
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            width: 220,
            height: 220,
            borderRadius: 220,
          }}
        />

        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full border border-brand-border bg-brand-surface"
          >
            <FontAwesome name="chevron-left" size={16} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={() => void onShare()}
            className="h-11 w-11 items-center justify-center rounded-full border border-brand-border bg-brand-surface"
          >
            <FontAwesome name="share-alt" size={16} color="#FFFFFF" />
          </Pressable>
        </View>

        {categoria ? (
          <View className="self-start rounded-lg bg-brand-chartreuse px-3 py-1.5">
            <Text className="font-sans-bold text-xs uppercase tracking-wide text-black">
              {categoria}
            </Text>
          </View>
        ) : null}

        <View>
          <Text className="font-sans-bold text-3xl text-white">
            {torneo.nombre}
          </Text>
          <View className="mt-2 flex-row items-center gap-2">
            <View
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: colorEstadoTorneoCard(torneo.estado) }}
            />
            <Text className="font-sans-medium text-sm text-white">
              {etiquetaEstadoTorneoCard(torneo.estado)}
            </Text>
            <Text className="font-sans text-sm text-brand-muted">
              · {torneo.cupos_actuales}/{torneo.cupos_maximos} duplas
            </Text>
          </View>
        </View>

        <View className="flex-row flex-wrap gap-3">
          <InfoTile
            icon="map-marker"
            label="Club"
            value={torneo.clubes?.nombre || torneo.lugar || "A confirmar"}
          />
          <InfoTile
            icon="calendar"
            label="Fecha"
            value={formatDateShort(torneo.fecha)}
          />
          <InfoTile
            icon="clock-o"
            label="Horario"
            value={hora ? `Desde ${hora}` : "A confirmar"}
          />
          <InfoTile
            icon="trophy"
            label="Formato"
            value={torneo.formato || torneo.modalidad || "A confirmar"}
          />
        </View>

        <View className="rounded-card border border-brand-border bg-brand-surface p-4">
          <View className="mb-3 flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <FontAwesome name="sitemap" size={14} color="#CBFE01" />
              <Text className="font-sans-semibold text-base text-white">
                Competencia
              </Text>
            </View>
          </View>

          <View className="gap-2">
            {tieneZonas ? (
              <Pressable
                onPress={() => router.push(hrefTorneoZonas(torneo.id))}
                className="flex-row items-center justify-between rounded-xl border border-brand-border bg-brand-elevated px-3 py-3"
              >
                <View className="flex-row items-center gap-3">
                  <FontAwesome name="th-large" size={14} color="#CBFE01" />
                  <View>
                    <Text className="font-sans-semibold text-sm text-white">
                      Zonas
                    </Text>
                    <Text className="font-sans text-xs text-brand-muted">
                      Parejas, tablas y partidos
                    </Text>
                  </View>
                </View>
                <FontAwesome name="chevron-right" size={12} color="#8A8A8A" />
              </Pressable>
            ) : null}

            <Pressable
              onPress={() => router.push(hrefTorneoCuadro(torneo.id))}
              className="flex-row items-center justify-between rounded-xl border border-brand-border bg-brand-elevated px-3 py-3"
            >
              <View className="flex-row items-center gap-3">
                <FontAwesome name="sitemap" size={14} color="#CBFE01" />
                <View>
                  <Text className="font-sans-semibold text-sm text-white">
                    Cuadro eliminatorio
                  </Text>
                  <Text className="font-sans text-xs text-brand-muted">
                    {tieneCuadro
                      ? "Octavos, cuartos, semis y final"
                      : "Se publica al cerrar zonas"}
                  </Text>
                </View>
              </View>
              <FontAwesome name="chevron-right" size={12} color="#8A8A8A" />
            </Pressable>
          </View>

          {partidos.length === 0 ? (
            <Text className="mt-3 font-sans text-sm text-brand-muted">
              Los partidos se publican cuando cierra la inscripción.
            </Text>
          ) : (
            <View className="mt-3 gap-2">
              {(tieneCuadro ? partidosCuadro : partidos).slice(0, 2).map((p) => (
                <View
                  key={p.id}
                  className="rounded-xl border border-brand-border bg-brand-elevated px-3 py-3"
                >
                  <Text className="font-sans text-xs text-brand-muted">
                    {p.ronda}
                  </Text>
                  <Text className="mt-1 font-sans-medium text-sm text-white" numberOfLines={1}>
                    {p.equipo_a_j1 || "TBD"} / {p.equipo_a_j2 || "—"} vs{" "}
                    {p.equipo_b_j1 || "TBD"} / {p.equipo_b_j2 || "—"}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {error ? (
          <Text className="font-sans text-sm text-red-400">{error}</Text>
        ) : null}
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between border-t border-brand-border bg-brand-black px-6 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View>
          <Text className="font-sans text-xs text-brand-muted">
            Inscripción / dupla
          </Text>
          <Text className="font-sans-bold text-2xl text-white">
            {formatCurrencyArs(torneo.precio_inscripcion || 0)}
          </Text>
        </View>
        <View className="w-[52%]">
          <Button
            label={
              yaInscripto
                ? "Ya inscripto"
                : abierto
                  ? "Inscribirme"
                  : "Ver cuadro"
            }
            disabled={yaInscripto}
            trailingIcon="arrow-right"
            onPress={() => {
              if (yaInscripto || !abierto) {
                router.push(hrefTorneoCuadro(torneo.id));
                return;
              }
              router.push(hrefTorneoInscripcion(torneo.id));
            }}
          />
        </View>
      </View>
    </View>
  );
}
