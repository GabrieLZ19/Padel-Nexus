import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Pressable, Text, View } from "react-native";

import type { Club } from "@/src/types/club.types";

interface ClubCardProps {
  club: Club;
  onPress?: () => void;
}

export function ClubCard({ club, onPress }: ClubCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-4 rounded-card border border-brand-border bg-brand-surface p-4 active:opacity-90"
    >
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-chartreuse/10">
        <FontAwesome name="building" size={20} color="#CBFE01" />
      </View>
      <View className="flex-1 gap-1">
        <Text className="font-sans-bold text-base text-white" numberOfLines={1}>
          {club.nombre}
        </Text>
        <Text className="font-sans text-sm text-brand-muted" numberOfLines={1}>
          {[club.localidad, club.provincia].filter(Boolean).join(", ")}
        </Text>
        <Text className="font-sans-medium text-xs text-brand-chartreuse">
          {club.canchas} {club.canchas === 1 ? "cancha" : "canchas"}
          {club.distancia_km != null
            ? ` · ${club.distancia_km.toFixed(1)} km`
            : ""}
        </Text>
      </View>
      <FontAwesome name="chevron-right" size={14} color="#8A8A8A" />
    </Pressable>
  );
}
