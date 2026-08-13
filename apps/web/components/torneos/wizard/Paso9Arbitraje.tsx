import React, { useState, useEffect, useMemo } from "react";
import { TorneosService } from "@/utils/services/torneos";
import { Partido } from "@/utils/types";
import { LiveArbitrajeRow } from "@/components/torneos/LiveArbitrajeRow";
import {
  TeamBox,
  FinishedMatchScore,
} from "@/components/torneos/MatchTeamBox";
import { api } from "@/utils/api";
import { Trophy, Check, ChevronDown, ChevronUp } from "lucide-react";

interface PasoResultadosProps {
  torneo?: any;
  partidos: Partido[];
  torneoId?: string;
  setFeedbackModal: (modal: any) => void;
  setActiveTab: (tab: string) => void | Promise<void>;
  triggerRefresh: () => void;
  isReadOnly?: boolean;
}

const PLAYOFF_ROUNDS = new Set([
  "32AVOS",
  "16AVOS",
  "OCTAVOS",
  "CUARTOS",
  "SEMIS",
  "FINAL",
]);

const isZonaRonda = (ronda?: string | null) => {
  const r = String(ronda || "").toUpperCase();
  if (!r) return false;
  if (PLAYOFF_ROUNDS.has(r)) return false;
  return r.startsWith("ZONA") || r.includes("GRUPO");
};

/** @deprecated Use PasoResultados — alias por compatibilidad */
export type Paso8ArbitrajeProps = PasoResultadosProps;

