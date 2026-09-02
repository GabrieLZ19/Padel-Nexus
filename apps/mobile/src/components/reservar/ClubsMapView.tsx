import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useEffect, useMemo, useRef } from "react";
import { Platform, Pressable, Text, View } from "react-native";
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  type Region,
} from "react-native-maps";

import type { UserCoords } from "@/src/hooks/useUserLocation";
import type { Club } from "@/src/types/club.types";

interface ClubsMapViewProps {
  clubs: Club[];
  userCoords?: UserCoords | null;
  selectedClubId?: string | null;
  onSelectClub?: (clubId: string) => void;
  height?: number;
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

  const midLat = (minLat + maxLat) / 2;
  const midLng = (minLng + maxLng) / 2;
  const latDelta = Math.max((maxLat - minLat) * 1.6, 0.04);
  const lngDelta = Math.max((maxLng - minLng) * 1.6, 0.04);

  return {
    latitude: midLat,
    longitude: midLng,
    latitudeDelta: latDelta,
    longitudeDelta: lngDelta,
  };
}

export function ClubsMapView({
  clubs,
  userCoords,
  selectedClubId,
  onSelectClub,
  height = 240,
}: ClubsMapViewProps) {
  const mapRef = useRef<MapView | null>(null);

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
    if (!mapRef.current) return;
    mapRef.current.animateToRegion(region, 400);
  }, [region]);

  const selected = markers.find((c) => c.id === selectedClubId) ?? null;

  return (
    <View
      className="overflow-hidden rounded-card border border-brand-border"
      style={{ height }}
    >
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={PROVIDER_DEFAULT}
        initialRegion={region}
        showsUserLocation={Boolean(userCoords)}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        mapType={Platform.OS === "ios" ? "mutedStandard" : "standard"}
        userInterfaceStyle="dark"
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
