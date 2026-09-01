import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import {
  estadoTorneoColor,
  estadoTorneoLabel,
  formatCurrencyArs,
  formatDateShort,
} from "@/src/lib/format";
import type { Torneo } from "@/src/types/torneo.types";

interface TorneoCardProps {
  torneo: Torneo;
  onPress?: () => void;
}

export function TorneoCard({ torneo, onPress }: TorneoCardProps) {
  const banner = torneo.banners?.[0];
  const club = torneo.clubes?.nombre;
  const provincia = torneo.clubes?.provincia;

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-card border border-brand-border bg-brand-surface active:opacity-90"
    >
      {banner ? (
        <Image
          source={{ uri: banner }}
          style={{ width: "100%", height: 120 }}
          contentFit="cover"
        />
      ) : (
        <View className="h-[120px] items-center justify-center bg-brand-elevated">
          <FontAwesome name="trophy" size={28} color="#CBFE01" />
        </View>
      )}

      <View className="gap-2 p-4">
        <View className="flex-row items-center justify-between gap-2">
          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: `${estadoTorneoColor(torneo.estado)}22` }}
          >
            <Text
              className="font-sans-semibold text-[10px] uppercase tracking-wide"
              style={{ color: estadoTorneoColor(torneo.estado) }}
            >
              {estadoTorneoLabel(torneo.estado)}
            </Text>
          </View>
          {torneo.nivel ? (
            <Text className="font-sans-medium text-xs text-brand-muted">
              {torneo.nivel}
            </Text>
          ) : null}
        </View>

        <Text className="font-sans-bold text-lg text-white" numberOfLines={2}>
          {torneo.nombre}
        </Text>

        <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
          <View className="flex-row items-center gap-1.5">
            <FontAwesome name="calendar" size={12} color="#8A8A8A" />
            <Text className="font-sans text-sm text-brand-muted">
              {formatDateShort(torneo.fecha)}
            </Text>
          </View>
          {club ? (
            <View className="flex-row items-center gap-1.5">
              <FontAwesome name="map-marker" size={12} color="#8A8A8A" />
              <Text className="font-sans text-sm text-brand-muted" numberOfLines={1}>
                {[club, provincia].filter(Boolean).join(" · ")}
              </Text>
            </View>
          ) : null}
        </View>

        <Text className="font-sans-semibold text-sm text-brand-chartreuse">
          {formatCurrencyArs(torneo.precio_inscripcion)}
        </Text>
      </View>
    </Pressable>
  );
}
