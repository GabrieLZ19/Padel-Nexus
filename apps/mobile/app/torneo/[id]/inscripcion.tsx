import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { Button } from "@/src/components/ui/Button";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import {
  formatCurrencyArs,
  formatDateShort,
} from "@/src/lib/format";
import { hrefTorneoDetalle } from "@/src/lib/navigation";
import { InscripcionesService } from "@/src/services/inscripciones";
import { TorneosService } from "@/src/services/torneos";
import { useAuthStore } from "@/src/stores/authStore";
import type { ElegibilidadInscripcion } from "@/src/types/competencia.types";
import type { Torneo } from "@/src/types/torneo.types";

type ModoPago = "total" | "parcial";

export default function InscripcionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);

  const [torneo, setTorneo] = useState<Torneo | null>(null);
  const [emailCompanero, setEmailCompanero] = useState("");
  const [elegibilidad, setElegibilidad] =
    useState<ElegibilidadInscripcion | null>(null);
  const [modoPago, setModoPago] = useState<ModoPago>("total");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const data = await TorneosService.getById(id);
    setTorneo(data);
    const eleg = await InscripcionesService.chequearElegibilidad({
      torneo_id: id,
    });
    setElegibilidad(eleg);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      void load()
        .catch((err: unknown) => {
          setError(
            err instanceof Error
              ? err.message
              : "No se pudo cargar la inscripción.",
          );
        })
        .finally(() => setLoading(false));
    }, [load]),
  );

  const montoTotal = torneo?.precio_inscripcion || 0;
  const monto = modoPago === "total" ? montoTotal : Math.round(montoTotal * 0.5);

  const nombreYo = useMemo(() => {
    return (
      [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" ") ||
      elegibilidad?.jugador1.nombre ||
      "Vos"
    );
  }, [usuario, elegibilidad]);

  async function onValidarCompanero() {
    if (!id || !emailCompanero.trim()) {
      setError("Ingresá el email de tu compañero.");
      return;
    }
    setChecking(true);
    setError(null);
    try {
      const eleg = await InscripcionesService.chequearElegibilidad({
        torneo_id: id,
        usuario2_email: emailCompanero.trim(),
      });
      setElegibilidad(eleg);
      if (!eleg.ok) {
        setError("Hay validaciones pendientes en la dupla.");
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "No se pudo validar al compañero.",
      );
    } finally {
      setChecking(false);
    }
  }

  async function onConfirmar() {
    if (!id || !usuario?.id || !torneo) return;
    if (!emailCompanero.trim() && !elegibilidad?.jugador2) {
      setError("Indicá el email de tu compañero.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);
    try {
      await InscripcionesService.inscribir({
        torneo_id: id,
        usuario_id: usuario.id,
        usuario2_email: emailCompanero.trim() || elegibilidad?.jugador2?.email,
        jugador1_nombre: nombreYo,
        jugador2_nombre:
          elegibilidad?.jugador2?.nombre || emailCompanero.trim(),
        monto,
      });
      setSuccess("Inscripción enviada. Revisá el estado de pago en Mis torneos.");
      setTimeout(() => router.replace(hrefTorneoDetalle(id)), 900);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "No se pudo confirmar la inscripción.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading && !torneo) {
    return (
      <View className="flex-1 items-center justify-center bg-brand-black">
        <ActivityIndicator color="#CBFE01" />
      </View>
    );
  }

  const checks = [
    ...(elegibilidad?.checks_j1 || []),
    ...(elegibilidad?.checks_j2 || []),
  ];

  return (
    <View className="flex-1 bg-brand-black px-6">
      <ScreenHeader title="Inscripción" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ gap: 18, paddingBottom: insets.bottom + 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-center gap-3 rounded-card border border-brand-border bg-brand-surface p-4">
          <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand-chartreuse/10">
            <FontAwesome name="trophy" size={18} color="#CBFE01" />
          </View>
          <View className="flex-1">
            <Text className="font-sans-bold text-base text-white">
              {torneo?.nombre}
            </Text>
            <Text className="font-sans text-sm text-brand-muted">
              {[torneo?.nivel, torneo?.categoria].filter(Boolean).join(" ")} ·{" "}
              {formatDateShort(torneo?.fecha)}
            </Text>
          </View>
        </View>

        <View className="gap-3">
          <Text className="font-sans-semibold text-xs tracking-[1.5px] text-brand-muted">
            TU DUPLA
          </Text>

          <View className="flex-row items-center gap-3 rounded-card border border-brand-border bg-brand-surface p-4">
            <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-chartreuse">
              <Text className="font-sans-bold text-lg text-black">
                {(usuario?.nombre || "Y").charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-sans-bold text-base text-white">
                {nombreYo}
              </Text>
              <Text className="font-sans text-sm text-brand-muted">
                {usuario?.categoria_padel || "—"} · Vos
              </Text>
            </View>
          </View>

          <View className="rounded-card border border-brand-border bg-brand-surface p-4">
            <View className="mb-3 flex-row items-center gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-full bg-brand-chartreuse">
                <Text className="font-sans-bold text-lg text-black">
                  {(elegibilidad?.jugador2?.nombre || "C").charAt(0).toUpperCase()}
                </Text>
              </View>
              <View className="flex-1">
                <Text className="font-sans-bold text-base text-white">
                  {elegibilidad?.jugador2?.nombre || "Compañero"}
                </Text>
                <Text className="font-sans text-sm text-brand-muted">
                  {elegibilidad?.jugador2?.categoria_padel || "—"} · Compañero
                </Text>
              </View>
            </View>
            <TextInput
              value={emailCompanero}
              onChangeText={setEmailCompanero}
              placeholder="Email del compañero"
              placeholderTextColor="#8A8A8A"
              autoCapitalize="none"
              keyboardType="email-address"
              className="h-12 rounded-field border border-brand-border bg-brand-elevated px-4 font-sans text-base text-white"
            />
            <Pressable
              onPress={() => void onValidarCompanero()}
              className="mt-3 self-start"
            >
              <Text className="font-sans-semibold text-sm text-brand-chartreuse">
                {checking ? "Validando..." : "Validar compañero"}
              </Text>
            </Pressable>
          </View>
        </View>

        <View className="gap-3">
          <Text className="font-sans-semibold text-xs tracking-[1.5px] text-brand-muted">
            VALIDACIÓN DE LICENCIA
          </Text>
          <View className="overflow-hidden rounded-card border border-brand-border bg-brand-surface">
            {(checks.length > 0 ? checks : [
              {
                code: "carnet",
                label: nombreYo,
                passed: Boolean(elegibilidad?.ok),
                message: "Sin datos de licencia",
              },
            ]).map((check, index) => (
              <View
                key={`${check.code}-${index}`}
                className={`flex-row items-center gap-3 px-4 py-3.5 ${
                  index === 0 ? "" : "border-t border-brand-border"
                }`}
              >
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={18}
                  color="#10B981"
                />
                <View className="flex-1">
                  <Text className="font-sans-medium text-sm text-white">
                    {check.label}
                  </Text>
                  {check.message ? (
                    <Text className="font-sans text-xs text-brand-muted">
                      {check.message}
                    </Text>
                  ) : null}
                </View>
                <View
                  className={`rounded-full px-2.5 py-1 ${
                    check.passed ? "bg-emerald-500/15" : "bg-amber-500/15"
                  }`}
                >
                  <Text
                    className={`font-sans-semibold text-xs ${
                      check.passed ? "text-emerald-400" : "text-amber-400"
                    }`}
                  >
                    {check.passed ? "Válida" : "Revisar"}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View className="gap-3">
          <Text className="font-sans-semibold text-xs tracking-[1.5px] text-brand-muted">
            PAGO
          </Text>
          <View className="flex-row gap-2 rounded-full bg-brand-elevated p-1">
            {(
              [
                { id: "total" as const, label: "Pago total" },
                { id: "parcial" as const, label: "Parcial (50%)" },
              ] as const
            ).map((option) => {
              const active = modoPago === option.id;
              return (
                <Pressable
                  key={option.id}
                  onPress={() => setModoPago(option.id)}
                  className={`flex-1 items-center rounded-full py-2.5 ${
                    active ? "bg-brand-chartreuse" : ""
                  }`}
                >
                  <Text
                    className={`font-sans-semibold text-sm ${
                      active ? "text-black" : "text-brand-muted"
                    }`}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="flex-row items-center gap-3 rounded-card border border-brand-chartreuse bg-brand-surface p-4">
            <FontAwesome name="credit-card" size={18} color="#CBFE01" />
            <View className="flex-1">
              <Text className="font-sans-semibold text-sm text-white">
                Mercado Pago
              </Text>
              <Text className="font-sans text-xs text-brand-muted">
                Confirmación de pago según el club / organización
              </Text>
            </View>
            <FontAwesome name="check-circle" size={18} color="#CBFE01" />
          </View>
        </View>

        {error ? (
          <Text className="font-sans text-sm text-red-400">{error}</Text>
        ) : null}
        {success ? (
          <Text className="font-sans text-sm text-brand-chartreuse">{success}</Text>
        ) : null}
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between border-t border-brand-border bg-brand-black px-6 pt-4"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View>
          <Text className="font-sans text-xs text-brand-muted">Total dupla</Text>
          <Text className="font-sans-bold text-2xl text-white">
            {formatCurrencyArs(monto)}
          </Text>
        </View>
        <View className="w-[52%]">
          <Button
            label="Confirmar"
            loading={submitting}
            trailingIcon="arrow-right"
            onPress={() => void onConfirmar()}
          />
        </View>
      </View>
    </View>
  );
}
