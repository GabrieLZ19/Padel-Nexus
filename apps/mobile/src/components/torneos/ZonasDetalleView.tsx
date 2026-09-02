import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

import { ZonaMatchCard } from "@/src/components/torneos/ZonaMatchCard";
import { hrefJugador } from "@/src/lib/navigation";
import {
  agruparPartidosPorRonda,
  ordenarRondas,
  type VistaDenominacion,
} from "@/src/lib/partidoUtils";
import type {
  GrupoParejaZona,
  GrupoZonaTorneo,
  PartidoTorneo,
} from "@/src/types/competencia.types";

interface ZonasDetalleViewProps {
  grupos: GrupoZonaTorneo[];
  partidos: PartidoTorneo[];
  vista: VistaDenominacion;
  torneoId: string;
}

interface PosicionZona {
  inscripcion_id: string;
  nombre: string;
  pj: number;
  pg: number;
  pts: number;
}

function nombrePareja(pareja: GrupoParejaZona): string {
  const ins = pareja.inscripciones;
  const jugadores = [ins?.jugador1_nombre, ins?.jugador2_nombre]
    .filter(Boolean)
    .join(" / ");
  return (
    jugadores ||
    ins?.denominacion_nacional ||
    pareja.clubName ||
    "Pareja sin nombre"
  );
}

function calcularPosiciones(
  partidos: PartidoTorneo[],
  parejas: GrupoParejaZona[],
): PosicionZona[] {
  const stats = new Map<string, PosicionZona>();

  for (const pareja of parejas) {
    const id = pareja.inscripcion_id || pareja.inscripciones?.id;
    if (!id) continue;
    stats.set(id, {
      inscripcion_id: id,
      nombre: nombrePareja(pareja),
      pj: 0,
      pg: 0,
      pts: 0,
    });
  }

  for (const partido of partidos) {
    const finalizado =
      Boolean(partido.ganador) || partido.estado_partido === "Finalizado";
    if (!finalizado) continue;

    const ids = [partido.equipo_a_id, partido.equipo_b_id].filter(Boolean) as string[];
    for (const equipoId of ids) {
      const row = stats.get(equipoId);
      if (!row) continue;
      row.pj += 1;
      if (partido.ganador === equipoId) {
        row.pg += 1;
        row.pts += 2;
      }
    }
  }

  return Array.from(stats.values()).sort(
    (a, b) => b.pts - a.pts || b.pg - a.pg || a.nombre.localeCompare(b.nombre),
  );
}

function matchGrupoNombre(
  grupo: GrupoZonaTorneo,
  nombreRonda: string,
): boolean {
  const grupoNombre = (grupo.nombre_grupo || grupo.nombre || "").toUpperCase();
  const ronda = nombreRonda.toUpperCase();
  return grupoNombre === ronda || ronda.includes(grupoNombre) || grupoNombre.includes(ronda.replace("ZONA ", ""));
}

