import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Pressable, Text, View } from "react-native";

import { duracionMinutos } from "@/src/lib/dateUtils";
import { formatDateShort, formatTime } from "@/src/lib/format";
import type { ReservaUsuario } from "@/src/types/reserva.types";

interface ReservaCardProps {
  reserva: ReservaUsuario;
  onPress?: () => void;
  onDetalle?: () => void;
}

function estadoReservaMeta(reserva: ReservaUsuario): {
  label: string;
  bg: string;
  color: string;
} {
  const pago = (reserva.estado_pago || "").toLowerCase();
  if (pago === "confirmado" || pago === "pagado" || pago === "completado") {
    return {
      label: "Confirmada",
      bg: "rgba(16, 185, 129, 0.15)",
      color: "#10B981",
    };
  }
  if (pago === "pendiente") {
    return {
      label: "Pendiente de pago",
      bg: "rgba(245, 158, 11, 0.15)",
      color: "#F59E0B",
    };
  }
  return {
    label: reserva.estado_reserva || "Reservada",
    bg: "rgba(138, 138, 138, 0.15)",
    color: "#8A8A8A",
  };
}

function fechaCortaReserva(iso: string, horaInicio?: string | null): string {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fecha = new Date(`${iso}T12:00:00`);
  fecha.setHours(0, 0, 0, 0);
  const diff = Math.round(
    (fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
  );
  const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  if (diff === 0) return horaInicio ? `Hoy · ${formatTime(horaInicio)}` : "Hoy";
  if (diff === 1) return horaInicio ? `Mañana · ${formatTime(horaInicio)}` : "Mañana";
  if (diff > 1 && diff < 7) {
    const base = `${dias[fecha.getDay()]} ${fecha.getDate()}`;
    return horaInicio ? `${base} · ${formatTime(horaInicio)}` : base;
  }
  const base = formatDateShort(iso);
  return horaInicio ? `${base} · ${formatTime(horaInicio)}` : base;
}

export function ReservaCard({ reserva, onPress, onDetalle }: ReservaCardProps) {
  const estado = estadoReservaMeta(reserva);
  const club = reserva.turnos?.canchas?.clubes?.nombre || "Club";
  const cancha = reserva.turnos?.canchas?.nombre || "Cancha";
  const fechaLabel = fechaCortaReserva(
    reserva.fecha_reserva,
    reserva.turnos?.hora_inicio,
  );
  const duracion = duracionMinutos(
    reserva.turnos?.hora_inicio,
    reserva.turnos?.hora_fin,
  );

  return (
    <Pressable
      onPress={onPress}
      className="gap-3 rounded-card border border-brand-border bg-brand-surface p-4 active:opacity-90"
    >
      <View className="flex-row items-center justify-between">
        <View
          className="flex-row items-center gap-2 rounded-full px-3 py-1"
          style={{ backgroundColor: estado.bg }}
        >
          <View
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: estado.color }}
          />
          <Text className="font-sans-semibold text-xs" style={{ color: estado.color }}>
            {estado.label}
          </Text>
        </View>
        <Text className="font-sans-medium text-sm text-white">{fechaLabel}</Text>
      </View>

      <View className="flex-row items-center gap-3">
        <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand-chartreuse/10">
          <FontAwesome name="building" size={20} color="#CBFE01" />
        </View>
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="font-sans-bold text-base text-white" numberOfLines={1}>
            {club}
          </Text>
          <Text className="font-sans text-sm text-brand-muted" numberOfLines={1}>
            {cancha}
            {duracion ? ` · ${duracion} min` : ""}
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1">
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              className={`h-7 w-7 items-center justify-center rounded-full border ${
                i < 2
                  ? "border-brand-chartreuse/40 bg-brand-chartreuse/15"
                  : "border-brand-border bg-brand-elevated"
              }`}
            >
              <FontAwesome
                name="user"
                size={12}
                color={i < 2 ? "#CBFE01" : "#4A4A4A"}
              />
            </View>
          ))}
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onDetalle?.();
          }}
          className="rounded-full border border-brand-border bg-brand-elevated px-4 py-2 active:opacity-80"
        >
          <Text className="font-sans-medium text-sm text-white">Detalle</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
