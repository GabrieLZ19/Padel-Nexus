import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Linking, Platform, Pressable, ScrollView, Text, View } from "react-native";

import type { UserCoords } from "@/src/hooks/useUserLocation";
import type { Club } from "@/src/types/club.types";

export interface ClubsInteractiveFallbackProps {
  clubs: Club[];
  userCoords?: UserCoords | null;
  selectedClubId?: string | null;
  onSelectClub?: (clubId: string) => void;
  height?: number;
}

function abrirEnMapaExterno(club: Club) {
  const query = encodeURIComponent(
    [club.nombre, club.direccion, club.localidad].filter(Boolean).join(", "),
  );
  const lat = club.latitud;
  const lng = club.longitud;

  const url =
    Platform.OS === "ios"
      ? lat && lng
        ? `maps:${lat},${lng}?q=${query}`
        : `maps:0,0?q=${query}`
      : lat && lng
        ? `geo:${lat},${lng}?q=${query}`
        : `geo:0,0?q=${query}`;

  void Linking.openURL(url).catch(() => {
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  });
}

/**
 * Explorador visual e interactivo de clubes cuando no se cuenta con vista de mapa
 * o mientras carga la conexión.
 */
export function ClubsInteractiveFallback({
  clubs,
  userCoords,
  selectedClubId,
  onSelectClub,
  height = 240,
}: ClubsInteractiveFallbackProps) {
  const selected = clubs.find((c) => c.id === selectedClubId) ?? clubs[0] ?? null;

  return (
    <View
      className="overflow-hidden rounded-card border border-brand-border bg-brand-surface p-4"
      style={{ minHeight: height }}
    >
      {/* Cabecera del radar / localizador */}
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-chartreuse/15">
            <FontAwesome name="map-marker" size={16} color="#CBFE01" />
          </View>
          <View>
            <Text className="font-sans-bold text-sm text-white">
              Explorador de clubes
            </Text>
            <Text className="font-sans text-xs text-brand-muted">
              {clubs.length} encontrados en tu zona
            </Text>
          </View>
        </View>

        {userCoords ? (
          <View className="flex-row items-center gap-1 rounded-full bg-brand-chartreuse/10 px-2.5 py-1">
            <FontAwesome name="crosshairs" size={11} color="#CBFE01" />
            <Text className="font-sans-semibold text-[11px] text-brand-chartreuse">
              GPS activo
            </Text>
          </View>
        ) : null}
      </View>

      {/* Selector horizontal rápido de clubes */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingBottom: 6 }}
      >
        {clubs.map((club) => {
          const isSelected = club.id === (selected?.id ?? null);
          return (
            <Pressable
              key={club.id}
              onPress={() => onSelectClub?.(club.id)}
              className={`rounded-xl border px-3 py-2 ${
                isSelected
                  ? "border-brand-chartreuse bg-brand-chartreuse/15"
                  : "border-brand-border bg-brand-black/50 active:opacity-80"
              }`}
            >
              <Text
                className={`font-sans-semibold text-xs ${
                  isSelected ? "text-brand-chartreuse" : "text-white"
                }`}
                numberOfLines={1}
              >
                {club.nombre}
              </Text>
              <Text className="mt-0.5 font-sans text-[11px] text-brand-muted">
                {club.distancia_km != null
                  ? `${club.distancia_km.toFixed(1).replace(".", ",")} km`
                  : club.localidad || "Pádel"}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Detalle del club seleccionado con acción rápida */}
      {selected ? (
        <View className="mt-2 flex-row items-center justify-between rounded-xl border border-brand-border bg-brand-black/70 p-3">
          <View className="min-w-0 flex-1 pr-2">
            <Text className="font-sans-bold text-sm text-white" numberOfLines={1}>
              {selected.nombre}
            </Text>
            <Text className="font-sans text-xs text-brand-muted" numberOfLines={1}>
              {[
                selected.distancia_km != null
                  ? `${selected.distancia_km.toFixed(1).replace(".", ",")} km`
                  : null,
                selected.direccion,
                selected.localidad,
              ]
                .filter(Boolean)
                .join(" · ") || "Club de pádel"}
            </Text>
          </View>

          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={() => abrirEnMapaExterno(selected)}
              className="h-9 w-9 items-center justify-center rounded-lg border border-brand-border bg-brand-surface active:opacity-80"
              accessibilityLabel="Ver en Google Maps"
            >
              <FontAwesome name="external-link" size={14} color="#CBFE01" />
            </Pressable>
            <Pressable
              onPress={() => onSelectClub?.(selected.id)}
              className="rounded-lg bg-brand-chartreuse px-3 py-2 active:opacity-80"
            >
              <Text className="font-sans-bold text-xs text-black">Ver club</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
