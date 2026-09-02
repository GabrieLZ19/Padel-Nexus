import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

import {
  etiquetaEquipo,
  ganoSet,
  listarSetsPartido,
  setsGanados,
  tieneAlgunSet,
  type VistaDenominacion,
} from "@/src/lib/partidoUtils";
import { hrefTorneoResultado } from "@/src/lib/navigation";
import type { PartidoTorneo } from "@/src/types/competencia.types";

interface ZonaMatchCardProps {
  partido: PartidoTorneo;
  vista: VistaDenominacion;
  torneoId: string;
}

function formatSetValue(value: number | null): string {
  return value == null ? "—" : String(value);
}

function SetsGrid({
  partido,
  vista,
}: {
  partido: PartidoTorneo;
  vista: VistaDenominacion;
}) {
  const sets = listarSetsPartido(partido);
  const infoA = etiquetaEquipo(partido, "a", vista);
  const infoB = etiquetaEquipo(partido, "b", vista);
  const ganoEquipoA =
    Boolean(partido.ganador) && partido.ganador === partido.equipo_a_id;
  const ganoEquipoB =
    Boolean(partido.ganador) && partido.ganador === partido.equipo_b_id;

  return (
    <View className="border-t border-brand-border bg-brand-black/30 px-3 py-3">
      <View className="mb-2 flex-row items-center">
        <Text className="flex-1 font-sans-semibold text-[10px] tracking-[1px] text-brand-muted">
          SETS
        </Text>
        {sets.map((set) => (
          <Text
            key={set.label}
            className="w-10 text-center font-sans-semibold text-[10px] text-brand-muted"
          >
            {set.label}
          </Text>
        ))}
      </View>

      <View className="mb-2 flex-row items-center">
        <View className="flex-1 flex-row items-center gap-1.5 pr-2">
          {ganoEquipoA ? (
            <FontAwesome name="trophy" size={10} color="#CBFE01" />
          ) : (
            <Text className="w-2.5 text-brand-muted"> </Text>
          )}
          <Text
            className={`flex-1 font-sans-semibold text-xs ${
              ganoEquipoA ? "text-brand-chartreuse" : "text-white"
            }`}
            numberOfLines={2}
          >
            {infoA.titulo}
          </Text>
        </View>
        {sets.map((set) => {
          const won = ganoSet(set, "a");
          return (
            <Text
              key={`a-${set.label}`}
              className={`w-10 text-center font-sans-bold text-sm ${
                won ? "text-brand-chartreuse" : "text-white"
              }`}
            >
              {formatSetValue(set.a)}
            </Text>
          );
        })}
      </View>

      <View className="flex-row items-center">
        <View className="flex-1 flex-row items-center gap-1.5 pr-2">
          {ganoEquipoB ? (
            <FontAwesome name="trophy" size={10} color="#CBFE01" />
          ) : (
            <Text className="w-2.5 text-brand-muted"> </Text>
          )}
          <Text
            className={`flex-1 font-sans-semibold text-xs ${
              ganoEquipoB ? "text-brand-chartreuse" : "text-white"
            }`}
            numberOfLines={2}
          >
            {infoB.titulo}
          </Text>
        </View>
        {sets.map((set) => {
          const won = ganoSet(set, "b");
          return (
            <Text
              key={`b-${set.label}`}
              className={`w-10 text-center font-sans-bold text-sm ${
                won ? "text-brand-chartreuse" : "text-white"
              }`}
            >
              {formatSetValue(set.b)}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

function TeamBlock({
  partido,
  lado,
  vista,
}: {
  partido: PartidoTorneo;
  lado: "a" | "b";
  vista: VistaDenominacion;
}) {
  const info = etiquetaEquipo(partido, lado, vista);
  const wins = setsGanados(partido, lado);
  const otherWins = setsGanados(partido, lado === "a" ? "b" : "a");
  const isWinner =
    partido.ganador &&
    ((lado === "a" && partido.ganador === partido.equipo_a_id) ||
      (lado === "b" && partido.ganador === partido.equipo_b_id));
  const leading = wins > otherWins;

  return (
    <View className="flex-row items-center gap-3 px-3 py-3">
      <View className="min-w-0 flex-1 gap-1">
        <View className="flex-row items-center gap-2">
          <Text
            className={`font-sans-bold text-sm ${
              isWinner ? "text-brand-chartreuse" : "text-white"
            }`}
            numberOfLines={1}
          >
            {info.titulo}
          </Text>
          {info.seed ? (
            <Text className="font-sans-semibold text-[10px] text-brand-muted">
              [{info.seed}]
            </Text>
          ) : null}
        </View>
        <Text className="font-sans text-xs text-brand-chartreuse" numberOfLines={2}>
          {info.detalle}
        </Text>
      </View>
      <View
        className={`h-8 min-w-8 items-center justify-center rounded-lg px-2 ${
          leading || isWinner ? "bg-brand-chartreuse" : "bg-brand-elevated"
        }`}
      >
        <Text
          className={`font-sans-bold text-sm ${
            leading || isWinner ? "text-black" : "text-white"
          }`}
        >
          {wins}
        </Text>
      </View>
    </View>
  );
}

export function ZonaMatchCard({ partido, vista, torneoId }: ZonaMatchCardProps) {
  const router = useRouter();
  const enJuego = partido.estado_partido === "En curso";
  const finalizado = Boolean(partido.ganador);
  const haySets = tieneAlgunSet(partido);

  return (
    <Pressable
      onPress={() => {
        if (finalizado || haySets) {
          router.push(hrefTorneoResultado(torneoId, partido.id));
        }
      }}
      className="overflow-hidden rounded-card border border-brand-border bg-brand-surface active:opacity-90"
    >
      <View className="flex-row items-center justify-between border-b border-brand-border bg-brand-elevated px-3 py-2">
        <Text className="font-sans-semibold text-[10px] tracking-[1px] text-brand-muted">
          PARTIDO {partido.orden}
        </Text>
        {enJuego ? (
          <View className="flex-row items-center gap-1 rounded-full bg-red-950/60 px-2 py-0.5">
            <View className="h-1.5 w-1.5 rounded-full bg-red-500" />
            <Text className="font-sans-semibold text-[10px] text-red-400">
              EN JUEGO
            </Text>
          </View>
        ) : finalizado ? (
          <Text className="font-sans-semibold text-[10px] text-brand-chartreuse">
            FINAL
          </Text>
        ) : (
          <Text className="font-sans-semibold text-[10px] text-brand-muted">
            PENDIENTE
          </Text>
        )}
      </View>

      <TeamBlock partido={partido} lado="a" vista={vista} />
      <View className="h-px bg-brand-border" />
      <TeamBlock partido={partido} lado="b" vista={vista} />

      <SetsGrid partido={partido} vista={vista} />
    </Pressable>
  );
}
