import type { KeyboardEvent } from "react";
import { Partido } from "@/utils/types";
import { PairDisplay, esAlcanceNacional } from "@/components/torneos/PairDisplay";
import { PlayerAvatar } from "@/components/torneos/MatchTeamBox";

export const MatchCard = ({
  partido,
  isInteractive = false,
  isActive = false,
  onEditSelect,
  origenEquipoA,
  origenEquipoB,
  esCabezaSerieA = false,
  esCabezaSerieB = false,
  alcance,
}: {
  partido: Partido;
  isInteractive?: boolean;
  isActive?: boolean;
  onEditSelect?: (partido: Partido) => void;
  origenEquipoA?: string | null;
  origenEquipoB?: string | null;
  esCabezaSerieA?: boolean;
  esCabezaSerieB?: boolean;
  alcance?: string | null;
}) => {
  const isA =
    partido.ganador === partido.equipo_a_id && partido.ganador !== null;
  const isB =
    partido.ganador === partido.equipo_b_id && partido.ganador !== null;
  const finalizado = partido.ganador != null;
  const nacional = esAlcanceNacional(alcance);

  const hasA = Boolean(
    partido.equipo_a_j1 || partido.equipo_a_j2 || partido.equipo_a_id,
  );
  const hasB = Boolean(
    partido.equipo_b_j1 || partido.equipo_b_j2 || partido.equipo_b_id,
  );
  const slotAEsBye = !hasA && hasB && !finalizado;
  const slotBEsBye = !hasB && hasA && !finalizado;

  const formatMeta = () => {
    const parts: string[] = [];
    if (partido.cancha_asignada) parts.push(partido.cancha_asignada);
    if (partido.fecha_partido) {
      try {
        const d = new Date(partido.fecha_partido);
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mins = String(d.getMinutes()).padStart(2, "0");
        parts.push(`${dd}/${mm} · ${hh}:${mins}`);
      } catch {
        /* ignore */
      }
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  };

  const renderEquipo = (
    side: "a" | "b",
    origen?: string | null,
    won?: boolean,
    esCabezaSerie?: boolean,
    esBye?: boolean,
  ) => {
    const j1 = side === "a" ? partido.equipo_a_j1 : partido.equipo_b_j1;
    const j2 = side === "a" ? partido.equipo_a_j2 : partido.equipo_b_j2;
    const avatarJ1 =
      side === "a" ? partido.equipo_a_avatar_j1 : partido.equipo_b_avatar_j1;
    const avatarJ2 =
      side === "a" ? partido.equipo_a_avatar_j2 : partido.equipo_b_avatar_j2;
    const usuarioId =
      side === "a" ? partido.equipo_a_usuario_id : partido.equipo_b_usuario_id;
    const usuario2Id =
      side === "a" ? partido.equipo_a_usuario2_id : partido.equipo_b_usuario2_id;
    const denominacion =
      side === "a" ? partido.equipo_a_denominacion : partido.equipo_b_denominacion;
    const empty = !j1 && !j2;

    return (
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1 min-h-[1rem]">
          {origen ? (
            <span className="text-[9px] font-bold tracking-wide text-brand-chartreuse bg-brand-chartreuse/10 px-1.5 py-0.5 rounded">
              {origen}
            </span>
          ) : null}
          {esCabezaSerie ? (
            <span className="text-[9px] font-bold tracking-wide text-amber-500 bg-amber-400/15 border border-amber-400/30 px-1.5 py-0.5 rounded">
              #1
            </span>
          ) : null}
          {!origen && !esCabezaSerie && empty ? (
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-500">
              {esBye ? "Bye" : "Libre"}
            </span>
          ) : null}
        </div>

        {empty ? (
          <div className="flex items-center gap-2 min-h-[2.25rem]">
            <PlayerAvatar src={null} size="md" />
            <p className="text-[12px] font-medium text-gray-500 italic">
              {esBye ? "Pase directo" : "Esperando rival…"}
            </p>
          </div>
        ) : (
          <PairDisplay
            j1={j1}
            j2={j2}
            avatarJ1={avatarJ1}
            avatarJ2={avatarJ2}
            usuarioId={usuarioId}
            usuario2Id={usuario2Id}
            denominacion={denominacion}
            alcanceNacional={nacional}
            won={won}
            compact
            variant="stacked"
          />
        )}
      </div>
    );
  };

  const renderSets = (
    s1: number | null | undefined,
    s2: number | null | undefined,
    s3: number | null | undefined,
    oppS1: number | null | undefined,
    oppS2: number | null | undefined,
    oppS3: number | null | undefined,
  ) => {
    const cells: Array<[number | null | undefined, number | null | undefined]> =
      [
        [s1, oppS1],
        [s2, oppS2],
        [s3, oppS3],
      ];
    return (
      <div className="flex items-center gap-1 shrink-0 self-center pl-1.5">
        {cells.map(([val, opp], idx) => {
          const has = val != null;
          const setWon = has && opp != null && Number(val) > Number(opp);
          return (
            <span
              key={idx}
              className={`w-7 h-8 sm:w-8 sm:h-9 flex items-center justify-center rounded-md text-[11px] sm:text-xs font-black tabular-nums ${
                !has
                  ? "text-gray-400 bg-transparent"
                  : setWon
                    ? "bg-brand-chartreuse text-brand-black"
                    : "bg-brand-input text-brand-white"
              }`}
            >
              {has ? val : "–"}
            </span>
          );
        })}
      </div>
    );
  };

  const meta = formatMeta();

  const handleCardClick = () => {
    if (isInteractive && onEditSelect) onEditSelect(partido);
  };

  const handleCardKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!isInteractive || !onEditSelect) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onEditSelect(partido);
    }
  };

  return (
    <div
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onClick={isInteractive ? handleCardClick : undefined}
      onKeyDown={isInteractive ? handleCardKeyDown : undefined}
      className={`w-full text-left rounded-2xl border overflow-hidden transition-all bg-brand-card ${
        isInteractive
          ? "cursor-pointer hover:border-brand-chartreuse/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-chartreuse/50"
          : ""
      } ${
        isActive
          ? "border-brand-chartreuse/50 shadow-sm"
          : "border-brand-input"
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-3.5 py-2 bg-brand-input/60 border-b border-brand-input min-h-[2rem]">
        <div className="flex items-center gap-2 min-w-0">
          {partido.es_wo && (
            <span className="text-[9px] font-black text-amber-500 uppercase">
              W.O.
            </span>
          )}
          {finalizado && (
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-wide">
              Finalizado
            </span>
          )}
          {!partido.es_wo && !finalizado && (
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-500">
              {isActive ? "En juego" : "Pendiente"}
            </span>
          )}
        </div>
        {isInteractive && !finalizado && (
          <span className="text-[9px] font-bold text-brand-chartreuse uppercase tracking-wide shrink-0">
            Editar
          </span>
        )}
      </div>

      <div
        className={`flex justify-between items-center gap-2 px-3.5 py-3 border-b border-brand-input min-h-[4.25rem] ${
          isA ? "bg-brand-chartreuse/10" : ""
        }`}
      >
        {renderEquipo("a", origenEquipoA, isA, esCabezaSerieA, slotAEsBye)}
        {renderSets(
          partido.set1_a,
          partido.set2_a,
          partido.set3_a,
          partido.set1_b,
          partido.set2_b,
          partido.set3_b,
        )}
      </div>

      <div
        className={`flex justify-between items-center gap-2 px-3.5 py-3 min-h-[4.25rem] ${
          isB ? "bg-brand-chartreuse/10" : ""
        }`}
      >
        {renderEquipo("b", origenEquipoB, isB, esCabezaSerieB, slotBEsBye)}
        {renderSets(
          partido.set1_b,
          partido.set2_b,
          partido.set3_b,
          partido.set1_a,
          partido.set2_a,
          partido.set3_a,
        )}
      </div>

      {meta && (
        <div className="px-3.5 py-2 border-t border-brand-input bg-brand-input/40">
          <p className="text-[10px] font-semibold text-emerald-600 truncate">
            {meta}
          </p>
        </div>
      )}
    </div>
  );
};
