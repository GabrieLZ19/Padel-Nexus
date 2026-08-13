import { Partido } from "@/utils/types";
import {
  PlayerAvatar,
  splitPlayerName,
} from "@/components/torneos/MatchTeamBox";

function formatShortName(fullName?: string | null): string {
  const { apellido, nombre } = splitPlayerName(fullName);
  if (!nombre) return apellido;
  const inicial = nombre.trim().charAt(0);
  return inicial ? `${apellido} ${inicial}.` : apellido;
}

function TeamPlayers({
  j1,
  j2,
  avatarJ1,
  avatarJ2,
  won,
}: {
  j1?: string | null;
  j2?: string | null;
  avatarJ1?: string | null;
  avatarJ2?: string | null;
  won?: boolean;
}) {
  const hasJ2 = Boolean(j2 && j2 !== "-");
  const line = hasJ2
    ? `${formatShortName(j1)} / ${formatShortName(j2)}`
    : formatShortName(j1);
  const { apellido: ap1, nombre: nom1 } = splitPlayerName(j1);

  return (
    <div className="flex items-center gap-2.5 min-w-0 flex-1">
      <div className="relative shrink-0 flex items-center">
        <PlayerAvatar src={avatarJ1} size="md" />
        {hasJ2 ? (
          <span className="-ml-2.5 relative z-[1]">
            <PlayerAvatar src={avatarJ2} size="md" />
          </span>
        ) : null}
      </div>
      <div className="min-w-0 leading-tight">
        {hasJ2 ? (
          <p
            className={`text-[12px] sm:text-[13px] font-bold tracking-tight truncate ${
              won ? "text-brand-chartreuse" : "text-white"
            }`}
          >
            {line}
          </p>
        ) : (
          <>
            <p
              className={`text-[13px] font-bold tracking-tight truncate ${
                won ? "text-brand-chartreuse" : "text-white"
              }`}
            >
              {ap1}
            </p>
            {nom1 ? (
              <p className="text-[11px] text-gray-400 truncate font-medium">
                {nom1}
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

export const MatchCard = ({
  partido,
  isInteractive = false,
  isActive = false,
  onEditSelect,
  origenEquipoA,
  origenEquipoB,
  esCabezaSerieA = false,
  esCabezaSerieB = false,
}: {
  partido: Partido;
  isInteractive?: boolean;
  isActive?: boolean;
  onEditSelect?: (partido: Partido) => void;
  origenEquipoA?: string | null;
  origenEquipoB?: string | null;
  esCabezaSerieA?: boolean;
  esCabezaSerieB?: boolean;
}) => {
  const isA =
    partido.ganador === partido.equipo_a_id && partido.ganador !== null;
  const isB =
    partido.ganador === partido.equipo_b_id && partido.ganador !== null;
  const finalizado = partido.ganador != null;

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
    j1?: string | null,
    j2?: string | null,
    avatarJ1?: string | null,
    avatarJ2?: string | null,
    origen?: string | null,
    won?: boolean,
    esCabezaSerie?: boolean,
    esBye?: boolean,
  ) => {
    const empty = !j1 && !j2;

    return (
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1 min-h-[1rem]">
          {origen ? (
            <span className="text-[9px] font-bold tracking-wide text-brand-chartreuse/90 bg-brand-chartreuse/10 px-1.5 py-0.5 rounded">
              {origen}
            </span>
          ) : null}
          {esCabezaSerie ? (
            <span className="text-[9px] font-bold tracking-wide text-amber-300 bg-amber-400/10 border border-amber-400/25 px-1.5 py-0.5 rounded">
              #1
            </span>
          ) : null}
          {!origen && !esCabezaSerie && empty ? (
            <span className="text-[9px] font-bold uppercase tracking-wider text-gray-600">
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
          <TeamPlayers
            j1={j1}
            j2={j2}
            avatarJ1={avatarJ1}
            avatarJ2={avatarJ2}
            won={won}
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
                setWon
                  ? "bg-brand-chartreuse text-brand-black"
                  : has
                    ? "bg-white/10 text-white"
                    : "bg-transparent text-gray-700 border border-white/10"
              }`}
            >
              {has ? String(val) : "·"}
            </span>
          );
        })}
      </div>
    );
  };

  const meta = formatMeta();

  return (
    <button
      type="button"
      disabled={!isInteractive}
      onClick={() => {
        if (isInteractive) onEditSelect?.(partido);
      }}
      className={`text-left bg-[#0e0e0e] border rounded-2xl overflow-hidden flex flex-col w-full relative z-10 transition-all duration-200 ${
        isInteractive
          ? "cursor-pointer border-white/12 hover:border-brand-chartreuse/50 hover:bg-[#131313] hover:-translate-y-0.5 hover:shadow-[0_10px_28px_rgba(0,0,0,0.5),0_0_0_1px_rgba(204,255,0,0.1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-chartreuse/40"
          : isActive && !finalizado
            ? "border-brand-chartreuse/35 cursor-default"
            : "border-white/10 cursor-default"
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-3.5 py-2 bg-black/35 border-b border-white/5 min-h-[2rem]">
        <div className="flex items-center gap-2 min-w-0">
          {partido.es_wo && (
            <span className="text-[9px] font-black text-amber-400 uppercase">
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
          <span className="text-[9px] font-bold text-brand-chartreuse/80 uppercase tracking-wide shrink-0">
            Editar
          </span>
        )}
      </div>

      <div
        className={`flex justify-between items-center gap-2 px-3.5 py-3 border-b border-white/5 min-h-[4.25rem] ${
          isA ? "bg-brand-chartreuse/[0.06]" : ""
        }`}
      >
        {renderEquipo(
          partido.equipo_a_j1,
          partido.equipo_a_j2,
          partido.equipo_a_avatar_j1,
          partido.equipo_a_avatar_j2,
          origenEquipoA,
          isA,
          esCabezaSerieA,
          slotAEsBye,
        )}
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
          isB ? "bg-brand-chartreuse/[0.06]" : ""
        }`}
      >
        {renderEquipo(
          partido.equipo_b_j1,
          partido.equipo_b_j2,
          partido.equipo_b_avatar_j1,
          partido.equipo_b_avatar_j2,
          origenEquipoB,
          isB,
          esCabezaSerieB,
          slotBEsBye,
        )}
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
        <div className="px-3.5 py-2 border-t border-white/5 bg-black/40">
          <p className="text-[10px] font-semibold text-emerald-400/85 truncate">
            {meta}
          </p>
        </div>
      )}
    </button>
  );
};
