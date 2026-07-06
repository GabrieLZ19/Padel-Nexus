import { Partido } from "@/utils/types";
import { Loader2, Play, Trophy } from "lucide-react";
import { useState, useEffect } from "react";

type PadelScore = "0" | "15" | "30" | "40" | "Ad" | string;

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

  useEffect(() => {
    if (gamesA === 6 && gamesB === 6) {
      if (
        ptsA === "15" || ptsA === "30" || ptsA === "40" || ptsA === "Ad" ||
        ptsB === "15" || ptsB === "30" || ptsB === "40" || ptsB === "Ad"
      ) {
        setPtsA("0");
        setPtsB("0");
      }
    }
  }, [gamesA, gamesB, ptsA, ptsB]);

  const cleanName = (name?: string | null) => {
    if (!name) return "";
    let cleaned = name.trim()
      .replace(/^[\s,.\-]+/, "") // remove leading spaces, commas, dots, dashes
      .replace(/[\s,.\-]+$/, ""); // remove trailing spaces, commas, dots, dashes
    if (cleaned === "," || cleaned === "." || cleaned === "") return "";
    return cleaned;
  };

  const j1A = cleanName(partido.equipo_a_j1);
  const j2A = cleanName(partido.equipo_a_j2);
  const txtA = j1A
    ? `${j1A} ${j2A && j2A !== "-" ? `/ ${j2A}` : ""}`
    : "Equipo A";

  const j1B = cleanName(partido.equipo_b_j1);
  const j2B = cleanName(partido.equipo_b_j2);
  const txtB = j1B
    ? `${j1B} ${j2B && j2B !== "-" ? `/ ${j2B}` : ""}`
    : "Equipo B";

  // Lógica de puntuación del Pádel (incluye soporte para Tie-break en 6-6)
  const handlePunto = (scorer: "A" | "B") => {
    // Si estamos en tie-break (6-6)
    if (gamesA === 6 && gamesB === 6) {
      const curA = parseInt(ptsA) || 0;
      const curB = parseInt(ptsB) || 0;
      
      let nextA = curA;
      let nextB = curB;
      
      if (scorer === "A") {
        nextA++;
      } else {
        nextB++;
      }
      
      // Condición de ganar tie-break: >= 7 puntos y diferencia de >= 2
      if (nextA >= 7 && nextA - nextB >= 2) {
        setGamesA(7);
        setPtsA("0");
        setPtsB("0");
      } else if (nextB >= 7 && nextB - nextA >= 2) {
        setGamesB(7);
        setPtsA("0");
        setPtsB("0");
      } else {
        setPtsA(String(nextA));
        setPtsB(String(nextB));
      }
      return;
    }

    const nextScore: Record<string, string> = {
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
    <div className="bg-brand-card border border-white/5 rounded-3xl p-6 flex flex-col xl:flex-row items-center gap-6 shadow-xl transition-all duration-300">
      {/* Indicador de Ronda */}
      <div className="text-center xl:text-left shrink-0">
        <div className="text-[10px] text-brand-chartreuse font-extrabold uppercase tracking-widest bg-brand-chartreuse/10 border border-brand-chartreuse/25 px-3.5 py-1.5 rounded-full inline-block">
          {partido.ronda}
        </div>
      </div>

      {/* Controles del Partido */}
      <div className="flex-1 flex flex-col lg:flex-row items-center justify-between gap-6 w-full">
        {/* EQUIPO A */}
        <div className="flex flex-col items-center lg:items-end flex-1 w-full gap-3">
          <span className="text-base font-black text-white text-center lg:text-right tracking-tight">
            {txtA}
          </span>
          <button
            onClick={() => handlePunto("A")}
            className="bg-brand-chartreuse/10 hover:bg-brand-chartreuse/20 text-brand-chartreuse border border-brand-chartreuse/20 hover:border-brand-chartreuse/40 text-xs font-extrabold px-4.5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm"
          >
            <Play className="size-3.5 text-brand-chartreuse fill-brand-chartreuse" /> Punto Eq. A
          </button>
        </div>

        {/* MARCADOR CENTRAL */}
        <div className="flex items-center gap-4 bg-brand-card p-3.5 rounded-2xl border border-white/5 shrink-0 shadow-inner">
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">
              Juegos
            </span>
            <input
              type="number"
              min="0"
              value={gamesA}
              onChange={(e) => setGamesA(Number(e.target.value))}
              className="w-14 h-14 bg-brand-input rounded-xl text-center text-white font-black text-2xl outline-none border border-white/10 focus:border-brand-chartreuse/60 focus:ring-1 focus:ring-brand-chartreuse/30 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <div className="flex flex-col items-center gap-1 mx-1.5">
            <span className="text-[9px] font-black text-brand-chartreuse uppercase tracking-widest animate-pulse">
              Live
            </span>
            <div className="flex items-center gap-2.5 bg-brand-black px-4.5 py-2.5 rounded-xl border border-brand-chartreuse/20 shadow-sm dark:shadow-none">
              <span
                className={`w-7 text-center text-lg font-extrabold ${ptsA === "Ad" ? "text-brand-chartreuse font-black" : "text-white"}`}
              >
                {ptsA}
              </span>
              <span className="text-gray-600 font-bold text-sm">-</span>
              <span
                className={`w-7 text-center text-lg font-extrabold ${ptsB === "Ad" ? "text-brand-chartreuse font-black" : "text-white"}`}
              >
                {ptsB}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-black text-gray-500 uppercase tracking-wider">
              Juegos
            </span>
            <input
              type="number"
              min="0"
              value={gamesB}
              onChange={(e) => setGamesB(Number(e.target.value))}
              className="w-14 h-14 bg-brand-input rounded-xl text-center text-white font-black text-2xl outline-none border border-white/10 focus:border-brand-chartreuse/60 focus:ring-1 focus:ring-brand-chartreuse/30 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>

        {/* EQUIPO B */}
        <div className="flex flex-col items-center lg:items-start flex-1 w-full gap-3">
          <span className="text-base font-black text-white text-center lg:text-left tracking-tight">
            {txtB}
          </span>
          <button
            onClick={() => handlePunto("B")}
            className="bg-brand-chartreuse/10 hover:bg-brand-chartreuse/20 text-brand-chartreuse border border-brand-chartreuse/20 hover:border-brand-chartreuse/40 text-xs font-extrabold px-4.5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95 shadow-sm"
          >
            <Play className="size-3.5 text-brand-chartreuse fill-brand-chartreuse" /> Punto Eq. B
          </button>
        </div>
      </div>

      {/* BOTÓN FINALIZAR */}
      <button
        onClick={handleFinalizar}
        disabled={isSaving || (gamesA === 0 && gamesB === 0)}
        className="shrink-0 bg-brand-chartreuse text-brand-black hover:opacity-90 px-6 py-4 rounded-xl text-sm font-black transition-all shadow-[0_5px_20px_rgba(204,255,0,0.2)] active:scale-95 disabled:opacity-40 disabled:shadow-none flex items-center gap-2 w-full xl:w-auto justify-center mt-4 xl:mt-0 cursor-pointer"
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
