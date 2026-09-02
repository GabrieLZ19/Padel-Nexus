import FontAwesome from "@expo/vector-icons/FontAwesome";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Skeleton } from "@/src/components/ui/Skeleton";
import { duracionMinutos, proximosDiasSelector } from "@/src/lib/dateUtils";
import { formatCurrencyArs, formatTime } from "@/src/lib/format";
import { hrefReservaCheckout } from "@/src/lib/navigation";
import { ClubesService } from "@/src/services/clubes";
import { ReservasService } from "@/src/services/reservas";
import type { Club } from "@/src/types/club.types";
import type { SlotDisponible } from "@/src/types/reserva.types";

const AMENITIES = [
  { icon: "car" as const, label: "Estac." },
  { icon: "glass" as const, label: "Bar" },
  { icon: "user" as const, label: "Vestuarios" },
  { icon: "wifi" as const, label: "WiFi" },
];

function metaCancha(slot: SlotDisponible): string {
  const partes: string[] = [];
  if (slot.tipo_suelo) partes.push(slot.tipo_suelo);
  if (slot.techada) partes.push("Techada");
  return partes.join(" · ");
}

export default function ReservarClubScreen() {
  const { id: clubId } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dias = useMemo(() => proximosDiasSelector(7), []);

  const [club, setClub] = useState<Club | null>(null);
  const [fecha, setFecha] = useState(dias[0]?.fecha ?? "");
  const [slots, setSlots] = useState<SlotDisponible[]>([]);
  const [slotSeleccionado, setSlotSeleccionado] = useState<SlotDisponible | null>(
    null,
  );
  const [favorito, setFavorito] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSlots = useCallback(async () => {
    if (!clubId || !fecha) return;
    setLoading(true);
    setError(null);
    try {
      const data = await ReservasService.getDisponibles(clubId, fecha);
      setSlots(data);
      setSlotSeleccionado((prev) => {
        if (
          prev &&
          data.some((s) => s.turno_id === prev.turno_id && s.disponible)
        ) {
          return prev;
        }
        return data.find((s) => s.disponible) ?? null;
      });
    } catch (err: unknown) {
      setSlots([]);
      setSlotSeleccionado(null);
      setError(
        err instanceof Error ? err.message : "No se pudo cargar disponibilidad.",
      );
    } finally {
      setLoading(false);
    }
  }, [clubId, fecha]);

  useEffect(() => {
    if (!clubId) return;
    void ClubesService.getById(clubId)
      .then((data) => setClub(data))
      .catch(() => undefined);
  }, [clubId]);

  useEffect(() => {
    void loadSlots();
  }, [loadSlots]);

  const slotsPorCancha = useMemo(() => {
    const map = new Map<
      string,
      { canchaId: string; nombre: string; meta: string; turnos: SlotDisponible[] }
    >();

    for (const slot of slots) {
      const key = slot.cancha_id || slot.cancha_nombre;
      const existing = map.get(key);
      if (existing) {
        existing.turnos.push(slot);
      } else {
        map.set(key, {
          canchaId: slot.cancha_id,
          nombre: slot.cancha_nombre || "Cancha",
          meta: metaCancha(slot),
          turnos: [slot],
        });
      }
    }

    return Array.from(map.values()).map((group) => ({
      ...group,
      turnos: [...group.turnos].sort((a, b) =>
        a.hora_inicio.localeCompare(b.hora_inicio),
      ),
    }));
  }, [slots]);

  const duracion = slotSeleccionado
    ? duracionMinutos(slotSeleccionado.hora_inicio, slotSeleccionado.hora_fin)
    : null;

  function onReservar() {
    if (!clubId || !slotSeleccionado || !fecha) return;
    router.push(
      hrefReservaCheckout({
        turnoId: slotSeleccionado.turno_id,
        fecha,
        clubId,
      }),
    );
  }

  const direccion = [club?.direccion, club?.localidad]
    .filter(Boolean)
    .join(" · ");

  return (
    <View className="flex-1 bg-brand-black">
      <LinearGradient
        colors={["#1A2A10", "#000000"]}
        className="px-6 pb-4"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="h-11 w-11 items-center justify-center rounded-full border border-brand-border bg-brand-surface/60"
          >
            <FontAwesome name="chevron-left" size={16} color="#FFFFFF" />
          </Pressable>
          <Pressable
            onPress={() => setFavorito((v) => !v)}
            className="h-11 w-11 items-center justify-center rounded-full border border-brand-border bg-brand-surface/60"
          >
            <FontAwesome
              name={favorito ? "heart" : "heart-o"}
              size={18}
              color={favorito ? "#CBFE01" : "#FFFFFF"}
            />
          </Pressable>
        </View>
        <Text className="font-sans-bold text-2xl text-white">
          {club?.nombre ?? "Club"}
        </Text>
        <View className="mt-2 flex-row items-center gap-2">
          <FontAwesome name="star" size={14} color="#CBFE01" />
          <Text className="font-sans-semibold text-sm text-white">4,8</Text>
          <Text className="font-sans text-sm text-brand-muted">
            {direccion || `${club?.localidad ?? ""}, ${club?.provincia ?? ""}`}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingBottom: insets.bottom + 120,
          gap: 20,
        }}
      >
        <View className="flex-row justify-between gap-2">
          {AMENITIES.map((item) => (
            <View
              key={item.label}
              className="flex-1 items-center gap-1.5 rounded-card border border-brand-border bg-brand-surface px-2 py-3"
            >
              <FontAwesome name={item.icon} size={16} color="#CBFE01" />
              <Text className="font-sans text-xs text-brand-muted">
                {item.label}
              </Text>
            </View>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {dias.map((dia) => {
            const active = dia.fecha === fecha;
            return (
              <Pressable
                key={dia.fecha}
                onPress={() => setFecha(dia.fecha)}
                className={`min-w-[64px] items-center rounded-card border px-3 py-3 ${
                  active
                    ? "border-brand-chartreuse bg-brand-chartreuse"
                    : "border-brand-border bg-brand-surface"
                }`}
              >
                <Text
                  className={`font-sans-semibold text-sm ${
                    active ? "text-black" : "text-white"
                  }`}
                >
                  {dia.diaCorto}
                </Text>
                <Text
                  className={`font-sans-bold text-lg ${
                    active ? "text-black" : "text-white"
                  }`}
                >
                  {dia.numero}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View className="gap-4">
          <Text className="font-sans-bold text-base text-white">
            Horarios disponibles
          </Text>

          {loading ? (
            <View className="gap-3">
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </View>
          ) : error ? (
            <View className="rounded-card border border-brand-border bg-brand-surface p-4">
              <Text className="font-sans text-sm text-red-400">{error}</Text>
            </View>
          ) : slotsPorCancha.length === 0 ? (
            <Text className="font-sans text-sm text-brand-muted">
              No hay turnos para este día.
            </Text>
          ) : (
            slotsPorCancha.map((grupo) => (
              <View
                key={grupo.canchaId || grupo.nombre}
                className="gap-3 rounded-card border border-brand-border bg-brand-surface p-4"
              >
                <View className="flex-row items-start gap-2">
                  <FontAwesome name="map-marker" size={14} color="#CBFE01" />
                  <View className="flex-1">
                    <Text className="font-sans-bold text-base text-white">
                      {grupo.nombre}
                    </Text>
                    {grupo.meta ? (
                      <Text className="mt-0.5 font-sans text-xs text-brand-muted">
                        {grupo.meta}
                      </Text>
                    ) : null}
                  </View>
                </View>

                <View className="flex-row flex-wrap gap-2">
                  {grupo.turnos.map((slot) => {
                    const active =
                      slotSeleccionado?.turno_id === slot.turno_id;
                    const disabled = !slot.disponible;
                    return (
                      <Pressable
                        key={slot.turno_id}
                        disabled={disabled}
                        onPress={() => setSlotSeleccionado(slot)}
                        className={`min-w-[30%] flex-1 items-center rounded-xl border px-3 py-3 ${
                          disabled
                            ? "border-brand-border/40 bg-brand-black/30 opacity-40"
                            : active
                              ? "border-brand-chartreuse bg-brand-chartreuse"
                              : "border-brand-border bg-brand-elevated"
                        }`}
                      >
                        <Text
                          className={`font-sans-bold text-base ${
                            disabled
                              ? "text-brand-muted"
                              : active
                                ? "text-black"
                                : "text-white"
                          }`}
                        >
                          {formatTime(slot.hora_inicio)}
                        </Text>
                        <Text
                          className={`mt-0.5 font-sans text-[11px] ${
                            active && !disabled
                              ? "text-black/70"
                              : "text-brand-muted"
                          }`}
                        >
                          {formatCurrencyArs(slot.precio)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {slotSeleccionado ? (
        <View
          className="absolute bottom-0 left-0 right-0 flex-row items-center justify-between border-t border-brand-border bg-brand-black px-6 py-4"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <View className="flex-1 gap-0.5 pr-4">
            <Text className="font-sans text-sm text-brand-muted" numberOfLines={1}>
              {slotSeleccionado.cancha_nombre} ·{" "}
              {dias.find((d) => d.fecha === fecha)?.diaCorto ?? "Hoy"}{" "}
              {formatTime(slotSeleccionado.hora_inicio)}
              {duracion ? ` · ${duracion} min` : ""}
            </Text>
            <Text className="font-sans-bold text-2xl text-white">
              {formatCurrencyArs(slotSeleccionado.precio)}
            </Text>
          </View>
          <Pressable
            onPress={onReservar}
            className="flex-row items-center gap-2 rounded-full bg-brand-chartreuse px-6 py-4 active:opacity-90"
          >
            <Text className="font-sans-bold text-base text-black">Reservar</Text>
            <FontAwesome name="arrow-right" size={14} color="#000000" />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
