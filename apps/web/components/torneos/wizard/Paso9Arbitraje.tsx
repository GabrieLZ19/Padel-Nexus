import React, { useState, useEffect, useMemo } from "react";
import { TorneosService } from "@/utils/services/torneos";
import { Partido } from "@/utils/types";
import { LiveArbitrajeRow } from "@/components/torneos/LiveArbitrajeRow";
import {
  TeamBox,
  FinishedMatchScore,
} from "@/components/torneos/MatchTeamBox";
import {
  Trophy,
  ChevronDown,
  ChevronUp,
  FoldVertical,
  UnfoldVertical,
  FileDown,
} from "lucide-react";
import { zonaGrupoCompleta } from "@/utils/clasificacionZonas";

type VistaRapida = "pendientes" | "finalizados" | "todo";

interface PasoResultadosProps {
  torneo?: any;
  partidos: Partido[];
  torneoId?: string;
  setFeedbackModal: (modal: any) => void;
  setActiveTab: (tab: string) => void | Promise<void>;
  triggerRefresh: () => void;
  isReadOnly?: boolean;
}

/** Orden de competencia de la llave (no alfabético). */
const RONDA_LLAVE_ORDEN: Record<string, number> = {
  "32AVOS": 10,
  "16AVOS": 20,
  OCTAVOS: 30,
  CUARTOS: 40,
  SEMIS: 50,
  SEMIFINAL: 50,
  FINAL: 60,
};

const PLAYOFF_ROUNDS = new Set(Object.keys(RONDA_LLAVE_ORDEN));

const isZonaRonda = (ronda?: string | null) => {
  const r = String(ronda || "").toUpperCase();
  if (!r) return false;
  if (PLAYOFF_ROUNDS.has(r)) return false;
  return r.startsWith("ZONA") || r.includes("GRUPO");
};

const normalizarRonda = (ronda?: string | null) =>
  String(ronda || "").toUpperCase().trim();

const prioridadRondaLlave = (ronda?: string | null): number => {
  const r = normalizarRonda(ronda);
  if (isZonaRonda(ronda)) return 0;
  return RONDA_LLAVE_ORDEN[r] ?? 900;
};

const labelRondaLlave = (ronda: string): string => {
  const r = normalizarRonda(ronda);
  switch (r) {
    case "32AVOS":
      return "32avos";
    case "16AVOS":
      return "16avos";
    case "OCTAVOS":
      return "Octavos";
    case "CUARTOS":
      return "Cuartos";
    case "SEMIS":
    case "SEMIFINAL":
      return "Semifinales";
    case "FINAL":
      return "Final";
    default:
      return ronda;
  }
};

/** Sin horario al final; con horario por fecha/hora ascendente. */
const timestampPartido = (p: Partido): number => {
  if (!p.fecha_partido) return Number.MAX_SAFE_INTEGER;
  const ts = Date.parse(p.fecha_partido);
  return Number.isNaN(ts) ? Number.MAX_SAFE_INTEGER : ts;
};

/**
 * Orden estable para resultados:
 * 1) definidos (con ganador) antes que pendientes
 * 2) fase de llave (octavos → … → final) / nombre de zona
 * 3) horario asignado
 * 4) orden de bracket
 * 5) id
 */
const sortPartidosEstable = (list: Partido[]) => {
  return [...list].sort((a, b) => {
    const doneA = a.ganador != null ? 0 : 1;
    const doneB = b.ganador != null ? 0 : 1;
    if (doneA !== doneB) return doneA - doneB;

    const prA = prioridadRondaLlave(a.ronda);
    const prB = prioridadRondaLlave(b.ronda);
    if (prA !== prB) return prA - prB;

    const rondaA = normalizarRonda(a.ronda);
    const rondaB = normalizarRonda(b.ronda);
    if (rondaA !== rondaB) {
      return rondaA.localeCompare(rondaB, undefined, {
        numeric: true,
        sensitivity: "base",
      });
    }

    const tA = timestampPartido(a);
    const tB = timestampPartido(b);
    if (tA !== tB) return tA - tB;

    const ordenA = a.orden ?? 0;
    const ordenB = b.orden ?? 0;
    if (ordenA !== ordenB) return ordenA - ordenB;

    return String(a.id).localeCompare(String(b.id));
  });
};

