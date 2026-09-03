import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import type { UserCoords } from "@/src/hooks/useUserLocation";
import type { Club } from "@/src/types/club.types";

interface ClubsMapViewProps {
  clubs: Club[];
  userCoords?: UserCoords | null;
  selectedClubId?: string | null;
  onSelectClub?: (clubId: string) => void;
  height?: number;
}

interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

const FALLBACK_REGION: Region = {
  latitude: -34.6037,
  longitude: -58.3816,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

function buildRegion(
  clubs: Club[],
  userCoords?: UserCoords | null,
): Region {
  const points: { latitude: number; longitude: number }[] = clubs
    .filter((c) => c.latitud != null && c.longitud != null)
    .map((c) => ({
      latitude: Number(c.latitud),
      longitude: Number(c.longitud),
    }));

  if (userCoords) {
    points.push({
      latitude: userCoords.latitude,
      longitude: userCoords.longitude,
    });
  }

  if (points.length === 0) return FALLBACK_REGION;

  const lats = points.map((p) => p.latitude);
  const lngs = points.map((p) => p.longitude);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.6, 0.04),
    longitudeDelta: Math.max((maxLng - minLng) * 1.6, 0.04),
  };
}

function MapFallback({
  height,
  message,
}: {
  height: number;
  message: string;
}) {
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-card border border-brand-border bg-brand-surface px-6"
      style={{ height }}
    >
      <FontAwesome name="map-o" size={28} color="#CBFE01" />
      <Text className="mt-3 text-center font-sans-semibold text-sm text-white">
        {message}
      </Text>
      <Text className="mt-1 text-center font-sans text-xs text-brand-muted">
        Podés elegir un club desde la lista.
      </Text>
    </View>
  );
}

/**
 * Mapa de clubes. Import dinámico de react-native-maps para evitar
 * crash nativo al montar la pantalla si el módulo falla en el device.
 */
export function ClubsMapView({
  clubs,
  userCoords,
  selectedClubId,
  onSelectClub,
  height = 240,
}: ClubsMapViewProps) {
  const mapRef = useRef<{ animateToRegion: (r: Region, ms: number) => void } | null>(
    null,
  );
  const [Maps, setMaps] = useState<{
    MapView: ComponentType<Record<string, unknown>>;
    Marker: ComponentType<Record<string, unknown>>;
  } | null>(null);
  const [mapFailed, setMapFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const mod = await import("react-native-maps");
        if (cancelled) return;
        setMaps({
          MapView: mod.default as ComponentType<Record<string, unknown>>,
          Marker: mod.Marker as ComponentType<Record<string, unknown>>,
        });
      } catch (error) {
        if (__DEV__) {
          console.warn("[maps] No se pudo cargar react-native-maps:", error);
        }
        if (!cancelled) setMapFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const markers = useMemo(
    () =>
      clubs.filter(
        (c) =>
          c.latitud != null &&
          c.longitud != null &&
          !Number.isNaN(Number(c.latitud)) &&
          !Number.isNaN(Number(c.longitud)),
      ),
    [clubs],
  );

  const region = useMemo(
    () => buildRegion(markers, userCoords),
    [markers, userCoords],
  );

  useEffect(() => {
    if (!mapRef.current || mapFailed) return;
    try {
      mapRef.current.animateToRegion(region, 400);
    } catch {
      // ignore animate errors
    }
  }, [region, mapFailed]);

  if (mapFailed) {
    return <MapFallback height={height} message="Mapa no disponible" />;
  }

  if (!Maps) {
    return (
      <View
        className="items-center justify-center overflow-hidden rounded-card border border-brand-border bg-brand-surface"
        style={{ height }}
      >
        <Text className="font-sans text-sm text-brand-muted">Cargando mapa…</Text>
      </View>
    );
  }

  const { MapView, Marker } = Maps;
  const selected = markers.find((c) => c.id === selectedClubId) ?? null;

  return (
    <View
      className="overflow-hidden rounded-card border border-brand-border"
      style={{ height }}
      collapsable={false}
    >
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={region}
        showsUserLocation={Boolean(userCoords)}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        liteMode={Platform.OS === "android"}
        mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
        userInterfaceStyle="dark"
        onMapReady={() => {
          // no-op: confirma que el mapa montó sin crash
        }}
      >
        {markers.map((club) => {
          const isSelected = club.id === selectedClubId;
          return (
            <Marker
              key={club.id}
              coordinate={{
                latitude: Number(club.latitud),
                longitude: Number(club.longitud),
              }}
              title={club.nombre}
              description={[club.localidad, club.provincia]
                .filter(Boolean)
                .join(", ")}
              pinColor={isSelected ? "#CBFE01" : "#A8D400"}
              onPress={() => onSelectClub?.(club.id)}
            />
          );
        })}
      </MapView>

      {markers.length === 0 ? (
        <View className="absolute inset-0 items-center justify-center bg-black/55 px-6">
          <FontAwesome name="map-o" size={28} color="#CBFE01" />
          <Text className="mt-3 text-center font-sans-semibold text-sm text-white">
            Sin coordenadas de clubes
          </Text>
          <Text className="mt-1 text-center font-sans text-xs text-brand-muted">
            Revisá la lista abajo para reservar igual.
          </Text>
        </View>
      ) : null}

      {selected ? (
        <Pressable
          onPress={() => onSelectClub?.(selected.id)}
          className="absolute bottom-3 left-3 right-3 flex-row items-center gap-3 rounded-2xl border border-brand-border bg-brand-black/90 px-3 py-3 active:opacity-90"
        >
          <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-chartreuse/15">
            <FontAwesome name="map-marker" size={18} color="#CBFE01" />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-sans-bold text-sm text-white" numberOfLines={1}>
              {selected.nombre}
            </Text>
            <Text className="font-sans text-xs text-brand-muted" numberOfLines={1}>
              {[
                selected.distancia_km != null
                  ? `${selected.distancia_km.toFixed(1).replace(".", ",")} km`
                  : null,
                selected.localidad,
              ]
                .filter(Boolean)
                .join(" · ")}
            </Text>
          </View>
          <Text className="font-sans-semibold text-xs text-brand-chartreuse">
            Ver
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