export const PasoResultados = ({
  torneo,
  partidos,
  torneoId,
  setFeedbackModal,
  setActiveTab,
  triggerRefresh,
  isReadOnly = false,
}: PasoResultadosProps) => {
  const [guardandoPartidoId, setGuardandoPartidoId] = useState<string | null>(
    null,
  );
  const [disponibilidadesPaso5, setDisponibilidadesPaso5] = useState<any[]>([]);
  const [zonasColapsadas, setZonasColapsadas] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    if (!torneoId) return;
    api
      .get(`/torneos/${torneoId}/canchas-disponibilidad`)
      .then((res) => {
        const list = res.data?.data || res.data || [];
        setDisponibilidadesPaso5(Array.isArray(list) ? list : []);
      })
      .catch(() => setDisponibilidadesPaso5([]));
  }, [torneoId]);

  const sortPartidosEstable = (list: Partido[]) => {
    return [...list].sort((a, b) => {
      const rondaA = String(a.ronda || "").toUpperCase();
      const rondaB = String(b.ronda || "").toUpperCase();
      if (rondaA !== rondaB) {
        return rondaA.localeCompare(rondaB, undefined, {
          numeric: true,
          sensitivity: "base",
        });
      }
      const ordenA = a.orden ?? 0;
      const ordenB = b.orden ?? 0;
      if (ordenA !== ordenB) {
        return ordenA - ordenB;
      }
      return String(a.id).localeCompare(String(b.id));
    });
  };

  const partidosJugables = useMemo(
    () =>
      sortPartidosEstable(
        partidos.filter(
          (p) => p.equipo_a_id && p.equipo_b_id && p.ganador === null,
        ),
      ),
    [partidos],
  );

  const partidosFinalizados = useMemo(
    () => sortPartidosEstable(partidos.filter((p) => p.ganador !== null)),
    [partidos],
  );

  const {
    gruposZonas,
    partidosLlave,
    gruposZonasFinalizados,
    llaveFinalizados,
  } = useMemo(() => {
    const zonasMap = new Map<string, Partido[]>();
    const zonasFinMap = new Map<string, Partido[]>();
    const llave: Partido[] = [];
    const llaveFin: Partido[] = [];

    for (const p of partidosJugables) {
      if (isZonaRonda(p.ronda)) {
        const key = String(p.ronda);
        if (!zonasMap.has(key)) zonasMap.set(key, []);
        zonasMap.get(key)!.push(p);
      } else {
        llave.push(p);
      }
    }

    for (const p of partidosFinalizados) {
      if (isZonaRonda(p.ronda)) {
        const key = String(p.ronda);
        if (!zonasFinMap.has(key)) zonasFinMap.set(key, []);
        zonasFinMap.get(key)!.push(p);
      } else {
        llaveFin.push(p);
      }
    }

    const sortKeys = (entries: [string, Partido[]][]) =>
      entries
        .sort(([a], [b]) =>
          a.localeCompare(b, undefined, {
            numeric: true,
            sensitivity: "base",
          }),
        )
        .map(([nombre, items]) => ({
          nombre,
          partidos: sortPartidosEstable(items),
        }));

    return {
      gruposZonas: sortKeys(Array.from(zonasMap.entries())),
      partidosLlave: sortPartidosEstable(llave),
      gruposZonasFinalizados: sortKeys(Array.from(zonasFinMap.entries())),
      llaveFinalizados: sortPartidosEstable(llaveFin),
    };
  }, [partidosJugables, partidosFinalizados]);

  const nombresZonas = useMemo(() => {
    const set = new Set<string>();
    gruposZonas.forEach((g) => set.add(g.nombre));
    gruposZonasFinalizados.forEach((g) => set.add(g.nombre));
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
  }, [gruposZonas, gruposZonasFinalizados]);

  /** Zonas con partidos pendientes primero; las 100% finalizadas al fondo. */
  const { zonasActivas, zonasCompletas } = useMemo(() => {
    const activas: string[] = [];
    const completas: string[] = [];
    for (const nombre of nombresZonas) {
      const pendientes =
        gruposZonas.find((g) => g.nombre === nombre)?.partidos.length ?? 0;
      if (pendientes > 0) activas.push(nombre);
      else completas.push(nombre);
    }
    return { zonasActivas: activas, zonasCompletas: completas };
  }, [nombresZonas, gruposZonas]);

  const zonaEstaColapsada = (nombre: string) => {
    if (Object.prototype.hasOwnProperty.call(zonasColapsadas, nombre)) {
      return zonasColapsadas[nombre] === true;
    }
    // Por defecto: zonas sin pendientes arrancan comprimidas
    const pendientes =
      gruposZonas.find((g) => g.nombre === nombre)?.partidos.length ?? 0;
    return pendientes === 0;
  };

  const toggleZona = (nombre: string) => {
    setZonasColapsadas((prev) => {
      const explicit = Object.prototype.hasOwnProperty.call(prev, nombre);
      const pendientes =
        gruposZonas.find((g) => g.nombre === nombre)?.partidos.length ?? 0;
      const currentlyCollapsed = explicit
        ? prev[nombre] === true
        : pendientes === 0;
      return { ...prev, [nombre]: !currentlyCollapsed };
    });
  };

  const formatMatchDateTimeInfo = (
    cancha?: string | null,
    fechaIso?: string | null,
  ) => {
    const parts: string[] = [];
    if (cancha) parts.push(cancha);
    if (fechaIso) {
      try {
        const d = new Date(fechaIso);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const dayName = d.toLocaleDateString("es-AR", { weekday: "short" });
        const capDay =
          dayName.charAt(0).toUpperCase() + dayName.slice(1).replace(".", "");
        const hh = String(d.getHours()).padStart(2, "0");
        const mins = String(d.getMinutes()).padStart(2, "0");
        parts.push(`${capDay} ${dd}/${mm}/${yyyy} · ${hh}:${mins} hs`);
      } catch {
        /* ignore */
      }
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  };

  const renderCompactMatchLine = (p: Partido) => {
    const code = (
      p.orden != null ? String(p.orden).padStart(2, "0") : p.id.slice(0, 4)
    ).toUpperCase();
    const shortPair = (j1?: string | null, j2?: string | null) => {
      const a = (j1 || "").split(",")[0]?.trim() || "—";
      const b = (j2 || "").split(",")[0]?.trim();
      return b && b !== "-" ? `${a} · ${b}` : a;
    };
    const done = p.ganador != null;
    return (
      <div
        key={`compact-${p.id}`}
        className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0 text-[10px] min-w-0"
      >
        <span className="text-sky-400 font-black shrink-0">#{code}</span>
        <span
          className={`truncate font-bold ${done ? "text-gray-500" : "text-white"}`}
        >
          {shortPair(p.equipo_a_j1, p.equipo_a_j2)}
        </span>
        <span className="text-gray-600 shrink-0">vs</span>
        <span
          className={`truncate font-bold ${done ? "text-gray-500" : "text-white"}`}
        >
          {shortPair(p.equipo_b_j1, p.equipo_b_j2)}
        </span>
        {done ? (
          <span className="ml-auto text-brand-chartreuse font-black shrink-0">
            OK
          </span>
        ) : (
          <span className="ml-auto text-amber-400/80 font-black shrink-0">
            —
          </span>
        )}
      </div>
    );
  };

  const renderFinishedRow = (p: Partido) => {
    const isGanadorA = p.ganador === p.equipo_a_id;
    const isGanadorB = p.ganador === p.equipo_b_id;
    const meta = formatMatchDateTimeInfo(p.cancha_asignada, p.fecha_partido);
    const code = (
      p.orden != null ? String(p.orden).padStart(2, "0") : p.id.slice(0, 4)
    ).toUpperCase();

    return (
      <div
        key={p.id}
        className="rounded-2xl border border-white/8 bg-[#0a0a0a]/60 p-3 space-y-2.5"
      >
        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2.5 md:gap-3 items-stretch">
          <TeamBox
            j1={p.equipo_a_j1}
            j2={p.equipo_a_j2}
            avatarJ1={p.equipo_a_avatar_j1}
            avatarJ2={p.equipo_a_avatar_j2}
            club={p.equipo_a_club}
            align="left"
            isWinner={isGanadorA}
            compact
          />
          <div className="flex items-center justify-center self-center order-first md:order-none">
            <FinishedMatchScore
              set1A={p.set1_a ?? null}
              set1B={p.set1_b ?? null}
              set2A={p.set2_a ?? null}
              set2B={p.set2_b ?? null}
              set3A={p.set3_a ?? null}
              set3B={p.set3_b ?? null}
              esWo={Boolean(p.es_wo)}
              esSupertiebreak={Boolean(p.es_supertiebreak)}
            />
          </div>
          <TeamBox
            j1={p.equipo_b_j1}
            j2={p.equipo_b_j2}
            avatarJ1={p.equipo_b_avatar_j1}
            avatarJ2={p.equipo_b_avatar_j2}
            club={p.equipo_b_club}
            align="right"
            isWinner={isGanadorB}
            compact
          />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[10px] font-bold border-t border-white/5 pt-2">
          <span className="text-sky-400 bg-sky-400/10 border border-sky-400/20 px-1.5 py-0.5 rounded">
            #{code}
          </span>
          {meta && <span className="text-emerald-400/90">{meta}</span>}
          <span className="text-gray-500 uppercase tracking-wide">{p.ronda}</span>
        </div>
      </div>
    );
  };

  const handleGuardarResultadoLive = async (
    partidoId: string,
    ganadorId: string,
    scorePayload: {
      set1_a: number;
      set1_b: number;
      set2_a?: number | null;
      set2_b?: number | null;
      set3_a?: number | null;
      set3_b?: number | null;
      es_supertiebreak?: boolean;
      es_wo?: boolean;
      es_injustificado_wo?: boolean;
    },
  ) => {
    try {
      setGuardandoPartidoId(partidoId);
      await TorneosService.actualizarResultado(partidoId, {
        ganador_id: ganadorId,
        ...scorePayload,
      });

      triggerRefresh();

      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "success",
        title: "¡Marcador guardado!",
        description:
          "El marcador fue guardado y el ganador avanzó en la llave.",
      }));
    } catch (error: any) {
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "error",
        title: "Error al guardar",
        description: error.message || "Error al impactar el marcador.",
      }));
    } finally {
      setGuardandoPartidoId(null);
    }
  };

  const showErrorModal = (msg: string) => {
    setFeedbackModal((prev: any) => ({
      ...prev,
      isOpen: true,
      type: "warning",
      title: "Atención",
      description: msg,
    }));
  };

  const renderPartidoRows = (lista: Partido[]) =>
    lista.map((partido) => (
      <LiveArbitrajeRow
        key={partido.id}
        partido={partido}
        torneo={torneo}
        todosLosPartidos={partidos}
        disponibilidades={disponibilidadesPaso5}
        onSave={handleGuardarResultadoLive}
        onPartidoUpdated={triggerRefresh}
        isSaving={guardandoPartidoId === partido.id}
        onError={showErrorModal}
      />
    ));

  const renderZonaCard = (nombre: string) => {
    const pendientes =
      gruposZonas.find((g) => g.nombre === nombre)?.partidos || [];
    const finalizados =
      gruposZonasFinalizados.find((g) => g.nombre === nombre)?.partidos ||
      [];
    const colapsada = zonaEstaColapsada(nombre);
    const total = pendientes.length + finalizados.length;
    const resumenPartidos = [...pendientes, ...finalizados].slice(0, 6);
    const zonaCerrada = pendientes.length === 0 && finalizados.length > 0;

    return (
      <div
        key={nombre}
        className={`bg-[#161616] border rounded-2xl shadow-xl min-w-0 w-full ${
          zonaCerrada
            ? "border-white/5 opacity-95"
            : "border-white/8"
        } ${colapsada ? "p-3" : "p-4 sm:p-5 space-y-5"}`}
      >
        <button
          type="button"
          onClick={() => toggleZona(nombre)}
          className={`w-full flex items-center justify-between gap-3 cursor-pointer text-left ${
            colapsada ? "" : "border-b border-white/5 pb-3"
          }`}
          aria-expanded={!colapsada}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="size-4 text-brand-chartreuse shrink-0" />
            <h4 className="font-extrabold text-white text-sm uppercase tracking-wider truncate">
              Partidos · {nombre}
            </h4>
            {zonaCerrada && (
              <span className="text-[9px] font-black uppercase tracking-wider text-brand-chartreuse/80 bg-brand-chartreuse/10 border border-brand-chartreuse/20 px-2 py-0.5 rounded-full shrink-0">
                Completa
              </span>
            )}
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-gray-400">
            {pendientes.length} en curso · {finalizados.length} finalizados
            {colapsada ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronUp className="size-3.5" />
            )}
          </span>
        </button>

        {colapsada ? (
          <div className="mt-2 rounded-xl bg-[#0d0d0d] border border-white/5 px-2.5 py-1">
            {resumenPartidos.length > 0 ? (
              <>
                {resumenPartidos.map((p) => renderCompactMatchLine(p))}
                {total > resumenPartidos.length && (
                  <p className="text-[9px] text-gray-500 font-bold py-1.5 text-center">
                    +{total - resumenPartidos.length} más · expandir para ver
                  </p>
                )}
              </>
            ) : (
              <p className="text-[10px] text-gray-500 text-center py-2">
                Sin partidos
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {!isReadOnly && pendientes.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-l-2 border-amber-400/80 pl-3">
                  <p className="text-[11px] font-black text-amber-300 uppercase tracking-wider">
                    En curso / pendientes
                  </p>
                  <span className="text-[10px] font-bold text-amber-400/70">
                    ({pendientes.length})
                  </span>
                </div>
                {renderPartidoRows(pendientes)}
              </section>
            )}

            {finalizados.length > 0 && (
              <section className="space-y-3 rounded-2xl border border-brand-chartreuse/20 bg-brand-chartreuse/[0.04] p-3 sm:p-4">
                <div className="flex items-center gap-2 border-l-2 border-brand-chartreuse pl-3">
                  <p className="text-[11px] font-black text-brand-chartreuse uppercase tracking-wider">
                    Finalizados
                  </p>
                  <span className="text-[10px] font-bold text-brand-chartreuse/70">
                    ({finalizados.length})
                  </span>
                </div>
                {finalizados.map((p) => renderFinishedRow(p))}
              </section>
            )}

            {pendientes.length === 0 && finalizados.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">
                Sin partidos en esta zona.
              </p>
            )}

            {isReadOnly &&
              pendientes.length > 0 &&
              finalizados.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-2">
                  Modo lectura: no hay resultados cargados aún.
                </p>
              )}
          </div>
        )}
      </div>
    );
  };

  const totalPendientesZonas = gruposZonas.reduce(
    (acc, g) => acc + g.partidos.length,
    0,
  );
  const totalFinalizadosZonas = gruposZonasFinalizados.reduce(
    (acc, g) => acc + g.partidos.length,
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header acciones — mismo espíritu que Paso 8 */}
      <div className="bg-brand-card rounded-3xl border border-white/5 p-5 sm:p-6 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
              <h3 className="font-extrabold text-white text-xl">
                Resultados por zona
              </h3>
              <span className="px-3 py-1 bg-brand-chartreuse/10 border border-brand-chartreuse/20 text-brand-chartreuse text-xs font-bold rounded-full flex items-center gap-1.5 shrink-0">
                <Check className="size-3.5" /> Carga de marcadores
              </span>
            </div>
       
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto">
            {nombresZonas.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setZonasColapsadas(
                      Object.fromEntries(nombresZonas.map((n) => [n, true])),
                    )
                  }
                  className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-2 rounded-xl font-bold transition-all text-[11px] border border-white/10 cursor-pointer shrink-0"
                >
                  Comprimir zonas
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setZonasColapsadas(
                      Object.fromEntries(nombresZonas.map((n) => [n, false])),
                    )
                  }
                  className="flex items-center justify-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 px-3 py-2 rounded-xl font-bold transition-all text-[11px] border border-white/10 cursor-pointer shrink-0"
                >
                  Expandir zonas
                </button>
              </>
            )}
            {!isReadOnly && (
              <button
                type="button"
                onClick={() => setActiveTab("times")}
                className="flex items-center justify-center gap-2 bg-brand-chartreuse/10 hover:bg-brand-chartreuse/20 text-brand-chartreuse px-4 py-2.5 rounded-xl font-bold transition-all text-xs border border-brand-chartreuse/30 cursor-pointer shrink-0"
              >
                + Canchas (Paso 5)
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                const { generarPdfHojaRuta } = await import("@/utils/grillaPdf");
                generarPdfHojaRuta(torneo, partidos);
              }}
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-bold transition-all text-xs border border-white/10 cursor-pointer shrink-0"
              title="Grilla de Partidos | Auxiliares de Cancha"
            >
              Grilla auxiliares
            </button>
            <button
              type="button"
              onClick={async () => {
                const { generarPdfGrillasPorCancha } =
                  await import("@/utils/grillaPdf");
                generarPdfGrillasPorCancha(torneo, partidos);
              }}
              className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-bold transition-all text-xs border border-white/10 cursor-pointer shrink-0"
            >
              Grillas por cancha
            </button>
            {torneo?.estado === "Finalizado" && (
              <button
                type="button"
                onClick={async () => {
                  const { generarPdfGrillaPartidos } =
                    await import("@/utils/grillaPdf");
                  generarPdfGrillaPartidos(torneo, partidos);
                }}
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 rounded-xl font-bold transition-all text-xs border border-white/10 cursor-pointer shrink-0"
              >
                Informe resultados
              </button>
            )}
          </div>
        </div>

        {(nombresZonas.length > 0 ||
          partidosLlave.length > 0 ||
          llaveFinalizados.length > 0) && (
          <div className="text-gray-500 text-xs sm:text-sm font-medium flex flex-wrap gap-x-3 gap-y-1">
            {nombresZonas.length > 0 && (
              <span>
                {nombresZonas.length} zonas · {totalPendientesZonas} pendientes
                · {totalFinalizadosZonas} finalizados
              </span>
            )}
            {(partidosLlave.length > 0 || llaveFinalizados.length > 0) && (
              <span>
                Llave: {partidosLlave.length} pendientes ·{" "}
                {llaveFinalizados.length} finalizados
              </span>
            )}
          </div>
        )}
      </div>

      {partidos.length === 0 && (
        <div className="bg-brand-card rounded-3xl border border-white/5 p-8 text-center text-gray-400 text-sm font-medium">
          No hay partidos generados en el cuadro para este torneo.
        </div>
      )}

      {/* Prioridad: zonas con partidos en curso */}
      {zonasActivas.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-black text-brand-chartreuse uppercase tracking-widest">
            Fase de zonas · en curso
          </h4>
          <div className="flex flex-col gap-5">
            {zonasActivas.map((nombre) => renderZonaCard(nombre))}
          </div>
        </div>
      )}

      {/* Llave (pendientes primero) — arriba de zonas ya cerradas */}
      {(partidosLlave.length > 0 || llaveFinalizados.length > 0) && (
        <div className="space-y-4">
          <h4 className="text-xs font-black text-brand-chartreuse uppercase tracking-widest">
            Llave de campeonato
          </h4>
          <div className="bg-[#161616] border border-white/5 rounded-3xl p-5 space-y-4 shadow-xl">
            {!isReadOnly && partidosLlave.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-l-2 border-amber-400/80 pl-3">
                  <p className="text-[11px] font-black text-amber-300 uppercase tracking-wider">
                    En curso / pendientes
                  </p>
                  <span className="text-[10px] font-bold text-amber-400/70">
                    ({partidosLlave.length})
                  </span>
                </div>
                {renderPartidoRows(partidosLlave)}
              </section>
            )}
            {llaveFinalizados.length > 0 && (
              <section className="space-y-3 rounded-2xl border border-brand-chartreuse/20 bg-brand-chartreuse/[0.04] p-3 sm:p-4">
                <div className="flex items-center gap-2 border-l-2 border-brand-chartreuse pl-3">
                  <p className="text-[11px] font-black text-brand-chartreuse uppercase tracking-wider">
                    Finalizados
                  </p>
                  <span className="text-[10px] font-bold text-brand-chartreuse/70">
                    ({llaveFinalizados.length})
                  </span>
                </div>
                {llaveFinalizados.map((p) => renderFinishedRow(p))}
              </section>
            )}
          </div>
        </div>
      )}

      {/* Zonas 100% finalizadas al fondo */}
      {zonasCompletas.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">
            Fase de zonas · finalizadas
          </h4>
          <div className="flex flex-col gap-5">
            {zonasCompletas.map((nombre) => renderZonaCard(nombre))}
          </div>
        </div>
      )}

      {/* Fallback sin zonas/llave tipados */}
      {!isReadOnly &&
        nombresZonas.length === 0 &&
        partidosLlave.length === 0 &&
        partidosJugables.length > 0 && (
          <div className="bg-[#161616] border border-white/5 rounded-3xl p-5 space-y-3 shadow-xl">
            {renderPartidoRows(partidosJugables)}
          </div>
        )}

      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-white/5">
        <button
          type="button"
          onClick={() => setActiveTab("draws")}
          className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold cursor-pointer"
        >
          Atrás
        </button>
        <div className="text-xs text-gray-500 font-semibold flex items-center">
          Al cargar el resultado del último partido de la Final, el torneo pasa
          automáticamente a estado Finalizado.
        </div>
      </div>
    </div>
  );
};

/** @deprecated Preferir PasoResultados */
export const Paso8Arbitraje = PasoResultados;
