import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/src/components/ui/Button";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import {
  duracionMinutos,
  formatDateLongFromParts,
  parseIsoDate,
  toDateParts,
} from "@/src/lib/dateUtils";
import { formatCurrencyArs, formatTime } from "@/src/lib/format";
import { hrefReservaDetalle } from "@/src/lib/navigation";
import {
  abrirCheckoutMercadoPago,
  resolverUrlCheckout,
} from "@/src/services/pagos";
import { ReservasService } from "@/src/services/reservas";
import { useAuthStore } from "@/src/stores/authStore";
import type { ReservaUsuario } from "@/src/types/reserva.types";

type MetodoPago = "mercadopago" | "efectivo";

function DetalleFila({
  icon,
  titulo,
  subtitulo,
}: {
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  titulo: string;
  subtitulo?: string;
}) {
  return (
    <View className="flex-row items-start gap-3">
      <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-chartreuse/10">
        <FontAwesome name={icon} size={16} color="#CBFE01" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="font-sans-bold text-base text-white">{titulo}</Text>
        {subtitulo ? (
          <Text className="font-sans text-sm text-brand-muted">{subtitulo}</Text>
        ) : null}
      </View>
    </View>
  );
}

function construirMensajeInvitacion(reserva: ReservaUsuario): string {
  const club = reserva.turnos?.canchas?.clubes?.nombre ?? "Club";
  const cancha = reserva.turnos?.canchas?.nombre ?? "Cancha";
  const fecha = reserva.fecha_reserva
    ? formatDateLongFromParts(toDateParts(parseIsoDate(reserva.fecha_reserva)))
    : reserva.fecha_reserva;
  const horaInicio = formatTime(reserva.turnos?.hora_inicio);
  const horaFin = formatTime(reserva.turnos?.hora_fin);
  const horario =
    horaInicio && horaFin ? `${horaInicio} – ${horaFin}` : horaInicio;
  const precio = formatCurrencyArs(reserva.turnos?.precio ?? 0);

  return [
    "Hola, te invito a un turno de pádel.",
    "",
    `Club: ${club}`,
    `Cancha: ${cancha}`,
    `Fecha: ${fecha}`,
    horario ? `Horario: ${horario}` : null,
    `Valor del turno: ${precio}`,
    "",
    "Si podés sumarte, avisame para confirmar.",
    "Padel Nexus",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function ReservaCheckoutScreen() {
  const params = useLocalSearchParams<{
    turnoId?: string;
    fecha?: string;
    reservaId?: string;
    clubId?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);

  const [reserva, setReserva] = useState<ReservaUsuario | null>(null);
  const [metodoPago, setMetodoPago] = useState<MetodoPago>("mercadopago");
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [completado, setCompletado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const nombreYo = useMemo(() => {
    const full = `${usuario?.nombre ?? ""} ${usuario?.apellido ?? ""}`.trim();
    return full || "Vos";
  }, [usuario?.apellido, usuario?.nombre]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (params.reservaId) {
        const data = await ReservasService.getById(params.reservaId);
        setReserva(data);
        if (
          data.estado_pago === "completado" ||
          data.estado_pago === "pagado"
        ) {
          setCompletado(true);
        }
        return;
      }

      if (!params.turnoId || !params.fecha) {
        throw new Error("Faltan datos del turno.");
      }

      const turno = await ReservasService.getTurno(params.turnoId);
      setReserva({
        id: "preview",
        turno_id: params.turnoId,
        fecha_reserva: params.fecha,
        estado_pago: "pendiente",
        estado_reserva: "pendiente",
        turnos: turno,
      });
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "No se pudo cargar el checkout.",
      );
    } finally {
      setLoading(false);
    }
  }, [params.fecha, params.reservaId, params.turnoId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function asegurarReservaCompleta(): Promise<ReservaUsuario> {
    if (reserva && reserva.id !== "preview" && reserva.turnos) {
      return reserva;
    }

    if (reserva && reserva.id !== "preview") {
      const completa = await ReservasService.getById(reserva.id);
      setReserva(completa);
      return completa;
    }

    if (!params.turnoId || !params.fecha) {
      throw new Error("Faltan datos para crear la reserva.");
    }

    // Conservar el snapshot del preview: crear() solo devuelve la fila base.
    const turnosPreview = reserva?.turnos ?? null;
    const creada = await ReservasService.crear({
      turno_id: params.turnoId,
      fecha_reserva: params.fecha,
    });

    try {
      const completa = await ReservasService.getById(creada.id);
      setReserva(completa);
      return completa;
    } catch {
      const merged: ReservaUsuario = {
        ...creada,
        turnos: turnosPreview ?? creada.turnos,
      };
      setReserva(merged);
      return merged;
    }
  }

  async function refrescarReserva(reservaId: string) {
    try {
      const completa = await ReservasService.getById(reservaId);
      setReserva(completa);
      return completa;
    } catch {
      // Mantener el estado actual si falla el refresh.
      return reserva;
    }
  }

  async function onPagar() {
    if (!reserva?.turnos) return;
    setProcesando(true);
    setError(null);
    setMensaje(null);

    try {
      const reservaActual = await asegurarReservaCompleta();
      const reservaId = reservaActual.id;
      const monto = reservaActual.turnos?.precio ?? reserva.turnos.precio;

      if (metodoPago === "efectivo") {
        await ReservasService.pagarManual(reservaId, {
          monto,
          metodo_pago: "efectivo",
        });
        await refrescarReserva(reservaId);
        setCompletado(true);
        setMensaje("Reserva registrada. Pagá en el club al llegar.");
        return;
      }

      const preferencia = await ReservasService.crearPreferenciaMp(reservaId);
      if (!preferencia.mockConfirmed && !resolverUrlCheckout(preferencia)) {
        throw new Error("Mercado Pago no devolvió URL de checkout.");
      }

      const resultado = await abrirCheckoutMercadoPago(preferencia);

      if (resultado.tipo === "exito") {
        await ReservasService.confirmarRetornoMp(
          reservaId,
          resultado.paymentId ?? `mobile-${Date.now()}`,
        );
        await refrescarReserva(reservaId);
        setCompletado(true);
        return;
      }

      // Al volver sin pagar, rehidratar datos completos para no perder club/cancha/precio.
      const actualizada = await refrescarReserva(reservaId);

      if (resultado.tipo === "pendiente") {
        setMensaje("Tu pago está pendiente de acreditación en Mercado Pago.");
        return;
      }

      if (resultado.tipo === "fallo") {
        setError("El pago no pudo completarse. Intentá nuevamente.");
        return;
      }

      if (
        actualizada &&
        (actualizada.estado_pago === "completado" ||
          actualizada.estado_pago === "pagado")
      ) {
        setCompletado(true);
        return;
      }

      setMensaje(
        "No se confirmó el pago. Podés intentar nuevamente cuando quieras.",
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al procesar el pago.");
      if (reserva?.id && reserva.id !== "preview") {
        await refrescarReserva(reserva.id);
      }
    } finally {
      setProcesando(false);
    }
  }

  async function onVerificarPago() {
    if (!reserva || reserva.id === "preview") return;
    setProcesando(true);
    setError(null);
    try {
      await ReservasService.confirmarRetornoMp(
        reserva.id,
        `mobile-verify-${Date.now()}`,
      );
      const actualizada = await ReservasService.getById(reserva.id);
      setReserva(actualizada);
      if (
        actualizada.estado_pago === "completado" ||
        actualizada.estado_pago === "pagado"
      ) {
        setCompletado(true);
      } else {
        setMensaje("El pago aún no figura acreditado. Revisá en unos minutos.");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "No se pudo verificar el pago.",
      );
    } finally {
      setProcesando(false);
    }
  }

  async function compartirWhatsApp() {
    if (!reserva?.turnos) return;
    const texto = encodeURIComponent(construirMensajeInvitacion(reserva));
    const url = `https://wa.me/?text=${texto}`;
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      setError("No se pudo abrir WhatsApp en este dispositivo.");
      return;
    }
    await Linking.openURL(url);
  }

  const club = reserva?.turnos?.canchas?.clubes?.nombre ?? "Club";
  const cancha = reserva?.turnos?.canchas?.nombre ?? "Cancha";
  const tipoSuelo = reserva?.turnos?.canchas?.tipo_suelo;
  const precio = reserva?.turnos?.precio ?? 0;
  const duracion = duracionMinutos(
    reserva?.turnos?.hora_inicio,
    reserva?.turnos?.hora_fin,
  );

  const fechaLabel = reserva?.fecha_reserva
    ? formatDateLongFromParts(toDateParts(parseIsoDate(reserva.fecha_reserva)))
    : "";

  const fechaSubtitulo = useMemo(() => {
    if (!reserva?.fecha_reserva) return undefined;
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const fecha = parseIsoDate(reserva.fecha_reserva);
    fecha.setHours(0, 0, 0, 0);
    const diff = Math.round(
      (fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diff === 0) return "Hoy";
    if (diff === 1) return "Mañana";
    return undefined;
  }, [reserva?.fecha_reserva]);

  const horarioLabel = reserva?.turnos?.hora_inicio
    ? `${formatTime(reserva.turnos.hora_inicio)} – ${formatTime(reserva.turnos.hora_fin)}`
    : "";

  const canchaSubtitulo = [cancha, tipoSuelo].filter(Boolean).join(" · ");

  return (
    <View className="flex-1 bg-brand-black">
      <View className="px-6">
        <ScreenHeader title="Confirmar reserva" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 120,
          gap: 20,
        }}
      >
        {loading ? (
          <View className="h-48 items-center justify-center rounded-card border border-brand-border bg-brand-surface">
            <ActivityIndicator color="#CBFE01" />
          </View>
        ) : error && !reserva ? (
          <View className="rounded-card border border-brand-border bg-brand-surface p-5">
            <Text className="font-sans text-sm text-red-400">{error}</Text>
          </View>
        ) : completado ? (
          <View className="items-center gap-4 rounded-card border border-brand-chartreuse/30 bg-brand-surface p-6">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-brand-chartreuse/15">
              <FontAwesome name="check" size={28} color="#CBFE01" />
            </View>
            <Text className="text-center font-sans-bold text-xl text-white">
              ¡Reserva confirmada!
            </Text>
            <Text className="text-center font-sans text-sm text-brand-muted">
              {mensaje ||
                "Tu turno quedó registrado. Podés ver el detalle en Mis reservas."}
            </Text>
            {reserva && reserva.id !== "preview" ? (
              <>
                <Button
                  label="Ver detalle"
                  onPress={() => router.replace(hrefReservaDetalle(reserva.id))}
                />
                <Pressable
                  onPress={() => void compartirWhatsApp()}
                  className="flex-row items-center justify-center gap-2 rounded-full border border-brand-chartreuse px-5 py-3 active:opacity-80"
                >
                  <FontAwesome name="whatsapp" size={16} color="#CBFE01" />
                  <Text className="font-sans-semibold text-sm text-brand-chartreuse">
                    Invitar por WhatsApp
                  </Text>
                </Pressable>
              </>
            ) : null}
          </View>
        ) : reserva ? (
          <>
            <View className="gap-4 rounded-card border border-brand-border bg-brand-surface p-5">
              <DetalleFila
                icon="building"
                titulo={club}
                subtitulo={canchaSubtitulo}
              />
              <DetalleFila
                icon="calendar"
                titulo={fechaLabel}
                subtitulo={fechaSubtitulo}
              />
              <DetalleFila
                icon="clock-o"
                titulo={horarioLabel}
                subtitulo={duracion ? `${duracion} minutos` : undefined}
              />
            </View>

            <View className="gap-3">
              <Text className="font-sans-bold text-base text-white">
                Compañeros de turno
              </Text>

              <View className="gap-2 rounded-card border border-brand-border bg-brand-surface p-3">
                <View className="flex-row items-center justify-between py-2">
                  <View className="flex-row items-center gap-3">
                    <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-chartreuse/20">
                      <Text className="font-sans-bold text-sm text-brand-chartreuse">
                        {nombreYo.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <Text className="font-sans-semibold text-sm text-white">
                      {nombreYo} (vos)
                    </Text>
                  </View>
                  <View className="rounded-full bg-emerald-500/15 px-3 py-1">
                    <Text className="font-sans-semibold text-xs text-emerald-400">
                      Confirmado
                    </Text>
                  </View>
                </View>

                {[2, 3, 4].map((slot) => (
                  <Pressable
                    key={slot}
                    onPress={() => void compartirWhatsApp()}
                    className="flex-row items-center justify-between py-2 active:opacity-80"
                  >
                    <View className="flex-row items-center gap-3">
                      <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-elevated">
                        <FontAwesome name="plus" size={14} color="#CBFE01" />
                      </View>
                      <Text className="font-sans-semibold text-sm text-brand-muted">
                        Invitar jugador
                      </Text>
                    </View>
                    <Text className="font-sans-semibold text-xs text-brand-chartreuse">
                      Invitar
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Pressable
                onPress={() => void compartirWhatsApp()}
                className="flex-row items-center justify-center gap-2 rounded-full border border-brand-chartreuse py-3.5 active:opacity-80"
              >
                <FontAwesome name="whatsapp" size={16} color="#CBFE01" />
                <Text className="font-sans-semibold text-sm text-brand-chartreuse">
                  Compartir invitación por WhatsApp
                </Text>
              </Pressable>
            </View>

            <View className="gap-2">
              <Text className="font-sans-semibold text-sm text-brand-muted">
                Método de pago
              </Text>
              {(
                [
                  { id: "mercadopago" as const, label: "Mercado Pago" },
                  { id: "efectivo" as const, label: "Efectivo en el club" },
                ] as const
              ).map((opcion) => {
                const active = metodoPago === opcion.id;
                return (
                  <Pressable
                    key={opcion.id}
                    onPress={() => setMetodoPago(opcion.id)}
                    className={`flex-row items-center justify-between rounded-card border px-4 py-4 ${
                      active
                        ? "border-brand-chartreuse bg-brand-chartreuse/10"
                        : "border-brand-border bg-brand-surface"
                    }`}
                  >
                    <Text
                      className={`font-sans-semibold text-base ${
                        active ? "text-white" : "text-brand-muted"
                      }`}
                    >
                      {opcion.label}
                    </Text>
                    {active ? (
                      <FontAwesome name="check-circle" size={18} color="#CBFE01" />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            {error ? (
              <Text className="font-sans text-sm text-red-400">{error}</Text>
            ) : null}
            {mensaje ? (
              <Text className="font-sans text-sm text-amber-400">{mensaje}</Text>
            ) : null}

            {reserva.id !== "preview" && mensaje ? (
              <Button
                label="Verificar pago"
                variant="ghost"
                loading={procesando}
                onPress={() => void onVerificarPago()}
              />
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {reserva && !completado && !loading ? (
        <View
          className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between border-t border-brand-border bg-brand-black px-6 py-4"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="flex-1 gap-0.5 pr-4">
            <Text className="font-sans text-sm text-brand-muted">Total</Text>
            <Text className="font-sans-bold text-2xl text-white">
              {formatCurrencyArs(precio)}
            </Text>
          </View>
          <Pressable
            onPress={() => void onPagar()}
            disabled={procesando}
            className="rounded-full bg-brand-chartreuse px-6 py-4 active:opacity-90 disabled:opacity-60"
          >
            {procesando ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text className="font-sans-bold text-base text-black">
                Confirmar y pagar
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
