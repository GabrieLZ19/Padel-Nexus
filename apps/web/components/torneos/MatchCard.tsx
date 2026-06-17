import { Partido } from "@/utils/types";

export const MatchCard = ({ partido }: { partido: Partido }) => {
  const isA =
    partido.ganador === partido.equipo_a_id && partido.ganador !== null;
  const isB =
    partido.ganador === partido.equipo_b_id && partido.ganador !== null;

  const renderEquipo = (j1: string | null, j2: string | null) => {
    if (!j1 && !j2) return "Esperando rival...";
    const nombreJ1 = j1 || "Desconocido";
    if (!j2 || j2.trim() === "" || j2 === "-") return nombreJ1;
    return `${nombreJ1} / ${j2}`;
  };

  return (
    <div className="bg-[#1a1a1a] border border-white/5 rounded-xl overflow-hidden flex flex-col w-full text-sm shadow-[0_4px_20px_rgba(0,0,0,0.3)] relative z-10">
      <div className="flex justify-between items-center p-3 border-b border-white/5 bg-black/20">
        <span
          className={`font-bold truncate pr-2 ${partido.equipo_a_j1 ? "text-white" : "text-gray-600"}`}
        >
          {renderEquipo(partido.equipo_a_j1, partido.equipo_a_j2)}
        </span>
        <span
          className={`w-7 h-7 shrink-0 flex items-center justify-center rounded text-xs font-black ${isA ? "bg-padel-4 text-[#111]" : "bg-white/5 text-gray-400"}`}
        >
          {partido.set1_a ?? "-"}
        </span>
      </div>
      <div className="flex justify-between items-center p-3 bg-black/20">
        <span
          className={`font-bold truncate pr-2 ${partido.equipo_b_j1 ? "text-white" : "text-gray-600"}`}
        >
          {renderEquipo(partido.equipo_b_j1, partido.equipo_b_j2)}
        </span>
        <span
          className={`w-7 h-7 shrink-0 flex items-center justify-center rounded text-xs font-black ${isB ? "bg-padel-4 text-[#111]" : "bg-white/5 text-gray-400"}`}
        >
          {partido.set1_b ?? "-"}
        </span>
      </div>
    </div>
  );
};
