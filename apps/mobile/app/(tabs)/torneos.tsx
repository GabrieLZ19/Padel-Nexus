import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { TorneoCard } from "@/src/components/cards/TorneoCard";
import { FilterChip, SearchField } from "@/src/components/ui/SearchField";
import { SegmentTabs } from "@/src/components/ui/SegmentTabs";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { BottomSheet } from "@/src/components/ui/BottomSheet";
import {
  OPCIONES_ESTADO_TORNEO,
  coincideFiltroEstadoTorneo,
  filtrarTorneosPublicos,
  type FiltroEstadoTorneo,
} from "@/src/lib/format";
import { TorneosService } from "@/src/services/torneos";
import { useAuthStore } from "@/src/stores/authStore";
import type { Torneo } from "@/src/types/torneo.types";

type TorneosTab = "disponibles" | "mis";

export default function TorneosTabScreen() {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TorneosTab>("disponibles");
  const [search, setSearch] = useState("");
  const [provincia, setProvincia] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<FiltroEstadoTorneo>("todos");
  const [filterSheet, setFilterSheet] = useState<
    "provincia" | "categoria" | "estado" | null
  >(null);

  const loadTorneos = useCallback(async () => {
    const data = await TorneosService.getAll({ limit: 100 });
    setTorneos(filtrarTorneosPublicos(data));
  }, []);

  useEffect(() => {
    void loadTorneos()
      .catch(() => setTorneos([]))
      .finally(() => setLoading(false));
  }, [loadTorneos]);

  const provincias = useMemo(
    () =>
      Array.from(
        new Set(torneos.map((t) => t.clubes?.provincia).filter(Boolean)),
      ).sort() as string[],
    [torneos],
  );

  const categorias = useMemo(
    () =>
      Array.from(new Set(torneos.map((t) => t.nivel).filter(Boolean))).sort() as string[],
    [torneos],
  );

  const estadoLabel = useMemo(
    () =>
      OPCIONES_ESTADO_TORNEO.find((o) => o.id === estadoFiltro)?.label ??
      "Estado",
    [estadoFiltro],
  );

  const filtered = useMemo(() => {
    let list = torneos.filter((t) =>
      coincideFiltroEstadoTorneo(t.estado, estadoFiltro),
    );

    if (tab === "mis" && usuario?.id) {
      list = list.filter((t) =>
        (t.inscripciones || []).some(
          (i) => i.usuario_id === usuario.id || i.usuario2_id === usuario.id,
        ),
      );
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.nombre.toLowerCase().includes(q) ||
          (t.clubes?.nombre || "").toLowerCase().includes(q),
      );
    }

    if (provincia) {
      list = list.filter((t) => t.clubes?.provincia === provincia);
    }

    if (categoria) {
      list = list.filter((t) => t.nivel === categoria);
    }

    return list;
  }, [torneos, tab, usuario?.id, search, provincia, categoria, estadoFiltro]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadTorneos();
    } finally {
      setRefreshing(false);
    }
  }, [loadTorneos]);

  const sheetTitle =
    filterSheet === "provincia"
      ? "Provincia"
      : filterSheet === "categoria"
        ? "Categoría"
        : "Estado del torneo";

  return (
    <>
      <FlatList
        className="flex-1 bg-brand-black"
        data={loading ? [] : filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{
          paddingTop: insets.top + 16,
          paddingBottom: insets.bottom + 24,
          paddingHorizontal: 24,
          gap: 14,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <View className="mb-2 gap-4">
            <Text className="font-sans-bold text-3xl text-white">Torneos</Text>

            <SegmentTabs
              value={tab}
              onChange={setTab}
              options={[
                { id: "disponibles", label: "Disponibles" },
                { id: "mis", label: "Mis torneos" },
              ]}
            />

            <SearchField
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar torneo o club"
            />

            <View className="flex-row flex-wrap gap-2">
              <FilterChip
                label={estadoFiltro !== "todos" ? `Estado: ${estadoLabel}` : "Estado"}
                active={estadoFiltro !== "todos"}
                onPress={() => setFilterSheet("estado")}
              />
              <FilterChip
                label={provincia ? `Provincia: ${provincia}` : "Provincia"}
                active={Boolean(provincia)}
                onPress={() => setFilterSheet("provincia")}
              />
              <FilterChip
                label={categoria ? `Categoría: ${categoria}` : "Categoría"}
                active={Boolean(categoria)}
                onPress={() => setFilterSheet("categoria")}
              />
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TorneoCard torneo={item} variant="featured" />
        )}
        ListEmptyComponent={
          loading ? (
            <View className="gap-3">
              <Skeleton className="h-72" />
              <Skeleton className="h-72" />
            </View>
          ) : (
            <View className="flex-1 items-center justify-center rounded-card border border-brand-border bg-brand-surface p-6">
              <Text className="text-center font-sans text-base text-brand-muted">
                {tab === "mis"
                  ? "No hay torneos en este estado para tu perfil."
                  : "No hay torneos con los filtros seleccionados."}
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

      <BottomSheet
        visible={filterSheet !== null}
        onClose={() => setFilterSheet(null)}
        title={sheetTitle}
      >
        <View className="gap-2">
          {filterSheet === "estado" ? (
            <>
              {OPCIONES_ESTADO_TORNEO.map((option) => (
                <Pressable
                  key={option.id}
                  onPress={() => {
                    setEstadoFiltro(option.id);
                    setFilterSheet(null);
                  }}
                  className={`rounded-card border px-4 py-3 ${
                    estadoFiltro === option.id
                      ? "border-brand-chartreuse bg-brand-chartreuse/10"
                      : "border-brand-border bg-brand-surface"
                  }`}
                >
                  <Text
                    className={`font-sans-medium ${
                      estadoFiltro === option.id
                        ? "text-brand-chartreuse"
                        : "text-white"
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </>
          ) : (
            <>
              <Pressable
                onPress={() => {
                  if (filterSheet === "provincia") setProvincia(null);
                  if (filterSheet === "categoria") setCategoria(null);
                  setFilterSheet(null);
                }}
                className="rounded-card border border-brand-border bg-brand-elevated px-4 py-3"
              >
                <Text className="font-sans-medium text-white">Todas</Text>
              </Pressable>
              {(filterSheet === "provincia" ? provincias : categorias).map(
                (option) => (
                  <Pressable
                    key={option}
                    onPress={() => {
                      if (filterSheet === "provincia") setProvincia(option);
                      if (filterSheet === "categoria") setCategoria(option);
                      setFilterSheet(null);
                    }}
                    className="rounded-card border border-brand-border bg-brand-surface px-4 py-3"
                  >
                    <Text className="font-sans-medium text-white">{option}</Text>
                  </Pressable>
                ),
              )}
            </>
          )}
        </View>
      </BottomSheet>
    </>
  );
}
