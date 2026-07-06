import { Partido } from "@/utils/types";

export const MatchCard = ({
  partido,
  isInteractive = false,
  isActive = false,
}: {
  partido: Partido;
  isInteractive?: boolean;
  isActive?: boolean;
}) => {
  const isA =
    partido.ganador === partido.equipo_a_id && partido.ganador !== null;
  const isB =
    partido.ganador === partido.equipo_b_id && partido.ganador !== null;

  const cleanName = (name?: string | null) => {
    if (!name) return "";
    let cleaned = name.trim()
      .replace(/^[\s,.\-]+/, "") // remove leading spaces, commas, dots, dashes
      .replace(/[\s,.\-]+$/, ""); // remove trailing spaces, commas, dots, dashes
    if (cleaned === "," || cleaned === "." || cleaned === "") return "";
    return cleaned;
  };

  const renderEquipo = (j1?: string | null, j2?: string | null) => {
    const c1 = cleanName(j1);
    const c2 = cleanName(j2);
    if (!c1 && !c2) return "Esperando rival...";
    const nombreJ1 = c1 || "Desconocido";
    if (!c2 || c2 === "-") return nombreJ1;
    return `${nombreJ1} / ${c2}`;
  };

  return (
    <div
      className={`bg-[#1a1a1a] border rounded-xl overflow-hidden flex flex-col w-full text-sm shadow-[0_4px_20px_rgba(0,0,0,0.3)] relative z-10 ${
        isActive
          ? "border-brand-chartreuse/50 ring-1 ring-brand-chartreuse/50"
          : "border-white/5"
      } ${isInteractive ? "cursor-pointer hover:border-white/20 transition-colors" : ""}`}
    >
      <div className="flex justify-between items-center p-3 border-b border-white/5 bg-black/20">
        <span
          className={`font-bold truncate pr-2 ${partido.equipo_a_j1 ? "text-white" : "text-gray-600"}`}
        >
          {renderEquipo(partido.equipo_a_j1, partido.equipo_a_j2)}
        </span>
        <span
          className={`w-7 h-7 shrink-0 flex items-center justify-center rounded text-xs font-black ${isA ? "bg-brand-chartreuse text-[#111]" : "bg-white/5 text-gray-400"}`}
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
          className={`w-7 h-7 shrink-0 flex items-center justify-center rounded text-xs font-black ${isB ? "bg-brand-chartreuse text-[#111]" : "bg-white/5 text-gray-400"}`}
        >
          {partido.set1_b ?? "-"}
        </span>
      </div>
    </div>
  );
};
