import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Pressable, Text, View } from "react-native";

import { formatCurrencyArs } from "@/src/lib/format";
import type { ClubConDisponibilidad } from "@/src/types/club.types";

interface ClubNearCardProps {
  club: ClubConDisponibilidad;
  onPress?: () => void;
  onReservar?: () => void;
}

export function ClubNearCard({ club, onPress, onReservar }: ClubNearCardProps) {
  const ubicacion = [
    club.distancia_km != null
      ? `${club.distancia_km.toFixed(1).replace(".", ",")} km`
      : null,
    club.localidad,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      onPress={onPress}
      className="flex-row gap-3 rounded-card border border-brand-border bg-brand-surface p-3 active:opacity-90"
    >
      <View className="h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-2xl bg-brand-chartreuse/10">
        <FontAwesome name="image" size={22} color="#4A5A2A" />
      </View>

      <View className="min-w-0 flex-1 gap-1.5">
        <Text className="font-sans-bold text-base text-white" numberOfLines={1}>
          {club.nombre}
        </Text>
        {ubicacion ? (
          <View className="flex-row items-center gap-1">
            <FontAwesome name="map-marker" size={11} color="#8A8A8A" />
            <Text className="font-sans text-xs text-brand-muted" numberOfLines={1}>
              {ubicacion}
            </Text>
          </View>
        ) : null}

        {club.horarios_hoy && club.horarios_hoy.length > 0 ? (
          <View className="mt-0.5 flex-row items-center gap-1.5">
            <FontAwesome name="clock-o" size={11} color="#8A8A8A" />
            <Text className="font-sans text-xs text-brand-muted" numberOfLines={1}>
              Hoy {club.horarios_hoy.join(" · ")}
            </Text>
          </View>
        ) : null}

        <View className="mt-1 flex-row items-end justify-between gap-2">
          <View className="flex-row items-baseline gap-1">
            {club.precio_desde != null ? (
              <>
                <Text className="font-sans-bold text-lg text-brand-chartreuse">
                  {formatCurrencyArs(club.precio_desde)}
                </Text>
                <Text className="font-sans text-xs text-brand-muted">/turno</Text>
              </>
            ) : (
              <Text className="font-sans text-xs text-brand-muted">
                Ver horarios
              </Text>
            )}
          </View>
          <Pressable
            onPress={(e) => {
              e.stopPropagation?.();
              onReservar?.();
            }}
            className="rounded-full bg-brand-chartreuse px-4 py-2 active:opacity-80"
          >
            <Text className="font-sans-bold text-sm text-black">Reservar</Text>
          </Pressable>
        </View>
      </View>
    </Pressable>
  );
}
