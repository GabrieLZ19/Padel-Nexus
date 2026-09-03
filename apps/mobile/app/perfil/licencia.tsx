import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Share,
  Text,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { Button } from "@/src/components/ui/Button";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { formatCurrencyArs } from "@/src/lib/format";
import { abrirCheckoutMercadoPago } from "@/src/services/pagos";
import { ClubesService } from "@/src/services/clubes";
import { LicenciasService } from "@/src/services/licencias";
import { useAuthStore } from "@/src/stores/authStore";
import type { Club } from "@/src/types/club.types";
import type { Licencia, LicenciaCotizacion } from "@/src/types/licencia.types";
import {
  licenciaEstadoPago,
  licenciaPrecioAnual,
} from "@/src/types/licencia.types";

function formatMonthYear(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${month}/${date.getFullYear()}`;
}

function estadoBadge(estado: string): {
  label: string;
  color: string;
  bg: string;
} {
  const e = estado.toLowerCase();
  if (e === "activa") {
    return { label: "Vigente", color: "#10B981", bg: "rgba(16,185,129,0.15)" };
  }
  if (e === "pendiente") {
    return { label: "Pendiente", color: "#F59E0B", bg: "rgba(245,158,11,0.15)" };
  }
  if (e === "vencida") {
    return { label: "Vencida", color: "#F87171", bg: "rgba(248,113,113,0.15)" };
  }
  if (e === "suspendida") {
    return {
      label: "Suspendida",
      color: "#8A8A8A",
      bg: "rgba(138,138,138,0.15)",
    };
  }
  return { label: estado || "Sin estado", color: "#8A8A8A", bg: "#1A1A1A" };
}

function sexoLabel(sexo?: string | null): string {
  if (sexo === "femenino") return "Damas";
  if (sexo === "masculino") return "Caballeros";
  return "Open";
}

export default function LicenciaScreen() {
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const [licencia, setLicencia] = useState<Licencia | null>(null);
  const [cotizacion, setCotizacion] = useState<LicenciaCotizacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [soliciting, setSoliciting] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [clubes, setClubes] = useState<Club[]>([]);
  const [clubId, setClubId] = useState<string | null>(null);
  const [mostrarClubes, setMostrarClubes] = useState(false);

  const load = useCallback(async () => {
    if (!usuario?.id) {
      setLicencia(null);
      return;
    }
    const data = await LicenciasService.obtenerPorUsuario(usuario.id);
    setLicencia(data);
  }, [usuario?.id]);

  const loadCotizacion = useCallback(async () => {
    const data = await LicenciasService.cotizar({
      club_id: clubId || usuario?.club_id,
      provincia: usuario?.lugar_residencia,
    });
    setCotizacion(data);
  }, [clubId, usuario?.club_id, usuario?.lugar_residencia]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      void ClubesService.getAll({ limit: 50 })
        .then(setClubes)
        .catch(() => setClubes([]));
      void Promise.all([load(), loadCotizacion().catch(() => setCotizacion(null))])
        .catch((err: unknown) => {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar la licencia.",
          );
        })
        .finally(() => setLoading(false));
    }, [load, loadCotizacion]),
  );

  useEffect(() => {
    if (usuario?.club_id) {
      setClubId(usuario.club_id);
    }
  }, [usuario?.club_id]);

  useEffect(() => {
    void loadCotizacion().catch(() => undefined);
  }, [loadCotizacion]);

  const clubSeleccionado = clubes.find((c) => c.id === clubId);
  const nombreCompleto = [usuario?.nombre, usuario?.apellido]
    .filter(Boolean)
    .join(" ");
  const initial = (usuario?.nombre || "J").trim().charAt(0).toUpperCase();
  const badge = estadoBadge(licencia?.estado || "");
  const estadoPago = licenciaEstadoPago(licencia);
  const precio =
    licenciaPrecioAnual(licencia) || cotizacion?.precio_anual || 0;
  const pagoPendiente =
    Boolean(licencia) &&
    (licencia?.estado || "").toLowerCase() === "pendiente" &&
    estadoPago === "pendiente" &&
    precio > 0;

  const qrPayload = licencia
    ? JSON.stringify({
        tipo: "licencia_fap",
        nro: licencia.nro_licencia,
        usuario_id: licencia.usuario_id,
        estado: licencia.estado,
      })
    : "";

  async function onSolicitar() {
    if (!usuario) return;
    if (!usuario.nombre || !usuario.apellido || !usuario.dni) {
      setError("Completá tus datos personales antes de solicitar la licencia.");
      return;
    }
    if (!usuario.lugar_residencia) {
      setError("Indicá tu provincia en Datos personales.");
      return;
    }
    const clubFinal = clubId || usuario.club_id;
    if (!clubFinal) {
      setError("Elegí el club al que estás afiliado.");
      setMostrarClubes(true);
      return;
    }

    setSoliciting(true);
    setError(null);
    setMensaje(null);
    try {
      const created = await LicenciasService.solicitar({
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        documento: usuario.dni,
        provincia: usuario.lugar_residencia,
        club_id: clubFinal,
      });
      setLicencia(created);
      const monto = licenciaPrecioAnual(created);
      if (monto > 0 && licenciaEstadoPago(created) === "pendiente") {
        setMensaje(
          `Solicitud creada. Completá el pago anual de ${formatCurrencyArs(monto)}.`,
        );
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "No se pudo solicitar la licencia.",
      );
    } finally {
      setSoliciting(false);
    }
  }

  async function onPagarLicencia() {
    if (!licencia) return;
    setPagando(true);
    setError(null);
    setMensaje(null);
    try {
      const preferencia = await LicenciasService.crearPreferenciaMp(licencia.id);
      const resultado = await abrirCheckoutMercadoPago(preferencia);

      if (resultado.tipo === "exito") {
        if (preferencia.mockConfirmed && preferencia.licencia) {
          setLicencia(preferencia.licencia);
        } else if (!preferencia.mockConfirmed) {
          const updated = await LicenciasService.confirmarRetornoMp(
            licencia.id,
            resultado.paymentId ?? `mobile-${Date.now()}`,
          );
          setLicencia(updated);
        } else {
          await load();
        }
        setMensaje(
          "Pago registrado. La federación revisará y aprobará tu carnet.",
        );
        return;
      }

      if (resultado.tipo === "fallo") {
        setError("El pago no pudo completarse.");
        return;
      }

      await load();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "No se pudo iniciar el pago.",
      );
    } finally {
      setPagando(false);
    }
  }

  async function onShare() {
    if (!licencia) return;
    await Share.share({
      message: `Mi licencia FAP ${licencia.nro_licencia} · Estado: ${licencia.estado}`,
    });
  }

  return (
    <View className="flex-1 bg-brand-black px-6">
      <ScreenHeader title="Mi Licencia" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 28, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View className="h-72 items-center justify-center rounded-card border border-brand-border bg-brand-surface">
            <ActivityIndicator color="#CBFE01" />
          </View>
        ) : !licencia ? (
          <View className="gap-4 rounded-card border border-brand-border bg-brand-surface p-5">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand-chartreuse/10">
              <MaterialCommunityIcons
                name="shield-check-outline"
                size={28}
                color="#CBFE01"
              />
            </View>
            <Text className="font-sans-bold text-xl text-white">
              Todavía no tenés licencia
            </Text>
            <Text className="font-sans text-base text-brand-muted">
              Solicitá tu licencia oficial FAP para participar en torneos
              federados.
            </Text>

            {precio > 0 ? (
              <View className="rounded-card border border-brand-chartreuse/30 bg-brand-chartreuse/10 px-4 py-3">
                <Text className="font-sans text-xs text-brand-muted">
                  Costo anual
                </Text>
                <Text className="font-sans-bold text-2xl text-brand-chartreuse">
                  {formatCurrencyArs(precio)}
                </Text>
                {cotizacion?.descripcion_vigencia ? (
                  <Text className="mt-1 font-sans text-xs text-brand-muted">
                    {cotizacion.descripcion_vigencia}
                  </Text>
                ) : null}
              </View>
            ) : null}

            <Pressable
              onPress={() => setMostrarClubes((v) => !v)}
              className="rounded-card border border-brand-border bg-brand-elevated px-4 py-3"
            >
              <Text className="font-sans text-xs text-brand-muted">Club</Text>
              <Text className="font-sans-semibold text-base text-white">
                {clubSeleccionado?.nombre ?? "Elegir club"}
              </Text>
            </Pressable>
            {mostrarClubes ? (
              <View className="gap-2">
                {clubes.slice(0, 8).map((club) => (
                  <Pressable
                    key={club.id}
                    onPress={() => {
                      setClubId(club.id);
                      setMostrarClubes(false);
                    }}
                    className={`rounded-xl border px-3 py-2 ${
                      clubId === club.id
                        ? "border-brand-chartreuse bg-brand-chartreuse/10"
                        : "border-brand-border"
                    }`}
                  >
                    <Text className="font-sans-medium text-sm text-white">
                      {club.nombre}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {error ? (
              <Text className="font-sans text-sm text-red-400">{error}</Text>
            ) : null}
            <Button
              label={
                precio > 0
                  ? `Solicitar · ${formatCurrencyArs(precio)}`
                  : "Solicitar licencia"
              }
              loading={soliciting}
              onPress={() => void onSolicitar()}
            />
          </View>
        ) : (
          <>
            <View className="overflow-hidden rounded-card border border-brand-border bg-brand-surface">
              <LinearGradient
                colors={["rgba(203,254,1,0.12)", "transparent"]}
                start={{ x: 1, y: 0 }}
                end={{ x: 0.2, y: 0.8 }}
                style={{ padding: 20 }}
              >
                <View className="mb-5 flex-row items-start justify-between gap-3">
                  <View className="flex-1">
                    <Text className="font-sans text-[10px] tracking-[1.2px] text-brand-muted">
                      FEDERACIÓN ARGENTINA DE PÁDEL
                    </Text>
                    <Text className="mt-1 font-sans-bold text-xl text-white">
                      Licencia Oficial{" "}
                      {licencia.fecha_emision
                        ? new Date(licencia.fecha_emision).getFullYear()
                        : new Date().getFullYear()}
                    </Text>
                  </View>
                  <View
                    className="flex-row items-center gap-1.5 rounded-full px-3 py-1.5"
                    style={{ backgroundColor: badge.bg }}
                  >
                    <View
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: badge.color }}
                    />
                    <Text
                      className="font-sans-semibold text-xs"
                      style={{ color: badge.color }}
                    >
                      {badge.label}
                    </Text>
                  </View>
                </View>

                <View className="mb-5 flex-row items-center gap-3">
                  {usuario?.avatar_url ? (
                    <Image
                      source={{ uri: usuario.avatar_url }}
                      style={{ width: 56, height: 56, borderRadius: 14 }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                      priority="high"
                      transition={120}
                    />
                  ) : (
                    <View className="h-14 w-14 items-center justify-center rounded-2xl bg-brand-chartreuse">
                      <Text className="font-sans-bold text-2xl text-black">
                        {initial}
                      </Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="font-sans-bold text-lg text-white">
                      {nombreCompleto || "Jugador"}
                    </Text>
                    <Text className="font-sans-medium text-sm text-brand-chartreuse">
                      {usuario?.categoria_padel || "Sin categoría"} ·{" "}
                      {sexoLabel(usuario?.sexo)}
                    </Text>
                    <Text className="mt-0.5 font-sans text-xs text-brand-muted">
                      Nº {licencia.nro_licencia}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-end gap-4">
                  <View className="rounded-xl bg-white p-2">
                    <QRCode
                      value={qrPayload || licencia.nro_licencia}
                      size={92}
                      backgroundColor="#FFFFFF"
                      color="#000000"
                    />
                  </View>
                  <View className="flex-1 gap-3">
                    <View>
                      <Text className="font-sans text-[10px] tracking-widest text-brand-muted">
                        VIGENCIA DESDE
                      </Text>
                      <Text className="font-sans-semibold text-base text-white">
                        {formatMonthYear(licencia.fecha_emision)}
                      </Text>
                    </View>
                    <View>
                      <Text className="font-sans text-[10px] tracking-widest text-brand-muted">
                        VIGENCIA HASTA
                      </Text>
                      <Text className="font-sans-semibold text-base text-white">
                        {formatMonthYear(licencia.fecha_vencimiento)}
                      </Text>
                    </View>
                    <View className="flex-row items-center gap-1.5">
                      <MaterialCommunityIcons
                        name="shield-check"
                        size={16}
                        color="#CBFE01"
                      />
                      <Text className="font-sans-medium text-xs text-brand-chartreuse">
                        Validada FAP
                      </Text>
                    </View>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {pagoPendiente ? (
              <View className="gap-3 rounded-card border border-amber-500/30 bg-amber-500/10 p-4">
                <Text className="font-sans-semibold text-base text-white">
                  Pago pendiente
                </Text>
                <Text className="font-sans text-sm text-brand-muted">
                  Tu solicitud está en revisión. Para continuar, aboná el arancel
                  anual de {formatCurrencyArs(precio)}.
                </Text>
                <Button
                  label={`Pagar ${formatCurrencyArs(precio)}`}
                  loading={pagando}
                  onPress={() => void onPagarLicencia()}
                />
              </View>
            ) : estadoPago === "pagado" &&
              (licencia.estado || "").toLowerCase() === "pendiente" ? (
              <View className="rounded-card border border-brand-chartreuse/30 bg-brand-chartreuse/10 px-4 py-3">
                <Text className="font-sans-semibold text-sm text-brand-chartreuse">
                  Pago recibido
                </Text>
                <Text className="mt-1 font-sans text-sm text-brand-muted">
                  Esperá la aprobación de la federación. Te avisamos por
                  notificaciones cuando activen tu carnet.
                </Text>
              </View>
            ) : null}

            <View className="flex-row gap-3">
              <View className="flex-1">
                <Button
                  label="Renovar"
                  onPress={() =>
                    setError(
                      "La renovación se gestiona con tu federación provincial cuando la licencia esté por vencer.",
                    )
                  }
                />
              </View>
              <Pressable
                onPress={() => void onShare()}
                className="h-14 w-14 items-center justify-center rounded-card border border-brand-border bg-brand-surface active:opacity-80"
              >
                <FontAwesome name="share-alt" size={18} color="#FFFFFF" />
              </Pressable>
            </View>

            {error ? (
              <Text className="font-sans text-sm text-amber-400">{error}</Text>
            ) : null}
            {mensaje ? (
              <Text className="font-sans text-sm text-brand-chartreuse">
                {mensaje}
              </Text>
            ) : null}

            <View className="flex-row gap-3 rounded-card border border-brand-border bg-brand-surface px-4 py-3">
              <FontAwesome name="info-circle" size={16} color="#3B82F6" />
              <Text className="flex-1 font-sans text-sm text-brand-muted">
                Presentá este QR en el club para validar tu identidad y licencia.
                
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
