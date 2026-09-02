import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import Svg, { Path } from "react-native-svg";

import { BracketMatchCard } from "@/src/components/torneos/BracketMatchCard";
import {
  agruparPartidosPorRonda,
  ordenarRondasCuadro,
  setsGanados,
  type VistaDenominacion,
} from "@/src/lib/partidoUtils";
import { hrefTorneoResultado } from "@/src/lib/navigation";
import type { PartidoTorneo } from "@/src/types/competencia.types";

const CARD_W = 196;
const CARD_H = 108;
const COL_GAP = 56;
const ROW_GAP = 28;

function labelRonda(ronda: string): string {
  const r = ronda.toLowerCase();
  if (r.includes("32av")) return "32avos";
  if (r.includes("dieciseis") || r.includes("16av")) return "16avos";
  if (r.includes("octav")) return "Octavos";
  if (r.includes("cuart")) return "Cuartos";
  if (r.includes("semi")) return "Semis";
  if (r.includes("final")) return "Final";
  return ronda;
}

function esFinal(ronda: string): boolean {
  return ronda.toLowerCase().includes("final") && !ronda.toLowerCase().includes("semi");
}

interface BracketTreeViewProps {
  torneoId: string;
  partidos: PartidoTorneo[];
  vista: VistaDenominacion;
  rondaActiva: string;
  onRondaActivaChange: (ronda: string) => void;
}

export function BracketTreeView({
  torneoId,
  partidos,
  vista,
  rondaActiva,
  onRondaActivaChange,
}: BracketTreeViewProps) {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const porRonda = agruparPartidosPorRonda(partidos);
  const rondas = ordenarRondasCuadro(Object.keys(porRonda));

  if (rondas.length === 0) {
    return (
      <View className="rounded-card border border-brand-border bg-brand-surface p-5">
        <Text className="font-sans text-base text-brand-muted">
          El cuadro eliminatorio todavía no está disponible.
        </Text>
      </View>
    );
  }

  const scrollToRonda = useCallback(
    (ronda: string) => {
      const idx = rondas.indexOf(ronda);
      if (idx >= 0 && scrollRef.current) {
        scrollRef.current.scrollTo({
          x: Math.max(0, idx * (CARD_W + COL_GAP) - 24),
          animated: true,
        });
      }
      onRondaActivaChange(ronda);
    },
    [rondas, onRondaActivaChange],
  );

  const onScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const x = e.nativeEvent.contentOffset.x;
      const idx = Math.round(x / (CARD_W + COL_GAP));
      const ronda = rondas[Math.min(Math.max(idx, 0), rondas.length - 1)];
      if (ronda && ronda !== rondaActiva) onRondaActivaChange(ronda);
    },
    [rondas, rondaActiva, onRondaActivaChange],
  );

  const totalHeight = Math.max(
    ...rondas.map((r) => {
      const count = porRonda[r]?.length || 1;
      return count * CARD_H + (count - 1) * ROW_GAP + 40;
    }),
    CARD_H * 2 + ROW_GAP + 40,
  );

  function columnOffsetY(colIndex: number, matchIndex: number, matchCount: number) {
    const blockH = matchCount * CARD_H + (matchCount - 1) * ROW_GAP;
    const startY = (totalHeight - blockH) / 2;
    return startY + matchIndex * (CARD_H + ROW_GAP);
  }

  function buildConnectors() {
    const paths: { d: string; active: boolean }[] = [];
    for (let c = 0; c < rondas.length - 1; c++) {
      const left = porRonda[rondas[c]] || [];
      const right = porRonda[rondas[c + 1]] || [];
      if (!left.length || !right.length) continue;

      const leftX = c * (CARD_W + COL_GAP) + CARD_W;
      const rightX = (c + 1) * (CARD_W + COL_GAP);
      const midX = leftX + COL_GAP / 2;

      left.forEach((partido, mi) => {
        const y1 = columnOffsetY(c, mi, left.length) + CARD_H / 2;
        const ri = Math.floor(mi / 2);
        const target = right[Math.min(ri, right.length - 1)];
        if (!target) return;
        const y2 =
          columnOffsetY(c + 1, Math.min(ri, right.length - 1), right.length) +
          CARD_H / 2;

        const gano =
          Boolean(partido.ganador) &&
          (setsGanados(partido, "a") > setsGanados(partido, "b")
            ? partido.ganador === partido.equipo_a_id
            : partido.ganador === partido.equipo_b_id);

        paths.push({
          d: `M ${leftX} ${y1} H ${midX} V ${y2} H ${rightX}`,
          active: gano,
        });
      });
    }
    return paths;
  }

  const connectors = buildConnectors();
  const totalWidth = rondas.length * CARD_W + (rondas.length - 1) * COL_GAP;

  return (
    <View className="gap-3">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {rondas.map((ronda) => {
          const active = ronda === rondaActiva;
          return (
            <Pressable
              key={ronda}
              onPress={() => scrollToRonda(ronda)}
              className={`rounded-full px-4 py-2 ${
                active
                  ? "bg-brand-chartreuse"
                  : "border border-brand-border bg-brand-surface"
              }`}
            >
              <Text
                className={`font-sans-semibold text-sm ${
                  active ? "text-black" : "text-brand-muted"
                }`}
              >
                {labelRonda(ronda)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={{ paddingVertical: 8, paddingRight: 24 }}
      >
        <View style={{ width: totalWidth, height: totalHeight }}>
          <Svg
            width={totalWidth}
            height={totalHeight}
            style={{ position: "absolute", left: 0, top: 0 }}
          >
            {connectors.map((c, i) => (
              <Path
                key={i}
                d={c.d}
                stroke={c.active ? "#CBFE01" : "#3A3A3A"}
                strokeWidth={2}
                fill="none"
              />
            ))}
          </Svg>

          {rondas.map((ronda, colIndex) => {
            const lista = porRonda[ronda] || [];
            const isFinalCol = esFinal(ronda);

            return (
              <View
                key={ronda}
                style={{
                  position: "absolute",
                  left: colIndex * (CARD_W + COL_GAP),
                  top: 0,
                  width: CARD_W,
                  height: totalHeight,
                }}
              >
                {isFinalCol ? (
                  <Text className="mb-2 text-center font-sans-bold text-xs tracking-[2px] text-brand-chartreuse">
                    FINAL
                  </Text>
                ) : (
                  <View className="mb-2 h-4" />
                )}

                {lista.map((partido, matchIndex) => {
                  const top = columnOffsetY(colIndex, matchIndex, lista.length);
                  const expanded = expandedId === partido.id;
                  const enJuego =
                    !partido.ganador &&
                    (partido.estado_partido === "En curso" ||
                      partido.estado_partido === "en curso");

                  return (
                    <View
                      key={partido.id}
                      style={{
                        position: "absolute",
                        top: isFinalCol ? top + 20 : top,
                        width: CARD_W,
                      }}
                    >
                      <BracketMatchCard
                        partido={partido}
                        vista={vista}
                        expanded={expanded}
                        compact
                        showEnJuego={enJuego && isFinalCol}
                        onPress={() => {
                          setExpandedId((prev) =>
                            prev === partido.id ? null : partido.id,
                          );
                          if (partido.ganador || partido.set1_a != null) {
                            router.push(
                              hrefTorneoResultado(torneoId, partido.id),
                            );
                          }
                        }}
                      />
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
