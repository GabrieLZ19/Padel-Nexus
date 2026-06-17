import { Partido } from "@/utils/types";
import { Loader2, Play, Trophy } from "lucide-react";
import { useState } from "react";

type PadelScore = "0" | "15" | "30" | "40" | "Ad";

export const LiveArbitrajeRow = ({
  partido,
  onSave,
  isSaving,
  onError,
}: {
  partido: Partido;
  onSave: (
    partidoId: string,
    setA: number,
    setB: number,
    ganadorId: string,
  ) => void;
  isSaving: boolean;
  onError: (msg: string) => void;
}) => {
  const [gamesA, setGamesA] = useState<number>(partido.set1_a || 0);
  const [gamesB, setGamesB] = useState<number>(partido.set1_b || 0);
  const [ptsA, setPtsA] = useState<PadelScore>("0");
  const [ptsB, setPtsB] = useState<PadelScore>("0");

  const txtA = partido.equipo_a_j1
    ? `${partido.equipo_a_j1} ${partido.equipo_a_j2 && partido.equipo_a_j2 !== "-" ? `/ ${partido.equipo_a_j2}` : ""}`
    : "Equipo A";
  const txtB = partido.equipo_b_j1
    ? `${partido.equipo_b_j1} ${partido.equipo_b_j2 && partido.equipo_b_j2 !== "-" ? `/ ${partido.equipo_b_j2}` : ""}`
    : "Equipo B";

  // Lógica de puntuación del Pádel
  const handlePunto = (scorer: "A" | "B") => {
    const nextScore: Record<PadelScore, PadelScore> = {
      "0": "15",
      "15": "30",
      "30": "40",
      "40": "Ad",
      Ad: "Ad",
    };
    let newA = ptsA;
    let newB = ptsB;
    let gameWon: "A" | "B" | null = null;

    if (scorer === "A") {
      if (ptsA === "40" && ptsB !== "40" && ptsB !== "Ad") gameWon = "A";
      else if (ptsA === "40" && ptsB === "40") newA = "Ad";
      else if (ptsA === "40" && ptsB === "Ad")
        newB = "40"; // Vuelve a Iguales
      else if (ptsA === "Ad") gameWon = "A";
      else newA = nextScore[ptsA];
    } else {
      if (ptsB === "40" && ptsA !== "40" && ptsA !== "Ad") gameWon = "B";
      else if (ptsB === "40" && ptsA === "40") newB = "Ad";
      else if (ptsB === "40" && ptsA === "Ad")
        newA = "40"; // Vuelve a Iguales
      else if (ptsB === "Ad") gameWon = "B";
      else newB = nextScore[ptsB];
    }

    if (gameWon) {
      if (gameWon === "A") setGamesA((g) => g + 1);
      if (gameWon === "B") setGamesB((g) => g + 1);
      setPtsA("0");
      setPtsB("0");
    } else {
      setPtsA(newA);
      setPtsB(newB);
    }
  };

  const handleFinalizar = () => {
    if (gamesA === gamesB) {
      onError("No puede haber un empate para finalizar el partido.");
      return;
    }

    const ganadorId =
      gamesA > gamesB ? partido.equipo_a_id : partido.equipo_b_id;
    if (ganadorId) onSave(partido.id, gamesA, gamesB, ganadorId);
  };

  return (
    <div className="bg-black/40 border border-white/10 rounded-2xl p-5 flex flex-col xl:flex-row items-center gap-6 shadow-lg">
      {/* Indicador de Ronda */}
      <div className="text-center xl:text-left shrink-0">
        <div className="text-[10px] text-padel-4 font-black uppercase tracking-widest bg-padel-4/10 px-3 py-1 rounded-md inline-block">
          {partido.ronda}
        </div>
      </div>

      {/* Controles del Partido */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-between gap-6 w-full">
        {/* EQUIPO A */}
        <div className="flex flex-col items-center lg:items-end flex-1 w-full gap-2">
          <span className="text-sm font-bold text-white text-center lg:text-right">
            {txtA}
          </span>
          <button
            onClick={() => handlePunto("A")}
            className="bg-white/10 hover:bg-white/20 text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Play className="size-3 text-padel-4" /> Punto Eq. A
          </button>
        </div>

        {/* MARCADOR CENTRAL */}
        <div className="flex items-center gap-3 bg-[#111] p-3 rounded-xl border border-white/5 shrink-0">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase">
              Sets
            </span>
            <input
              type="number"
              min="0"
              value={gamesA}
              onChange={(e) => setGamesA(Number(e.target.value))}
              className="w-12 h-12 bg-white/5 rounded-lg text-center text-white font-black text-xl outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-1 focus:ring-padel-4"
            />
          </div>

          <div className="flex flex-col items-center gap-1 mx-2">
            <span className="text-[10px] font-bold text-padel-4 uppercase animate-pulse">
              Live
            </span>
            <div className="flex items-center gap-2 bg-black px-4 py-2 rounded-lg border border-padel-4/30">
              <span
                className={`w-6 text-center font-black ${ptsA === "Ad" ? "text-padel-4" : "text-white"}`}
              >
                {ptsA}
              </span>
              <span className="text-gray-600 font-bold">-</span>
              <span
                className={`w-6 text-center font-black ${ptsB === "Ad" ? "text-padel-4" : "text-white"}`}
              >
                {ptsB}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-[10px] font-bold text-gray-500 uppercase">
              Sets
            </span>
            <input
              type="number"
              min="0"
              value={gamesB}
              onChange={(e) => setGamesB(Number(e.target.value))}
              className="w-12 h-12 bg-white/5 rounded-lg text-center text-white font-black text-xl outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-1 focus:ring-padel-4"
            />
          </div>
        </div>

        {/* EQUIPO B */}
        <div className="flex flex-col items-center lg:items-start flex-1 w-full gap-2">
          <span className="text-sm font-bold text-white text-center lg:text-left">
            {txtB}
          </span>
          <button
            onClick={() => handlePunto("B")}
            className="bg-white/10 hover:bg-white/20 text-xs font-bold px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
          >
            <Play className="size-3 text-padel-4" /> Punto Eq. B
          </button>
        </div>
      </div>

      {/* BOTÓN FINALIZAR */}
      <button
        onClick={handleFinalizar}
        disabled={isSaving || (gamesA === 0 && gamesB === 0)}
        className="shrink-0 bg-padel-4 text-[#111] hover:bg-[#b3e600] px-6 py-3.5 rounded-xl text-sm font-black transition-all shadow-[0_0_15px_rgba(204,255,0,0.15)] disabled:opacity-40 disabled:shadow-none flex items-center gap-2 w-full xl:w-auto justify-center mt-4 xl:mt-0"
      >
        {isSaving ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Trophy className="size-4" />
        )}
        Finalizar Partido
      </button>
    </div>
  );
};
