import React, { useState, useEffect, useMemo } from "react";
import { useNumeroPaso } from "@/components/torneos/wizard/NumeroPasoContext";
import { TorneosService } from "@/utils/services/torneos";
import { Partido } from "@/utils/types";
import { LiveArbitrajeRow } from "@/components/torneos/LiveArbitrajeRow";
import { Clock, Trophy, ChevronDown, ChevronUp, FileDown, MapPin } from "lucide-react";
import { zonaGrupoCompleta } from "@/utils/clasificacionZonas";
import { canchaAsignadaReal, partidoSinSedeNiHorario } from "@/utils/fiscalPartidos";
import {
  etiquetaRondaLlave,
  ordenRondaLlave,
} from "@/utils/rondasLlave";
import {
  POR_DEFINIR,
  esAlcanceNacional,
  etiquetaParejaVisible,
} from "@/utils/etiquetaPareja";

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
const PLAYOFF_ROUNDS = new Set([
  "32AVOS",
  "16AVOS",
  "PRELIMINARES",
  "PRELIMINAR",
  "OCTAVOS",
  "CUARTOS",
  "SEMIS",
  "SEMIFINAL",
  "SEMIFINALES",
  "FINAL",
]);

const isZonaRonda = (ronda?: string | null) => {
  const r = String(ronda || "").toUpperCase();
  if (!r) return false;
  if (PLAYOFF_ROUNDS.has(r)) return false;
  return r.startsWith("ZONA") || r.includes("GRUPO");
};

const normalizarRonda = (ronda?: string | null) =>
  String(ronda || "").toUpperCase().trim();

const prioridadRondaLlave = (ronda?: string | null): number => {
  if (isZonaRonda(ronda)) return 0;
  return ordenRondaLlave(ronda);
};

