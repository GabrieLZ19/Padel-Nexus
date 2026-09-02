import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Pressable, Text, View } from "react-native";

import {
  etiquetaEquipo,
  setsGanados,
  type VistaDenominacion,
} from "@/src/lib/partidoUtils";
import type { PartidoTorneo } from "@/src/types/competencia.types";

interface BracketMatchCardProps {
  partido: PartidoTorneo;
  vista?: VistaDenominacion;
  expanded?: boolean;
  compact?: boolean;
  onPress?: () => void;
  showEnJuego?: boolean;
}

function TeamRow({
  partido,
  lado,
  vista,
  expanded,
  compact,
}: {
  partido: PartidoTorneo;
  lado: "a" | "b";
  vista: VistaDenominacion;
  expanded: boolean;
  compact?: boolean;
}) {
  const info = etiquetaEquipo(partido, lado, vista);
  const wins = setsGanados(partido, lado);
  const otherWins = setsGanados(partido, lado === "a" ? "b" : "a");
  const leading = wins > otherWins && (wins > 0 || otherWins > 0);
  const isWinner =
    partido.ganador &&
    ((lado === "a" && partido.ganador === partido.equipo_a_id) ||
      (lado === "b" && partido.ganador === partido.equipo_b_id));

  const showPlayers =
    expanded ||
    vista === "club" ||
    (info.detalle !== "Tocá para ver los jugadores" && info.detalle.length > 0);

  return (
    <View
      className={`flex-row items-center gap-2 ${
        compact ? "px-2.5 py-2" : "px-3 py-2.5"
      }`}
    >
      <View className="min-w-0 flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text
            className={`font-sans-bold ${compact ? "text-xs" : "text-sm"} ${
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
        <Text
          className={`mt-0.5 font-sans text-[10px] ${
            showPlayers && info.detalle !== "Tocá para ver los jugadores"
              ? "text-brand-chartreuse"
              : "text-brand-muted"
          }`}
          numberOfLines={expanded ? 2 : 1}
        >
          {showPlayers ? info.detalle : "Tocá para ver los jugadores"}
        </Text>
      </View>
      <View
        className={`h-7 min-w-7 items-center justify-center rounded-md px-1.5 ${
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

export function BracketMatchCard({
  partido,
  vista = "nacional",
  expanded = false,
  compact = false,
  onPress,
  showEnJuego = false,
}: BracketMatchCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`overflow-hidden rounded-xl border border-brand-border bg-brand-surface active:opacity-90 ${
        compact ? "" : "rounded-card"
      }`}
    >
      <TeamRow
        partido={partido}
        lado="a"
        vista={vista}
        expanded={expanded}
        compact={compact}
      />
      <View className="h-px bg-brand-border" />
      <TeamRow
        partido={partido}
        lado="b"
        vista={vista}
        expanded={expanded}
        compact={compact}
      />
      {showEnJuego ? (
        <View className="border-t border-brand-border px-2 py-1.5">
          <View className="flex-row items-center justify-center gap-2 rounded-full border border-brand-chartreuse py-1.5">
            <FontAwesome name="trophy" size={11} color="#CBFE01" />
            <Text className="font-sans-semibold text-xs text-brand-chartreuse">
              En juego
            </Text>
          </View>
        </View>
      ) : null}
    </Pressable>
  );
}
