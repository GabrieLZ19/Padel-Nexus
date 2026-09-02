import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import {
  RankingListRow,
  RankingPodium,
} from "@/src/components/ranking/RankingPodium";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import { PROVINCIAS_ARG } from "@/src/constants/padelConfig";
import { hrefJugador } from "@/src/lib/navigation";
import { RankingsService } from "@/src/services/rankings";
import { useAuthStore } from "@/src/stores/authStore";
import type { RankingJugador } from "@/src/types/competencia.types";

type ScopeFilter = "Torneo" | "Copa" | "Provincial" | "Nacional" | "Global";

const SCOPE_OPTIONS: { id: ScopeFilter; label: string; enabled: boolean }[] = [
  { id: "Torneo", label: "Torneo", enabled: false },
  { id: "Copa", label: "Copa", enabled: false },
  { id: "Provincial", label: "Provincial", enabled: true },
  { id: "Nacional", label: "Nacional", enabled: true },
  { id: "Global", label: "Global", enabled: true },
];

function playerName(item: RankingJugador): string {
  const fromPerfil = [item.perfiles?.nombre, item.perfiles?.apellido]
    .filter(Boolean)
    .join(" ");
  if (fromPerfil) return fromPerfil;
  return [item.nombre, item.apellido].filter(Boolean).join(" ") || "Jugador";
}

function formatPts(value: number): string {
  return value.toLocaleString("es-AR");
}

function TrendBadge({ tendencia }: { tendencia: number }) {
  if (tendencia > 0) {
    return (
      <View className="flex-row items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1">
        <FontAwesome name="arrow-up" size={9} color="#34D399" />
        <Text className="font-sans-semibold text-xs text-emerald-400">
          +{tendencia}
        </Text>
      </View>
    );
  }
  if (tendencia < 0) {
    return (
      <View className="flex-row items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1">
        <FontAwesome name="arrow-down" size={9} color="#F87171" />
        <Text className="font-sans-semibold text-xs text-red-400">
          {tendencia}
        </Text>
      </View>
    );
  }
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-brand-elevated px-2.5 py-1">
      <Text className="font-sans-semibold text-xs text-brand-muted">— 0</Text>
    </View>
  );
}