const labelRondaLlave = (ronda: string): string => etiquetaRondaLlave(ronda);

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
  const numeroPaso = useNumeroPaso("matches");
  const [guardandoPartidoId, setGuardandoPartidoId] = useState<string | null>(
    null,
  );
  const [zonasColapsadas, setZonasColapsadas] = useState<
    Record<string, boolean>
  >({});
  const [llavesColapsadas, setLlavesColapsadas] = useState<
    Record<string, boolean>
  >({});
  const [vistaRapida, setVistaRapida] = useState<VistaRapida>("pendientes");
  const [filtroGrupo, setFiltroGrupo] = useState("todas");
  const [partidoEnCorreccion, setPartidoEnCorreccion] = useState<string | null>(
    null,
  );

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

  const renderFinishedRow = (p: Partido) => {
    const isGanadorA = p.ganador === p.equipo_a_id;
    const isGanadorB = p.ganador === p.equipo_b_id;
    const meta = formatMatchDateTimeInfo(p.cancha_asignada, p.fecha_partido);
    const sede = canchaAsignadaReal(p.cancha_asignada);
    const hora = (() => {
      if (!p.fecha_partido) return null;
      const d = new Date(p.fecha_partido);
      if (Number.isNaN(d.getTime())) return null;
      return d.toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    })();
    const code = (
      p.orden != null ? String(p.orden).padStart(2, "0") : p.id.slice(0, 4)
    ).toUpperCase();
    const nacional = esAlcanceNacional(torneo?.alcance);
    const etiquetaLado = (side: "a" | "b") =>
      etiquetaParejaVisible({
        j1: side === "a" ? p.equipo_a_j1 : p.equipo_b_j1,
        j2: side === "a" ? p.equipo_a_j2 : p.equipo_b_j2,
        provincia: side === "a" ? p.equipo_a_provincia : p.equipo_b_provincia,
        letra:
          side === "a" ? p.equipo_a_letra_prioridad : p.equipo_b_letra_prioridad,
        denominacion:
          side === "a" ? p.equipo_a_denominacion : p.equipo_b_denominacion,
        nacional,
      }) || POR_DEFINIR;

    if (!isReadOnly && partidoEnCorreccion === p.id) {
      return (
        <div key={p.id}>
          <LiveArbitrajeRow
            partido={p}
            torneo={torneo}
            onSave={handleGuardarResultadoLive}
            isSaving={guardandoPartidoId === p.id}
            onError={showErrorModal}
          />
          <div className="flex justify-end border-b border-white/8 px-3 pb-2">
            <button
              type="button"
              onClick={() => setPartidoEnCorreccion(null)}
              className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-semibold text-gray-200 hover:border-white/30 hover:text-white"
            >
              Cancelar corrección
            </button>
          </div>
        </div>
      );
    }

    const sets = (
      [
        [p.set1_a, p.set1_b],
        [p.set2_a, p.set2_b],
        [p.set3_a, p.set3_b],
      ] as const
    ).filter(([a, b]) => a != null && b != null);

    return (
      <div
        key={p.id}
        className="flex items-center gap-4 border-b border-white/8 px-3 py-3 text-xs"
      >
        <div className="w-44 shrink-0 space-y-1.5">
          <p className="font-black tabular-nums text-sky-400">#{code}</p>
          <p className="flex items-center gap-1.5 text-sm font-black tabular-nums tracking-tight text-white">
            <Clock className="size-3.5 shrink-0 text-green-400" aria-hidden />
            {hora || "Hora a definir"}
          </p>
          <p
            className="flex items-start gap-1.5 font-semibold leading-snug text-green-400"
            title={meta || sede || undefined}
          >
            <MapPin className="mt-0.5 size-3.5 shrink-0 text-green-400" aria-hidden />
            <span className="line-clamp-2">{sede || "Sede a definir"}</span>
          </p>
        </div>
        <div className="min-w-0 flex-1">
          {sets.length === 0 ? (
            <p className="text-right text-xs font-bold text-gray-300">Sin sets</p>
          ) : (
            <div
              className="grid items-center gap-x-1.5 gap-y-0"
              style={{
                gridTemplateColumns: `minmax(0,1fr) repeat(${sets.length}, 3.5rem)`,
              }}
            >
              <span />
              {sets.map((_, index) => (
                <span
                  key={`${p.id}-set-label-${index}`}
                  className="whitespace-nowrap rounded-t-md border border-b-0 border-white/15 bg-white/10 py-1 text-center text-xs font-bold tracking-wide text-brand-ayuda"
                >
                  {index === 2 && p.es_supertiebreak ? "STB" : `Set ${index + 1}`}
                </span>
              ))}
              <p
                className={`truncate text-right font-bold ${
                  isGanadorA ? "text-brand-chartreuse" : "text-white"
                }`}
              >
                {etiquetaLado("a")}
              </p>
              {sets.map(([a], index) => (
                <span
                  key={`${p.id}-set-a-${index}`}
                  className={`border-x border-b border-white/10 bg-white/[0.03] py-1 text-center text-xs font-black tabular-nums ${
                    isGanadorA ? "text-brand-chartreuse" : "text-white"
                  }`}
                >
                  {a}
                </span>
              ))}
              <p
                className={`truncate text-right font-bold ${
                  isGanadorB ? "text-brand-chartreuse" : "text-white"
                }`}
              >
                {etiquetaLado("b")}
              </p>
              {sets.map(([, b], index) => (
                <span
                  key={`${p.id}-set-b-${index}`}
                  className={`rounded-b-md border border-t-0 border-white/10 bg-white/[0.03] py-1 text-center text-xs font-black tabular-nums ${
                    isGanadorB ? "text-brand-chartreuse" : "text-white"
                  }`}
                >
                  {b}
                </span>
              ))}
            </div>
          )}
        </div>
        {!isReadOnly && (
          <button
            type="button"
            onClick={() => setPartidoEnCorreccion(p.id)}
            className="inline-flex h-8 shrink-0 cursor-pointer items-center rounded-lg border border-white/15 bg-white/5 px-3 text-xs font-semibold text-gray-200 hover:border-brand-chartreuse/50 hover:text-brand-chartreuse"
          >
            Corregir resultado
          </button>
        )}
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
      es_lesion?: boolean;
    },
  ) => {
    try {
      setGuardandoPartidoId(partidoId);
      await TorneosService.actualizarResultado(partidoId, {
        ganador_id: ganadorId,
        ...scorePayload,
      });

      setPartidoEnCorreccion(null);
      triggerRefresh();

      setFeedbackModal((prev: any) => ({
        ...prev,
        isOpen: true,
        type: "success",
        title: "¡Marcador guardado!",
        description: "El marcador quedó guardado.",
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
        onSave={handleGuardarResultadoLive}
        isSaving={guardandoPartidoId === partido.id}
        onError={showErrorModal}
      />
    ));

  const renderZonaCard = (nombre: string) => {
    if (filtroGrupo !== "todas" && filtroGrupo !== nombre) return null;

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
    const zonaCerrada = zonaGrupoCompleta(todosZona);

    return (
      <div
        key={nombre}
        className={`min-w-0 w-full overflow-hidden rounded-xl border bg-[#161616] ${
          zonaCerrada ? "border-white/5" : "border-white/8"
        }`}
      >
        <button
          type="button"
          onClick={() => toggleZona(nombre)}
          className="flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 text-left"
          aria-expanded={!colapsada}
        >
          <Trophy className="size-3.5 shrink-0 text-brand-chartreuse" />
          <h4 className="min-w-0 truncate text-xs font-extrabold uppercase tracking-wide text-white">
            {nombre}
          </h4>
          <span className="shrink-0 text-xs font-bold text-amber-300">
            {pendientesRaw.length} pendientes
          </span>
          <span className="shrink-0 text-xs font-bold text-brand-chartreuse">
            {finalizadosRaw.length} finalizados
          </span>
          {zonaCerrada ? (
            <span className="shrink-0 text-xs font-bold uppercase text-brand-chartreuse/80">
              Completa
            </span>
          ) : null}
          <span className="ml-auto inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 text-xs font-semibold text-gray-200">
            {colapsada ? "Mostrar partidos" : "Ocultar partidos"}
            {colapsada ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronUp className="size-3.5" />
            )}
          </span>
        </button>

        {colapsada ? null : (
          <div className="border-t border-white/5">
            {finalizados.map((p) => renderFinishedRow(p))}
            {!isReadOnly ? renderPartidoRows(pendientes) : null}
            {porDefinir.map((p) => (
              <div
                key={p.id}
                className="flex min-h-9 items-center border-b border-white/8 px-2 text-xs text-sky-200"
              >
                Partido #{String(p.orden || "").padStart(2, "0")} ·{" "}
                {p.estado_partido === "Pendiente Ganadores"
                  ? "Ganador vs ganador, se habilita al cerrar los cruces previos"
                  : "Perdedor vs perdedor, se habilita al cerrar los cruces previos"}
              </div>
            ))}
            {pendientes.length === 0 &&
            finalizados.length === 0 &&
            porDefinir.length === 0 ? (
              <p className="px-2 py-2 text-center text-xs text-brand-ayuda">
                Sin partidos en esta zona para la vista seleccionada.
              </p>
            ) : null}
            {isReadOnly &&
            pendientes.length > 0 &&
            finalizados.length === 0 ? (
              <p className="px-2 py-2 text-center text-xs text-brand-ayuda">
                Modo lectura: no hay resultados cargados aún.
              </p>
            ) : null}
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
  const haySinProgramar = partidos.some(partidoSinSedeNiHorario);

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

  const opcionesFiltro = [
    ...nombresZonas.map((nombre) => ({ id: nombre, label: nombre })),
    ...gruposLlavePorRonda.map((grupo) => ({
      id: grupo.nombre,
      label: grupo.label,
    })),
  ];

  return (
    <div className="space-y-3">
      <div className="sticky top-0 z-20 -mx-1 bg-gradient-to-b from-brand-black via-brand-black to-transparent px-1 pb-2 pt-1">
        <header className="rounded-xl border border-white/10 bg-brand-card px-2.5 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="shrink-0 text-sm font-extrabold tracking-tight text-white">
              Paso {numeroPaso}: Resultados
            </h3>
            <label className="sr-only" htmlFor="filtro-zona-ronda">
              Zona o ronda
            </label>
            <select
              id="filtro-zona-ronda"
              value={filtroGrupo}
              onChange={(e) => setFiltroGrupo(e.target.value)}
              className="h-8 min-w-36 cursor-pointer rounded-lg border border-white/10 bg-brand-black px-2 text-xs font-bold text-white outline-none focus:border-brand-chartreuse"
            >
              <option value="todas">Todas las zonas y rondas</option>
              {opcionesFiltro.map((opcion) => (
                <option key={opcion.id} value={opcion.id}>
                  {opcion.label}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-1" role="tablist" aria-label="Filtrar resultados">
              {VISTAS.map((v) => {
                const activo = vistaRapida === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    role="tab"
                    aria-selected={activo}
                    onClick={() => setVistaRapida(v.id)}
                    className={`h-8 cursor-pointer rounded-lg px-2.5 text-xs font-black uppercase ${
                      activo
                        ? "bg-brand-chartreuse text-brand-black"
                        : "bg-white/5 text-gray-300 hover:text-white"
                    }`}
                  >
                    {v.label} {v.count}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={async () => {
                const { generarPdfHojaRuta } = await import("@/utils/grillaPdf");
                generarPdfHojaRuta(torneo, partidos);
              }}
              className="ml-auto inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 text-xs font-bold text-gray-200 hover:bg-white/10"
              title="Grilla de partidos para auxiliares de cancha"
            >
              <FileDown className="size-3.5 shrink-0" />
              <span className="hidden sm:inline">Grilla</span>
            </button>
          </div>
          <p className="mt-1 text-xs font-medium text-brand-ayuda">
            {totalPartidos} partidos
            {haySinProgramar
              ? ". Los que no tienen sede ni horario se definen en el programador."
              : ""}
          </p>
        </header>
      </div>

      {partidos.length === 0 && (
        <div className="bg-brand-card rounded-3xl border border-white/5 p-8 text-center text-gray-400 text-sm font-medium">
          No hay partidos generados en el cuadro para este torneo.
        </div>
      )}

      {/* Prioridad: zonas con partidos en curso */}
      {zonasActivas.length > 0 && mostrarZonasActivas && (
        <div className="flex flex-col gap-2">
          {zonasActivas.map((nombre) => renderZonaCard(nombre))}
        </div>
      )}

      {gruposLlavePorRonda.length > 0 && (
        <div className="flex flex-col gap-2">
          {gruposLlavePorRonda.map((grupo) => {
            if (filtroGrupo !== "todas" && filtroGrupo !== grupo.nombre) {
              return null;
            }
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
            const rondaCerrada =
              pendientesRaw.length === 0 && finalizadosRaw.length > 0;

            return (
              <div
                key={grupo.nombre}
                className={`overflow-hidden rounded-xl border bg-[#161616] ${
                  rondaCerrada ? "border-white/5" : "border-white/8"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    toggleLlave(grupo.nombre, pendientesRaw.length)
                  }
                  className="flex min-h-11 w-full cursor-pointer items-center gap-2 px-3 text-left"
                  aria-expanded={!colapsada}
                >
                  <Trophy className="size-3.5 shrink-0 text-brand-chartreuse" />
                  <h5 className="min-w-0 truncate text-xs font-extrabold uppercase tracking-wide text-white">
                    {grupo.label}
                  </h5>
                  <span className="shrink-0 text-xs font-bold text-amber-300">
                    {pendientesRaw.length} pendientes
                  </span>
                  <span className="shrink-0 text-xs font-bold text-brand-chartreuse">
                    {finalizadosRaw.length} finalizados
                  </span>
                  <span className="ml-auto inline-flex h-7 shrink-0 items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 text-xs font-semibold text-gray-200">
                    {colapsada ? "Mostrar partidos" : "Ocultar partidos"}
                    {colapsada ? (
                      <ChevronDown className="size-3.5" />
                    ) : (
                      <ChevronUp className="size-3.5" />
                    )}
                  </span>
                </button>

                {colapsada ? null : (
                  <div className="border-t border-white/5">
                    {finalizados.map((p) => renderFinishedRow(p))}
                    {!isReadOnly ? renderPartidoRows(pendientes) : null}
                    {isReadOnly &&
                    pendientes.length > 0 &&
                    finalizados.length === 0 ? (
                      <p className="px-2 py-2 text-center text-xs text-brand-ayuda">
                        Modo lectura: no hay resultados cargados aún en esta
                        ronda.
                      </p>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Zonas 100% finalizadas al fondo */}
      {zonasCompletas.length > 0 &&
        (vistaRapida === "todo" || vistaRapida === "finalizados") && (
        <div className="flex flex-col gap-2">
          {zonasCompletas.map((nombre) => renderZonaCard(nombre))}
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
        <div className="text-xs text-brand-ayuda font-semibold flex items-center text-center sm:text-left">
          Al cargar el resultado del último partido de la Final, el torneo pasa
          automáticamente a estado Finalizado.
        </div>
      </div>
    </div>
  );
};

/** @deprecated Preferir PasoResultados */
export const Paso8Arbitraje = PasoResultados;
