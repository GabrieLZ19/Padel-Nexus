import FontAwesome from "@expo/vector-icons/FontAwesome";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";

import { formatDateShort, formatTime } from "@/src/lib/format";
import type { ReservaUsuario } from "@/src/types/reserva.types";

interface ProximoTurnoCardProps {
  reserva: ReservaUsuario | null;
  loading?: boolean;
  onPress?: () => void;
  onReservarPress?: () => void;
}

export function ProximoTurnoCard({
  reserva,
  loading,
  onPress,
  onReservarPress,
}: ProximoTurnoCardProps) {
  if (loading) {
    return <View className="h-24 rounded-card bg-brand-surface" />;
  }

  if (!reserva) {
    return (
      <Pressable
        onPress={onReservarPress}
        className="rounded-card border border-dashed border-brand-border bg-brand-surface/60 p-4 active:opacity-90"
      >
        <Text className="font-sans-semibold text-xs uppercase tracking-widest text-brand-chartreuse">
          Tu próximo turno
        </Text>
        <Text className="mt-2 font-sans text-sm text-brand-muted">
          No tenés turnos próximos. Tocá para reservar una cancha.
        </Text>
      </Pressable>
    );
  }

  const cancha = reserva.turnos?.canchas?.nombre || "Cancha";
  const club = reserva.turnos?.canchas?.clubes?.nombre;
  const hora = formatTime(reserva.turnos?.hora_inicio);
  const fecha = formatDateShort(reserva.fecha_reserva);

  return (
    <Pressable onPress={onPress} className="active:opacity-95">
      <LinearGradient
        colors={["#1A1A1A", "#121212"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 20,
          borderWidth: 1,
          borderColor: "#CBFE0133",
          padding: 16,
        }}
      >
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-chartreuse">
            <FontAwesome name="calendar" size={20} color="#000000" />
          </View>

          <View className="flex-1 gap-1">
            <Text className="font-sans-semibold text-[10px] uppercase tracking-widest text-brand-chartreuse">
              Tu próximo turno
            </Text>
            <Text className="font-sans-bold text-base text-white">
              {cancha}
              {hora ? ` · ${hora}` : ""}
            </Text>
            <Text className="font-sans text-sm text-brand-muted" numberOfLines={1}>
              {[club, fecha].filter(Boolean).join(" · ")}
            </Text>
          </View>

          <FontAwesome name="chevron-right" size={14} color="#8A8A8A" />
        </View>
      </LinearGradient>
    </Pressable>
  );
}
