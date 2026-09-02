import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { Button } from "@/src/components/ui/Button";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import {
  formatCurrencyArs,
  formatDateShort,
  formatTime,
} from "@/src/lib/format";
import { hrefReservaPago } from "@/src/lib/navigation";
import { ReservasService } from "@/src/services/reservas";
import type { ReservaUsuario } from "@/src/types/reserva.types";

function estadoMeta(reserva: ReservaUsuario): {
  label: string;
  color: string;
} {
  const pago = (reserva.estado_pago || "").toLowerCase();
  if (pago === "completado" || pago === "pagado" || pago === "confirmado") {
    return { label: "Pagada", color: "#10B981" };
  }
  if (pago === "pendiente") {
    return { label: "Pendiente de pago", color: "#F59E0B" };
  }
  if (reserva.estado_reserva === "cancelada") {
    return { label: "Cancelada", color: "#F87171" };
  }
  return { label: reserva.estado_reserva || "Reservada", color: "#8A8A8A" };
}

export default function ReservaDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [reserva, setReserva] = useState<ReservaUsuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const data = await ReservasService.getById(id);
    setReserva(data);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      void load()
        .catch((err: unknown) => {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar la reserva.",
          );
        })
        .finally(() => setLoading(false));
    }, [load]),
  );

  async function onCancelar() {
    if (!id) return;
    setProcesando(true);
    setError(null);
    try {
      await ReservasService.cancelar(id);
      await load();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "No se pudo cancelar la reserva.",
      );
    } finally {
      setProcesando(false);
    }
  }

  const estado = reserva ? estadoMeta(reserva) : null;
  const pendientePago =
    reserva &&
    !["completado", "pagado", "confirmado"].includes(
      (reserva.estado_pago || "").toLowerCase(),
    ) &&
    reserva.estado_reserva !== "cancelada";

  return (
    <View className="flex-1 bg-brand-black px-6">
      <ScreenHeader title="Detalle de reserva" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 28, gap: 16 }}
      >
        {loading ? (
          <View className="h-48 items-center justify-center rounded-card border border-brand-border bg-brand-surface">
            <ActivityIndicator color="#CBFE01" />
          </View>
        ) : error && !reserva ? (
          <Text className="font-sans text-sm text-red-400">{error}</Text>
        ) : reserva ? (
          <>
            <View className="gap-4 rounded-card border border-brand-border bg-brand-surface p-5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center gap-2">
                  <View
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: estado?.color }}
                  />
                  <Text
                    className="font-sans-semibold text-sm"
                    style={{ color: estado?.color }}
                  >
                    {estado?.label}
                  </Text>
                </View>
                <Text className="font-sans text-xs text-brand-muted">
                  #{reserva.id.slice(0, 8)}
                </Text>
              </View>

              <View className="flex-row items-start gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-chartreuse/10">
                  <FontAwesome name="building" size={18} color="#CBFE01" />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="font-sans-bold text-lg text-white">
                    {reserva.turnos?.canchas?.clubes?.nombre ?? "Club"}
                  </Text>
                  <Text className="font-sans text-sm text-brand-muted">
                    {reserva.turnos?.canchas?.nombre ?? "Cancha"}
                  </Text>
                  <Text className="font-sans text-sm text-white">
                    {formatDateShort(reserva.fecha_reserva)}
                    {reserva.turnos?.hora_inicio
                      ? ` · ${formatTime(reserva.turnos.hora_inicio)} - ${formatTime(reserva.turnos.hora_fin)}`
                      : ""}
                  </Text>
                </View>
              </View>

              <View className="flex-row items-center justify-between border-t border-brand-border pt-4">
                <Text className="font-sans text-sm text-brand-muted">Total</Text>
                <Text className="font-sans-bold text-xl text-brand-chartreuse">
                  {formatCurrencyArs(reserva.turnos?.precio ?? 0)}
                </Text>
              </View>
            </View>

            {reserva.pagos && reserva.pagos.length > 0 ? (
              <View className="gap-2 rounded-card border border-brand-border bg-brand-surface p-4">
                <Text className="font-sans-semibold text-sm text-brand-muted">
                  Pagos
                </Text>
                {reserva.pagos.map((pago) => (
                  <View
                    key={pago.id}
                    className="flex-row items-center justify-between py-1"
                  >
                    <Text className="font-sans text-sm text-white">
                      {pago.metodo_pago} · {pago.estado}
                    </Text>
                    <Text className="font-sans-semibold text-sm text-white">
                      {formatCurrencyArs(pago.monto)}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}

            {error ? (
              <Text className="font-sans text-sm text-red-400">{error}</Text>
            ) : null}

            {pendientePago ? (
              <Button
                label="Completar pago"
                onPress={() => router.push(hrefReservaPago(reserva.id))}
              />
            ) : null}

            {reserva.estado_reserva !== "cancelada" &&
            reserva.estado_reserva !== "confirmada" ? (
              <Button
                label="Cancelar reserva"
                variant="ghost"
                loading={procesando}
                onPress={() => void onCancelar()}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}
