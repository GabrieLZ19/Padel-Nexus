import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Pressable, Text, View } from "react-native";

import { Button } from "@/src/components/ui/Button";
import {
  esTorneoInscripcionAbierta,
  etiquetaEstadoTorneoCard,
  colorEstadoTorneoCard,
  estadoTorneoLabel,
  formatCurrencyArs,
  formatDateShort,
  formatTime,
} from "@/src/lib/format";
import type { Torneo } from "@/src/types/torneo.types";

interface TorneoCardProps {
  torneo: Torneo;
  variant?: "list" | "featured";
  onPress?: () => void;
  onInscribirmePress?: () => void;
}

function categoriaLabel(torneo: Torneo): string {
  const parts = [torneo.nivel, torneo.categoria].filter(Boolean);
  return parts.join(" ") || "Torneo";
}

function isInscripcionAbierta(estado: string): boolean {
  return esTorneoInscripcionAbierta(estado);
}

export function TorneoCard({
  torneo,
  variant = "list",
  onPress,
  onInscribirmePress,
}: TorneoCardProps) {
  const banner = torneo.banners?.[0];
  const club = torneo.clubes?.nombre;
  const localidad = torneo.clubes?.localidad || torneo.clubes?.provincia;
  const abierto = isInscripcionAbierta(torneo.estado);
  const hora = formatTime(torneo.hora_inicio_jornada);

  if (variant === "featured") {
    return (
      <Pressable
        onPress={onPress}
        className="overflow-hidden rounded-card border border-brand-border bg-brand-surface active:opacity-95"
      >
        <View className="h-36 overflow-hidden">
          {banner ? (
            <View className="relative h-full w-full">
              <Image
                source={{ uri: banner }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
              />
              <View className="absolute left-4 top-4 rounded-full bg-brand-chartreuse px-3 py-1">
                <Text className="font-sans-bold text-xs text-black">
                  {categoriaLabel(torneo)}
                </Text>
              </View>
              <View className="absolute right-4 top-4">
                <FontAwesome name="trophy" size={22} color="#CBFE0188" />
              </View>
            </View>
          ) : (
            <LinearGradient
              colors={["#1A1A1A", "#2A3A00", "#CBFE0122"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, padding: 16, justifyContent: "space-between" }}
            >
              <View className="flex-row items-start justify-between">
                <View className="rounded-full bg-brand-chartreuse px-3 py-1">
                  <Text className="font-sans-bold text-xs text-black">
                    {categoriaLabel(torneo)}
                  </Text>
                </View>
                <FontAwesome name="trophy" size={22} color="#CBFE0188" />
              </View>
            </LinearGradient>
          )}
        </View>

        <View className="gap-3 p-4">
          <Text className="font-sans-bold text-xl text-white" numberOfLines={2}>
            {torneo.nombre}
          </Text>

          <View className="gap-2">
            {club ? (
              <View className="flex-row items-center gap-2">
                <FontAwesome name="map-marker" size={13} color="#8A8A8A" />
                <Text className="font-sans text-sm text-brand-muted" numberOfLines={1}>
                  {[club, localidad].filter(Boolean).join(" · ")}
                </Text>
              </View>
            ) : null}
            <View className="flex-row items-center gap-2">
              <FontAwesome name="calendar" size={13} color="#8A8A8A" />
              <Text className="font-sans text-sm text-brand-muted">
                {formatDateShort(torneo.fecha)}
                {hora ? ` · ${hora}` : ""}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-2">
              <View
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: colorEstadoTorneoCard(torneo.estado) }}
              />
              <Text className="font-sans-semibold text-sm text-brand-chartreuse">
                {etiquetaEstadoTorneoCard(torneo.estado)}
              </Text>
            </View>
            <Text className="font-sans-semibold text-sm text-white">
              {formatCurrencyArs(torneo.precio_inscripcion)}
            </Text>
          </View>

          {abierto ? (
            <Button
              label="Inscribirme"
              onPress={onInscribirmePress || onPress}
            />
          ) : null}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      className="overflow-hidden rounded-card border border-brand-border bg-brand-surface active:opacity-90"
    >
      {banner ? (
        <Image
          source={{ uri: banner }}
          style={{ width: "100%", height: 120 }}
          contentFit="cover"
        />
      ) : (
        <View className="h-[120px] items-center justify-center bg-brand-elevated">
          <FontAwesome name="trophy" size={28} color="#CBFE01" />
        </View>
      )}

      <View className="gap-2 p-4">
        <View className="flex-row items-center justify-between gap-2">
          <View className="rounded-full bg-brand-chartreuse/15 px-2.5 py-1">
            <Text className="font-sans-semibold text-[10px] uppercase tracking-wide text-brand-chartreuse">
              {estadoTorneoLabel(torneo.estado)}
            </Text>
          </View>
          {torneo.nivel ? (
            <Text className="font-sans-medium text-xs text-brand-muted">
              {torneo.nivel}
            </Text>
          ) : null}
        </View>

        <Text className="font-sans-bold text-lg text-white" numberOfLines={2}>
          {torneo.nombre}
        </Text>

        <View className="flex-row flex-wrap items-center gap-x-3 gap-y-1">
          <View className="flex-row items-center gap-1.5">
            <FontAwesome name="calendar" size={12} color="#8A8A8A" />
            <Text className="font-sans text-sm text-brand-muted">
              {formatDateShort(torneo.fecha)}
            </Text>
          </View>
          {club ? (
            <View className="flex-row items-center gap-1.5">
              <FontAwesome name="map-marker" size={12} color="#8A8A8A" />
              <Text className="font-sans text-sm text-brand-muted" numberOfLines={1}>
                {[club, localidad].filter(Boolean).join(" · ")}
              </Text>
            </View>
          ) : null}
        </View>

        <Text className="font-sans-semibold text-sm text-brand-chartreuse">
          {formatCurrencyArs(torneo.precio_inscripcion)}
        </Text>
      </View>
    </Pressable>
  );
}