export function ZonasDetalleView({
  grupos,
  partidos,
  vista,
  torneoId,
}: ZonasDetalleViewProps) {
  const router = useRouter();
  const porRonda = agruparPartidosPorRonda(partidos);
  const nombresZona = ordenarRondas(Object.keys(porRonda));

  const zonasDisponibles = useMemo(() => {
    if (grupos.length > 0) {
      return grupos.map((g) => ({
        id: g.id,
        label: g.nombre_grupo || g.nombre || "Zona",
        grupo: g,
        partidos: partidos.filter((p) => matchGrupoNombre(g, p.ronda)),
      }));
    }
    return nombresZona.map((nombre) => ({
      id: nombre,
      label: nombre.replace(/^zona\s/i, "Zona "),
      grupo: null as GrupoZonaTorneo | null,
      partidos: porRonda[nombre] || [],
    }));
  }, [grupos, nombresZona, porRonda, partidos]);

  const [zonaActiva, setZonaActiva] = useState("");

  useEffect(() => {
    if (!zonaActiva && zonasDisponibles[0]?.id) {
      setZonaActiva(zonasDisponibles[0].id);
    }
  }, [zonaActiva, zonasDisponibles]);

  const zonaSeleccionada =
    zonasDisponibles.find((z) => z.id === zonaActiva) || zonasDisponibles[0];

  if (!zonaSeleccionada) {
    return (
      <View className="rounded-card border border-brand-border bg-brand-surface p-5">
        <Text className="font-sans text-base text-brand-muted">
          Todavía no hay zonas publicadas para este torneo.
        </Text>
      </View>
    );
  }

  const parejas = zonaSeleccionada.grupo?.grupo_parejas || [];
  const posiciones = calcularPosiciones(zonaSeleccionada.partidos, parejas);

  return (
    <View className="gap-5">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        {zonasDisponibles.map((zona) => {
          const active = zona.id === zonaSeleccionada.id;
          return (
            <Pressable
              key={zona.id}
              onPress={() => setZonaActiva(zona.id)}
              className={`rounded-full px-4 py-2.5 ${
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
                {zona.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {parejas.length > 0 ? (
        <View className="gap-3">
          <Text className="font-sans-semibold text-xs tracking-[1.5px] text-brand-muted">
            PAREJAS EN LA ZONA
          </Text>
          <View className="gap-2">
            {parejas.map((pareja) => {
              const ins = pareja.inscripciones;
              const openJugador = (usuarioId?: string | null) => {
                if (!usuarioId) return;
                router.push(hrefJugador(usuarioId));
              };

              return (
                <View
                  key={pareja.id}
                  className="rounded-card border border-brand-border bg-brand-surface px-4 py-3"
                >
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="min-w-0 flex-1 gap-2">
                      <Pressable
                        onPress={() => openJugador(ins?.usuario_id)}
                        disabled={!ins?.usuario_id}
                        className="flex-row items-center justify-between gap-2 active:opacity-80"
                      >
                        <Text
                          className={`font-sans-bold text-base ${
                            ins?.usuario_id ? "text-white" : "text-brand-muted"
                          }`}
                        >
                          {ins?.jugador1_nombre || "Jugador 1"}
                        </Text>
                        {ins?.usuario_id ? (
                          <FontAwesome
                            name="chevron-right"
                            size={10}
                            color="#8A8A8A"
                          />
                        ) : null}
                      </Pressable>
                      <Pressable
                        onPress={() => openJugador(ins?.usuario2_id)}
                        disabled={!ins?.usuario2_id}
                        className="flex-row items-center justify-between gap-2 active:opacity-80"
                      >
                        <Text
                          className={`font-sans-medium text-sm ${
                            ins?.usuario2_id
                              ? "text-brand-chartreuse"
                              : "text-brand-muted"
                          }`}
                        >
                          {ins?.jugador2_nombre || "Jugador 2"}
                        </Text>
                        {ins?.usuario2_id ? (
                          <FontAwesome
                            name="chevron-right"
                            size={10}
                            color="#8A8A8A"
                          />
                        ) : null}
                      </Pressable>
                      <Text className="font-sans text-xs text-brand-muted">
                        {ins?.denominacion_nacional || ins?.provincia || "—"}
                        {pareja.clubName ? ` · ${pareja.clubName}` : ""}
                      </Text>
                    </View>
                    <View className="items-end gap-1">
                      {pareja.cabezaDeSerie ? (
                        <View className="rounded-full bg-brand-chartreuse/15 px-2 py-0.5">
                          <Text className="font-sans-semibold text-[10px] text-brand-chartreuse">
                            CABEZA
                          </Text>
                        </View>
                      ) : null}
                      {ins?.letra_prioridad ? (
                        <Text className="font-sans-bold text-sm text-white">
                          [{ins.letra_prioridad}]
                        </Text>
                      ) : null}
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      {posiciones.length > 0 ? (
        <View className="overflow-hidden rounded-card border border-brand-border bg-brand-surface">
          <View className="border-b border-brand-border px-4 py-3">
            <Text className="font-sans-semibold text-xs tracking-[1.5px] text-brand-muted">
              TABLA DE POSICIONES
            </Text>
          </View>
          <View className="flex-row border-b border-brand-border bg-brand-elevated px-3 py-2">
            <Text className="w-7 font-sans-semibold text-[10px] text-brand-muted">
              #
            </Text>
            <Text className="min-w-0 flex-1 font-sans-semibold text-[10px] text-brand-muted">
              PAREJA
            </Text>
            <Text className="w-9 text-center font-sans-semibold text-[10px] text-brand-muted">
              PJ
            </Text>
            <Text className="w-9 text-center font-sans-semibold text-[10px] text-brand-muted">
              PG
            </Text>
            <Text className="w-10 text-right font-sans-semibold text-[10px] text-brand-muted">
              PTS
            </Text>
          </View>
          {posiciones.map((row, index) => (
            <View
              key={row.inscripcion_id}
              className="flex-row items-center border-b border-brand-border/50 px-3 py-3 last:border-b-0"
            >
              <Text className="w-7 font-sans-bold text-sm text-brand-chartreuse">
                {index + 1}
              </Text>
              <Text
                className="min-w-0 flex-1 font-sans-medium text-sm text-white"
                numberOfLines={2}
              >
                {row.nombre}
              </Text>
              <Text className="w-9 text-center font-sans text-sm text-brand-muted">
                {row.pj}
              </Text>
              <Text className="w-9 text-center font-sans text-sm text-brand-muted">
                {row.pg}
              </Text>
              <Text className="w-10 text-right font-sans-bold text-sm text-white">
                {row.pts}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View className="gap-3">
        <View className="flex-row items-center justify-between">
          <Text className="font-sans-semibold text-xs tracking-[1.5px] text-brand-muted">
            PARTIDOS DE LA ZONA
          </Text>
          <Text className="font-sans text-xs text-brand-muted">
            {zonaSeleccionada.partidos.length} partidos
          </Text>
        </View>
        {zonaSeleccionada.partidos.length === 0 ? (
          <View className="rounded-card border border-brand-border bg-brand-surface p-4">
            <Text className="font-sans text-sm text-brand-muted">
              Todavía no hay partidos cargados en esta zona.
            </Text>
          </View>
        ) : (
          zonaSeleccionada.partidos.map((partido) => (
            <ZonaMatchCard
              key={partido.id}
              partido={partido}
              vista={vista}
              torneoId={torneoId}
            />
          ))
        )}
      </View>
    </View>
  );
}
