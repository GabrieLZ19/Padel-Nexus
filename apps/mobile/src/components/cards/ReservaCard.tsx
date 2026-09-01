import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Pressable, Text, View } from "react-native";

import { formatDateShort, formatTime } from "@/src/lib/format";
import type { ReservaUsuario } from "@/src/types/reserva.types";

interface ReservaCardProps {
  reserva: ReservaUsuario;
  onPress?: () => void;
}

function estadoReservaMeta(reserva: ReservaUsuario): {
  label: string;
  color: string;
} {
  const pago = (reserva.estado_pago || "").toLowerCase();
  if (pago === "confirmado" || pago === "pagado") {
    return { label: "Confirmada", color: "#10B981" };
  }
  if (pago === "pendiente") {
    return { label: "Pendiente de pago", color: "#F59E0B" };
  }
  return { label: reserva.estado_reserva || "Reservada", color: "#8A8A8A" };
}

export function ReservaCard({ reserva, onPress }: ReservaCardProps) {
  const estado = estadoReservaMeta(reserva);
  const club = reserva.turnos?.canchas?.clubes?.nombre || "Club";
  const cancha = reserva.turnos?.canchas?.nombre || "Cancha";
  const hora = formatTime(reserva.turnos?.hora_inicio);
  const fecha = formatDateShort(reserva.fecha_reserva);

  return (
    <Pressable
      onPress={onPress}
      className="rounded-card border border-brand-border bg-brand-surface p-4 active:opacity-90"
    >
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: estado.color }}
          />
          <Text className="font-sans-semibold text-sm" style={{ color: estado.color }}>
            {estado.label}
          </Text>
        </View>
        <Text className="font-sans-medium text-sm text-white">
          {fecha}
          {hora ? ` · ${hora}` : ""}
        </Text>
      </View>

      <View className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-chartreuse/10">
          <FontAwesome name="building" size={18} color="#CBFE01" />
        </View>
        <View className="flex-1 gap-1">
          <Text className="font-sans-bold text-base text-white">{club}</Text>
          <Text className="font-sans text-sm text-brand-muted">
            {cancha}
            {reserva.turnos?.hora_fin
              ? ` · ${formatTime(reserva.turnos.hora_inicio)} - ${formatTime(reserva.turnos.hora_fin)}`
              : ""}
          </Text>
        </View>
        <Pressable className="rounded-full border border-brand-border px-3 py-1.5">
          <Text className="font-sans-medium text-xs text-white">Detalle</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