const agruparPorRondaLlave = (lista: Partido[]) => {
  const map = new Map<string, Partido[]>();
  for (const p of sortPartidosEstable(lista)) {
    const key = normalizarRonda(p.ronda) || "OTRA";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  }
  return Array.from(map.entries())
    .sort(
      ([a], [b]) =>
        prioridadRondaLlave(a) - prioridadRondaLlave(b) ||
        a.localeCompare(b, undefined, { numeric: true }),
    )
    .map(([nombre, items]) => ({
      nombre,
      label: labelRondaLlave(nombre),
      partidos: items,
    }));
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
  const [llavesColapsadas, setLlavesColapsadas] = useState<
    Record<string, boolean>
  >({});
  const [vistaRapida, setVistaRapida] = useState<VistaRapida>("pendientes");

  useEffect(() => {
    if (!torneoId) return;
    TorneosService.getCanchasDisponibilidad(torneoId)
      .then((payload) => {
        const list = Array.isArray(payload)
          ? payload
          : Array.isArray((payload as { data?: unknown })?.data)
            ? (payload as { data: unknown[] }).data
            : [];
        setDisponibilidadesPaso5(list);
      })
      .catch(() => setDisponibilidadesPaso5([]));
  }, [torneoId]);

  const partidosJugables = useMemo(
    () =>
      sortPartidosEstable(
        partidos.filter(
          (p) => p.equipo_a_id && p.equipo_b_id && p.ganador === null,
        ),
      ),
    [partidos],
  );

  const partidosZonaPorDefinir = useMemo(
    () =>
      sortPartidosEstable(
        partidos.filter(
          (p) =>
            isZonaRonda(p.ronda) &&
            (!p.equipo_a_id || !p.equipo_b_id) &&
            p.ganador === null,
        ),
      ),
    [partidos],
  );

  const partidosFinalizados = useMemo(
    () => sortPartidosEstable(partidos.filter((p) => p.ganador !== null)),
    [partidos],
  );

  const {
    gruposZonasPorDefinir,
    gruposZonas,
    partidosLlave,
    gruposZonasFinalizados,
    llaveFinalizados,
    gruposLlavePorRonda,
  } = useMemo(() => {
    const zonasDefMap = new Map<string, Partido[]>();
    const zonasMap = new Map<string, Partido[]>();
    const zonasFinMap = new Map<string, Partido[]>();
    const llave: Partido[] = [];
    const llaveFin: Partido[] = [];

    for (const p of partidosZonaPorDefinir) {
      const key = String(p.ronda);
      if (!zonasDefMap.has(key)) zonasDefMap.set(key, []);
      zonasDefMap.get(key)!.push(p);
    }

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

    const llaveOrdenada = sortPartidosEstable(llave);
    const llaveFinOrdenada = sortPartidosEstable(llaveFin);

    return {
      gruposZonasPorDefinir: sortKeys(Array.from(zonasDefMap.entries())),
      gruposZonas: sortKeys(Array.from(zonasMap.entries())),
      partidosLlave: llaveOrdenada,
      gruposZonasFinalizados: sortKeys(Array.from(zonasFinMap.entries())),
      llaveFinalizados: llaveFinOrdenada,
      gruposLlavePorRonda: agruparPorRondaLlave([
        ...llaveOrdenada,
        ...llaveFinOrdenada,
      ]),
    };
  }, [partidosJugables, partidosFinalizados, partidosZonaPorDefinir]);

  const nombresZonas = useMemo(() => {
    const set = new Set<string>();
    gruposZonasPorDefinir.forEach((g) => set.add(g.nombre));
    gruposZonas.forEach((g) => set.add(g.nombre));
    gruposZonasFinalizados.forEach((g) => set.add(g.nombre));
    return Array.from(set).sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
  }, [gruposZonas, gruposZonasFinalizados, gruposZonasPorDefinir]);

  /** Zonas con partidos pendientes primero; las 100% finalizadas al fondo. */
  const { zonasActivas, zonasCompletas } = useMemo(() => {
    const activas: string[] = [];
    const completas: string[] = [];
    for (const nombre of nombresZonas) {
      const todosZona = partidos.filter(
        (p) => String(p.ronda) === nombre && isZonaRonda(p.ronda),
      );
      if (zonaGrupoCompleta(todosZona)) completas.push(nombre);
      else activas.push(nombre);
    }
    return { zonasActivas: activas, zonasCompletas: completas };
  }, [nombresZonas, partidos]);

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

  const comprimirTodasZonas = () => {
    setZonasColapsadas(
      Object.fromEntries(nombresZonas.map((n) => [n, true])),
    );
  };

  const expandirTodasZonas = () => {
    setZonasColapsadas(
      Object.fromEntries(nombresZonas.map((n) => [n, false])),
    );
  };

  const llaveEstaColapsada = (nombre: string, pendientesCount: number) => {
    if (Object.prototype.hasOwnProperty.call(llavesColapsadas, nombre)) {
      return llavesColapsadas[nombre] === true;
    }
    // Por defecto: rondas sin pendientes arrancan comprimidas
    return pendientesCount === 0;
  };

  const toggleLlave = (nombre: string, pendientesCount: number) => {
    setLlavesColapsadas((prev) => {
      const explicit = Object.prototype.hasOwnProperty.call(prev, nombre);
      const currentlyCollapsed = explicit
        ? prev[nombre] === true
        : pendientesCount === 0;
      return { ...prev, [nombre]: !currentlyCollapsed };
    });
  };

  const comprimirTodasLlaves = () => {
    setLlavesColapsadas(
      Object.fromEntries(
        gruposLlavePorRonda.map((g) => [g.nombre, true]),
      ),
    );
  };

  const expandirTodasLlaves = () => {
    setLlavesColapsadas(
      Object.fromEntries(
        gruposLlavePorRonda.map((g) => [g.nombre, false]),
      ),
    );
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
    const horaCorta = (() => {
      if (!p.fecha_partido) return null;
      try {
        const d = new Date(p.fecha_partido);
        if (Number.isNaN(d.getTime())) return null;
        return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
      } catch {
        return null;
      }
    })();
    return (
      <div
        key={`compact-${p.id}`}
        className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-0 text-[10px] min-w-0"
      >
        <span className="text-sky-400 font-black shrink-0 tabular-nums">
          #{code}
        </span>
        {horaCorta && (
          <span className="text-emerald-400/80 font-bold shrink-0 tabular-nums">
            {horaCorta}
          </span>
        )}
        <span
          className={`truncate font-bold min-w-0 ${done ? "text-gray-500" : "text-white"}`}
        >
          {shortPair(p.equipo_a_j1, p.equipo_a_j2)}
        </span>
        <span className="text-gray-600 shrink-0">vs</span>
        <span
          className={`truncate font-bold min-w-0 ${done ? "text-gray-500" : "text-white"}`}
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
          <div className="flex items-center justify-center self-center">
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
      const apiMsg =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message;
      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "error",
        title: "Error al guardar",
        description: apiMsg || "Error al impactar el marcador.",
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
    const porDefinirRaw =
      gruposZonasPorDefinir.find((g) => g.nombre === nombre)?.partidos || [];
    const pendientesRaw =
      gruposZonas.find((g) => g.nombre === nombre)?.partidos || [];
    const finalizadosRaw =
      gruposZonasFinalizados.find((g) => g.nombre === nombre)?.partidos ||
      [];

    const mostrarPendientes =
      vistaRapida === "todo" || vistaRapida === "pendientes";
    const mostrarFinalizados =
      vistaRapida === "todo" || vistaRapida === "finalizados";

    const porDefinir = mostrarPendientes ? porDefinirRaw : [];
    const pendientes = mostrarPendientes ? pendientesRaw : [];
    const finalizados = mostrarFinalizados ? finalizadosRaw : [];

    // Si el filtro deja la zona vacía, no renderizar
    if (
      porDefinir.length === 0 &&
      pendientes.length === 0 &&
      finalizados.length === 0 &&
      vistaRapida !== "todo"
    ) {
      // Aún mostrar zona si hay datos en el otro bucket? No — ocultar.
      const tieneAlgo =
        (mostrarPendientes &&
          (porDefinirRaw.length > 0 || pendientesRaw.length > 0)) ||
        (mostrarFinalizados && finalizadosRaw.length > 0);
      if (!tieneAlgo) return null;
    }

    const colapsada = zonaEstaColapsada(nombre);
    const todosZona = partidos.filter(
      (p) => String(p.ronda) === nombre && isZonaRonda(p.ronda),
    );
    const totalVisible =
      porDefinir.length + pendientes.length + finalizados.length;
    const resumenPartidos = sortPartidosEstable([
      ...finalizados,
      ...pendientes,
      ...porDefinir,
    ]).slice(0, 6);
    const zonaCerrada = zonaGrupoCompleta(todosZona);

    return (
      <div
        key={nombre}
        className={`bg-[#161616] border rounded-2xl shadow-xl min-w-0 w-full overflow-hidden ${
          zonaCerrada ? "border-white/5 opacity-95" : "border-white/8"
        } ${colapsada ? "p-2.5 sm:p-3" : "p-3 sm:p-5 space-y-4 sm:space-y-5"}`}
      >
        <button
          type="button"
          onClick={() => toggleZona(nombre)}
          className={`w-full flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between cursor-pointer text-left ${
            colapsada ? "" : "border-b border-white/5 pb-3"
          }`}
          aria-expanded={!colapsada}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Trophy className="size-4 text-brand-chartreuse shrink-0" />
            <h4 className="font-extrabold text-white text-sm uppercase tracking-wider truncate">
              {nombre}
            </h4>
            {zonaCerrada && (
              <span className="text-[9px] font-black uppercase tracking-wider text-brand-chartreuse/80 bg-brand-chartreuse/10 border border-brand-chartreuse/20 px-2 py-0.5 rounded-full shrink-0">
                Completa
              </span>
            )}
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
            <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
              {porDefinirRaw.length > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                  {porDefinirRaw.length} por definir
                </span>
              )}
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                {pendientesRaw.length} pend.
              </span>
              <span className="px-1.5 py-0.5 rounded bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/20">
                {finalizadosRaw.length} ok
              </span>
            </div>
            {colapsada ? (
              <ChevronDown className="size-4 text-gray-400 shrink-0" />
            ) : (
              <ChevronUp className="size-4 text-gray-400 shrink-0" />
            )}
          </div>
        </button>

        {colapsada ? (
          <div className="mt-1 rounded-xl bg-[#0d0d0d] border border-white/5 px-2.5 py-1">
            {resumenPartidos.length > 0 ? (
              <>
                {resumenPartidos.map((p) => renderCompactMatchLine(p))}
                {totalVisible > resumenPartidos.length && (
                  <p className="text-[9px] text-gray-500 font-bold py-1.5 text-center">
                    +{totalVisible - resumenPartidos.length} más · tocá el
                    título para expandir
                  </p>
                )}
              </>
            ) : (
              <p className="text-[10px] text-gray-500 text-center py-2">
                Sin partidos en esta vista
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {finalizados.length > 0 && (
              <section className="space-y-3 rounded-2xl border border-brand-chartreuse/20 bg-brand-chartreuse/[0.04] p-2.5 sm:p-4">
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

            {porDefinir.length > 0 && (
              <section className="space-y-3">
                <div className="flex items-center gap-2 border-l-2 border-sky-400/80 pl-3">
                  <p className="text-[11px] font-black text-sky-300 uppercase tracking-wider">
                    Pendientes de fase 1
                  </p>
                  <span className="text-[10px] font-bold text-sky-400/70">
                    ({porDefinir.length})
                  </span>
                </div>
                {porDefinir.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-3 sm:px-4 py-3 text-xs text-sky-200"
                  >
                    Partido #{String(p.orden || "").padStart(2, "0")} ·{" "}
                    {p.estado_partido === "Pendiente Ganadores"
                      ? "Ganador vs Ganador (se habilita al finalizar 1 y 2)"
                      : "Perdedor vs Perdedor (se habilita al finalizar 1 y 2)"}
                  </div>
                ))}
              </section>
            )}

            {pendientes.length === 0 &&
              finalizados.length === 0 &&
              porDefinir.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">
                  Sin partidos en esta zona para la vista seleccionada.
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
  const totalPendientes =
    totalPendientesZonas +
    partidosLlave.length +
    gruposZonasPorDefinir.reduce((acc, g) => acc + g.partidos.length, 0);
  const totalFinalizados = totalFinalizadosZonas + llaveFinalizados.length;
  const totalPartidos = partidos.length;

  const mostrarZonasActivas =
    vistaRapida !== "finalizados" ||
    zonasActivas.some(
      (n) =>
        (gruposZonasFinalizados.find((g) => g.nombre === n)?.partidos.length ??
          0) > 0,
    );

  const VISTAS: { id: VistaRapida; label: string; count: number }[] = [
    { id: "pendientes", label: "Pendientes", count: totalPendientes },
    { id: "finalizados", label: "Finalizados", count: totalFinalizados },
    { id: "todo", label: "Todo", count: totalPartidos },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="sticky top-0 z-20 -mx-1 px-1 pt-1 pb-2 bg-gradient-to-b from-[#0b0b0b] via-[#0b0b0b]/97 to-transparent">
        <header className="rounded-2xl border border-white/10 bg-[#121212] shadow-[0_8px_30px_rgba(0,0,0,0.35)] overflow-hidden">
          {/* Fila superior: título + acciones */}
          <div className="flex items-center justify-between gap-3 px-3.5 sm:px-4 py-3 border-b border-white/5">
            <div className="min-w-0">
              <h3 className="font-extrabold text-white text-base sm:text-lg tracking-tight leading-none">
                Resultados
              </h3>
              <p className="text-[11px] text-gray-500 font-medium mt-1 truncate">
                Carga de marcadores · {totalPartidos} partidos
              </p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={async () => {
                  const { generarPdfHojaRuta } = await import("@/utils/grillaPdf");
                  generarPdfHojaRuta(torneo, partidos);
                }}
                className="inline-flex items-center justify-center gap-1.5 h-9 px-2.5 sm:px-3 rounded-lg bg-white/5 hover:bg-white/10 text-gray-200 font-bold text-[11px] border border-white/10 cursor-pointer transition-colors"
                title="Grilla de partidos para auxiliares de cancha"
              >
                <FileDown className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">Grilla auxiliares</span>
                <span className="sm:hidden">PDF</span>
              </button>
            </div>
          </div>

          {/* Filtros: segmento a ancho completo — acción primaria de la vista */}
          <div
            className="grid grid-cols-3 gap-px bg-white/5"
            role="tablist"
            aria-label="Filtrar resultados"
          >
            {VISTAS.map((v) => {
              const activo = vistaRapida === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={activo}
                  onClick={() => setVistaRapida(v.id)}
                  className={`relative flex flex-col items-center justify-center gap-0.5 py-3 sm:py-3.5 px-2 transition-colors cursor-pointer ${
                    activo
                      ? "bg-[#161616] text-brand-chartreuse"
                      : "bg-[#0e0e0e] text-gray-500 hover:text-gray-300 hover:bg-[#121212]"
                  }`}
                >
                  {activo && (
                    <span
                      aria-hidden
                      className="absolute inset-x-0 top-0 h-0.5 bg-brand-chartreuse"
                    />
                  )}
                  <span
                    className={`text-[11px] sm:text-xs font-black uppercase tracking-wide ${
                      activo ? "text-brand-chartreuse" : "text-inherit"
                    }`}
                  >
                    {v.label}
                  </span>
                  <span
                    className={`text-sm sm:text-base font-black tabular-nums leading-none ${
                      activo ? "text-white" : "text-gray-400"
                    }`}
                  >
                    {v.count}
                  </span>
                </button>
              );
            })}
          </div>
        </header>
      </div>

      {partidos.length === 0 && (
        <div className="bg-brand-card rounded-3xl border border-white/5 p-8 text-center text-gray-400 text-sm font-medium">
          No hay partidos generados en el cuadro para este torneo.
        </div>
      )}

      {/* Prioridad: zonas con partidos en curso */}
      {zonasActivas.length > 0 && mostrarZonasActivas && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div className="min-w-0">
              <h4 className="text-xs font-black text-brand-chartreuse uppercase tracking-widest">
                Fase de zonas · en curso
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5 hidden sm:block">
                Tocá el encabezado de cada zona para ver u ocultar sus partidos.
              </p>
            </div>
            {zonasActivas.length > 1 && (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={comprimirTodasZonas}
                  title="Ocultar el detalle de todas las zonas (solo resumen)"
                  className="inline-flex items-center gap-1 sm:gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl font-bold text-[10px] sm:text-[11px] border border-white/10 cursor-pointer"
                >
                  <FoldVertical className="size-3.5" />
                  <span className="hidden xs:inline sm:inline">Comprimir</span>
                </button>
                <button
                  type="button"
                  onClick={expandirTodasZonas}
                  title="Mostrar el detalle completo de todas las zonas"
                  className="inline-flex items-center gap-1 sm:gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl font-bold text-[10px] sm:text-[11px] border border-white/10 cursor-pointer"
                >
                  <UnfoldVertical className="size-3.5" />
                  <span className="hidden xs:inline sm:inline">Expandir</span>
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:gap-5">
            {zonasActivas.map((nombre) => renderZonaCard(nombre))}
          </div>
        </div>
      )}

      {/* Llave agrupada por ronda (colapsable) */}
      {gruposLlavePorRonda.length > 0 && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div>
              <h4 className="text-xs font-black text-brand-chartreuse uppercase tracking-widest">
                Llave de campeonato
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5 hidden sm:block">
                Tocá el encabezado de cada ronda para comprimir o expandir.
              </p>
            </div>
            {gruposLlavePorRonda.length > 1 && (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={comprimirTodasLlaves}
                  title="Comprimir todas las rondas de llave"
                  className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl font-bold text-[10px] sm:text-[11px] border border-white/10 cursor-pointer"
                >
                  <FoldVertical className="size-3.5" />
                  Comprimir
                </button>
                <button
                  type="button"
                  onClick={expandirTodasLlaves}
                  title="Expandir todas las rondas de llave"
                  className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-300 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl font-bold text-[10px] sm:text-[11px] border border-white/10 cursor-pointer"
                >
                  <UnfoldVertical className="size-3.5" />
                  Expandir
                </button>
              </div>
            )}
          </div>
          <div className="space-y-3 sm:space-y-4">
            {gruposLlavePorRonda.map((grupo) => {
              const pendientesRaw = grupo.partidos.filter((p) => !p.ganador);
              const finalizadosRaw = grupo.partidos.filter((p) =>
                Boolean(p.ganador),
              );
              const mostrarPendientes =
                vistaRapida === "todo" || vistaRapida === "pendientes";
              const mostrarFinalizados =
                vistaRapida === "todo" || vistaRapida === "finalizados";
              const pendientes = mostrarPendientes ? pendientesRaw : [];
              const finalizados = mostrarFinalizados ? finalizadosRaw : [];

              if (pendientes.length === 0 && finalizados.length === 0) {
                return null;
              }

              const colapsada = llaveEstaColapsada(
                grupo.nombre,
                pendientesRaw.length,
              );
              const resumenPartidos = sortPartidosEstable([
                ...finalizados,
                ...pendientes,
              ]).slice(0, 6);
              const totalVisible = pendientes.length + finalizados.length;
              const rondaCerrada =
                pendientesRaw.length === 0 && finalizadosRaw.length > 0;

              return (
                <div
                  key={grupo.nombre}
                  className={`bg-[#161616] border rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden ${
                    rondaCerrada
                      ? "border-white/5 opacity-95"
                      : "border-white/8"
                  } ${colapsada ? "p-2.5 sm:p-3" : "p-3 sm:p-5 space-y-3 sm:space-y-4"}`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      toggleLlave(grupo.nombre, pendientesRaw.length)
                    }
                    className={`w-full flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between cursor-pointer text-left ${
                      colapsada ? "" : "border-b border-white/5 pb-2.5 sm:pb-3"
                    }`}
                    aria-expanded={!colapsada}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Trophy className="size-4 text-brand-chartreuse shrink-0" />
                      <h5 className="font-extrabold text-white text-sm uppercase tracking-wider">
                        {grupo.label}
                      </h5>
                      {rondaCerrada && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-brand-chartreuse/80 bg-brand-chartreuse/10 border border-brand-chartreuse/20 px-2 py-0.5 rounded-full shrink-0">
                          Completa
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20">
                          {pendientesRaw.length} pend.
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-black uppercase bg-brand-chartreuse/10 text-brand-chartreuse border border-brand-chartreuse/20">
                          {finalizadosRaw.length} ok
                        </span>
                      </div>
                      {colapsada ? (
                        <ChevronDown className="size-4 text-gray-400 shrink-0" />
                      ) : (
                        <ChevronUp className="size-4 text-gray-400 shrink-0" />
                      )}
                    </div>
                  </button>

                  {colapsada ? (
                    <div className="mt-1 rounded-xl bg-[#0d0d0d] border border-white/5 px-2.5 py-1">
                      {resumenPartidos.length > 0 ? (
                        <>
                          {resumenPartidos.map((p) =>
                            renderCompactMatchLine(p),
                          )}
                          {totalVisible > resumenPartidos.length && (
                            <p className="text-[9px] text-gray-500 font-bold py-1.5 text-center">
                              +{totalVisible - resumenPartidos.length} más ·
                              tocá el título para expandir
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-[10px] text-gray-500 text-center py-2">
                          Sin partidos en esta vista
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      {finalizados.length > 0 && (
                        <section className="space-y-3 rounded-2xl border border-brand-chartreuse/20 bg-brand-chartreuse/[0.04] p-2.5 sm:p-4">
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

                      {isReadOnly &&
                        pendientes.length > 0 &&
                        finalizados.length === 0 && (
                          <p className="text-xs text-gray-500 text-center py-2">
                            Modo lectura: no hay resultados cargados aún en
                            esta ronda.
                          </p>
                        )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Zonas 100% finalizadas al fondo */}
      {zonasCompletas.length > 0 &&
        (vistaRapida === "todo" || vistaRapida === "finalizados") && (
        <div className="space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div>
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">
                Fase de zonas · finalizadas
              </h4>
              <p className="text-[11px] text-gray-500 mt-0.5 hidden sm:block">
                Comprimidas por defecto. Expandí para revisar marcadores.
              </p>
            </div>
            {zonasCompletas.length > 1 && (
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={comprimirTodasZonas}
                  title="Ocultar el detalle de todas las zonas (solo resumen)"
                  className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-400 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl font-bold text-[10px] sm:text-[11px] border border-white/10 cursor-pointer"
                >
                  <FoldVertical className="size-3.5" />
                  Comprimir
                </button>
                <button
                  type="button"
                  onClick={expandirTodasZonas}
                  title="Mostrar el detalle completo de todas las zonas"
                  className="inline-flex items-center gap-1.5 bg-white/5 hover:bg-white/10 text-gray-400 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl font-bold text-[10px] sm:text-[11px] border border-white/10 cursor-pointer"
                >
                  <UnfoldVertical className="size-3.5" />
                  Expandir
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 sm:gap-5">
            {zonasCompletas.map((nombre) => renderZonaCard(nombre))}
          </div>
        </div>
      )}

      {/* Fallback sin zonas/llave tipados */}
      {!isReadOnly &&
        nombresZonas.length === 0 &&
        partidosLlave.length === 0 &&
        partidosJugables.length > 0 &&
        (vistaRapida === "todo" || vistaRapida === "pendientes") && (
          <div className="bg-[#161616] border border-white/5 rounded-2xl sm:rounded-3xl p-3 sm:p-5 space-y-3 shadow-xl">
            {renderPartidoRows(partidosJugables)}
          </div>
        )}

      <div className="flex flex-col sm:flex-row justify-between gap-3 pt-3 sm:pt-4 border-t border-white/5">
        <button
          type="button"
          onClick={() => setActiveTab("draws")}
          className="bg-white/5 border border-white/10 text-white px-6 py-3 rounded-xl text-xs font-bold cursor-pointer w-full sm:w-auto"
        >
          Atrás
        </button>
        <div className="text-[11px] sm:text-xs text-gray-500 font-semibold flex items-center text-center sm:text-left">
          Al cargar el resultado del último partido de la Final, el torneo pasa
          automáticamente a estado Finalizado.
        </div>
      </div>
    </div>
  );
};

/** @deprecated Preferir PasoResultados */
export const Paso8Arbitraje = PasoResultados;