export default function RankingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const [scope, setScope] = useState<ScopeFilter>("Provincial");
  const [provincia, setProvincia] = useState(
    usuario?.lugar_residencia || "Buenos Aires",
  );
  const [items, setItems] = useState<RankingJugador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provinciaSheet, setProvinciaSheet] = useState(false);

  const apiScope =
    scope === "Provincial" || scope === "Nacional" || scope === "Global"
      ? scope
      : "Provincial";

  const load = useCallback(async () => {
    const data = await RankingsService.getGlobal({
      scope: apiScope,
      provincia: apiScope === "Provincial" ? provincia : undefined,
      categoria: usuario?.categoria_padel || undefined,
    });
    setItems(data);
  }, [apiScope, provincia, usuario?.categoria_padel]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      void load()
        .catch((err: unknown) => {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el ranking.",
          );
        })
        .finally(() => setLoading(false));
    }, [load]),
  );

  const miPosicion = useMemo(() => {
    if (!usuario?.id) return null;
    const index = items.findIndex((item) => item.usuario_id === usuario.id);
    if (index === -1) return null;
    return { item: items[index], posicion: index + 1 };
  }, [items, usuario?.id]);

  const topThree = useMemo(() => items.slice(0, 3), [items]);
  const resto = useMemo(() => items.slice(3), [items]);
  const showProvinciaFilter = scope === "Provincial";
  const scopeLabel = scope === "Provincial" ? provincia : scope;
  const isEmpty = !loading && items.length === 0;

  const openJugador = useCallback(
    (item: RankingJugador, rank: number) => {
      router.push(
        hrefJugador(item.usuario_id, {
          posicion: rank,
          scope: apiScope,
        }),
      );
    },
    [router, apiScope],
  );

  return (
    <>
      <View className="flex-1 bg-brand-black">
        <LinearGradient
          colors={["rgba(203,254,1,0.12)", "rgba(203,254,1,0.02)", "transparent"]}
          locations={[0, 0.35, 1]}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: 320,
          }}
        />

        <View className="px-6 pb-2" style={{ paddingTop: insets.top + 8 }}>
          <View className="mb-4 flex-row items-center gap-3">
            <Pressable
              onPress={() => router.back()}
              className="h-11 w-11 items-center justify-center rounded-full border border-brand-border bg-brand-surface/80"
            >
              <FontAwesome name="chevron-left" size={16} color="#FFFFFF" />
            </Pressable>
            <View className="flex-1">
              <Text className="font-sans-bold text-3xl text-white">Ranking</Text>
              <Text className="mt-0.5 font-sans text-sm text-brand-muted">
                {scopeLabel}
                {usuario?.categoria_padel ? ` · ${usuario.categoria_padel}` : ""}
              </Text>
            </View>
            {showProvinciaFilter ? (
              <Pressable
                onPress={() => setProvinciaSheet(true)}
                className="flex-row items-center gap-2 rounded-full border border-brand-chartreuse/40 bg-brand-chartreuse/10 px-3.5 py-2.5"
              >
                <FontAwesome name="map-marker" size={13} color="#CBFE01" />
                <Text
                  className="max-w-[100px] font-sans-medium text-sm text-white"
                  numberOfLines={1}
                >
                  {provincia}
                </Text>
                <FontAwesome name="chevron-down" size={10} color="#CBFE01" />
              </Pressable>
            ) : null}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 4 }}
          >
            {SCOPE_OPTIONS.map((option) => {
              const active = option.id === scope;
              return (
                <Pressable
                  key={option.id}
                  disabled={!option.enabled}
                  onPress={() => {
                    if (option.enabled) setScope(option.id);
                  }}
                  className={`rounded-full px-4 py-2.5 ${
                    active
                      ? "bg-brand-chartreuse"
                      : "border border-brand-border bg-brand-surface"
                  } ${option.enabled ? "" : "opacity-40"}`}
                >
                  <Text
                    className={`font-sans-semibold text-sm ${
                      active ? "text-black" : "text-brand-muted"
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <FlatList
          data={loading ? [] : resto}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingBottom: insets.bottom + 28,
            gap: 10,
          }}
          ListHeaderComponent={
            <View className="mb-2 gap-5">
              {loading ? (
                <View className="items-center py-16">
                  <ActivityIndicator color="#CBFE01" size="large" />
                </View>
              ) : isEmpty ? (
                <View className="rounded-card border border-brand-border bg-brand-surface p-5">
                  <Text className="text-center font-sans text-base text-brand-muted">
                    No hay jugadores en este ranking todavía.
                  </Text>
                </View>
              ) : (
                <>
                  <View className="items-center gap-2 pt-2">
                    <View className="h-14 w-14 items-center justify-center rounded-full border border-brand-chartreuse/30 bg-brand-chartreuse/10">
                      <MaterialCommunityIcons
                        name="trophy-variant"
                        size={28}
                        color="#CBFE01"
                      />
                    </View>
                    <Text className="font-sans-semibold text-xs tracking-[2px] text-brand-chartreuse">
                      PODIO
                    </Text>
                  </View>

                  <RankingPodium
                    topThree={topThree}
                    highlightUserId={usuario?.id}
                    onPressPlayer={openJugador}
                  />

                  {miPosicion && miPosicion.posicion > 3 ? (
                    <View className="overflow-hidden rounded-card border border-brand-chartreuse/40">
                      <LinearGradient
                        colors={["rgba(203,254,1,0.18)", "rgba(203,254,1,0.04)"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <View className="flex-row items-center gap-4 px-4 py-4">
                          <View className="h-16 w-16 items-center justify-center rounded-2xl border border-brand-chartreuse/30 bg-brand-black/40">
                            <Text className="font-sans-bold text-3xl text-brand-chartreuse">
                              {miPosicion.item.posicion_actual ||
                                miPosicion.posicion}
                            </Text>
                          </View>
                          <View className="min-w-0 flex-1">
                            <Text className="font-sans-bold text-lg text-white">
                              Tu posición
                            </Text>
                            <Text
                              className="mt-1 font-sans text-sm text-brand-muted"
                              numberOfLines={2}
                            >
                              {playerName(miPosicion.item)} ·{" "}
                              {formatPts(miPosicion.item.puntos)} pts
                            </Text>
                          </View>
                          <TrendBadge tendencia={miPosicion.item.tendencia || 0} />
                        </View>
                      </LinearGradient>
                    </View>
                  ) : null}

                  {resto.length > 0 ? (
                    <View className="flex-row items-center gap-3">
                      <View className="h-px flex-1 bg-brand-border" />
                      <Text className="font-sans-semibold text-xs tracking-[1.6px] text-brand-muted">
                        RESTO DEL RANKING
                      </Text>
                      <View className="h-px flex-1 bg-brand-border" />
                    </View>
                  ) : null}

                  {error ? (
                    <Text className="font-sans text-sm text-red-400">{error}</Text>
                  ) : null}
                </>
              )}
            </View>
          }
          renderItem={({ item, index }) => {
            const rank = item.posicion_actual || index + 4;
            const isMe = item.usuario_id === usuario?.id;
            return (
              <RankingListRow
                item={item}
                rank={rank}
                isMe={isMe}
                onPress={() => openJugador(item, rank)}
              />
            );
          }}
          ListEmptyComponent={null}
          showsVerticalScrollIndicator={false}
        />
      </View>

      <BottomSheet
        visible={provinciaSheet}
        onClose={() => setProvinciaSheet(false)}
        title="Provincia"
      >
        <View className="gap-2">
          {PROVINCIAS_ARG.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                setProvincia(option.value);
                setProvinciaSheet(false);
              }}
              className={`rounded-card border px-4 py-3 ${
                provincia === option.value
                  ? "border-brand-chartreuse bg-brand-chartreuse/10"
                  : "border-brand-border bg-brand-surface"
              }`}
            >
              <Text
                className={`font-sans-medium ${
                  provincia === option.value
                    ? "text-brand-chartreuse"
                    : "text-white"
                }`}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </BottomSheet>
    </>
  );
}
