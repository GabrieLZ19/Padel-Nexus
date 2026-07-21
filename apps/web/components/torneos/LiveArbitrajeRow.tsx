import { Partido } from "@/utils/types";
import { Loader2, Trophy, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";

export const LiveArbitrajeRow = ({
  partido,
  onSave,
  isSaving,
  onError,
}: {
  partido: Partido;
  onSave: (
    partidoId: string,
    ganadorId: string,
    scorePayload: {
      set1_a: number;
      set1_b: number;
      set2_a: number | null;
      set2_b: number | null;
      set3_a: number | null;
      set3_b: number | null;
      es_supertiebreak: boolean;
      es_wo: boolean;
      es_injustificado_wo: boolean;
    }
  ) => void;
  isSaving: boolean;
  onError: (msg: string) => void;
}) => {
  // Sets scores states
  const [s1A, setS1A] = useState<string>(partido.set1_a !== null && partido.set1_a !== undefined ? String(partido.set1_a) : "");
  const [s1B, setS1B] = useState<string>(partido.set1_b !== null && partido.set1_b !== undefined ? String(partido.set1_b) : "");
  const [s2A, setS2A] = useState<string>((partido as any).set2_a !== null && (partido as any).set2_a !== undefined ? String((partido as any).set2_a) : "");
  const [s2B, setS2B] = useState<string>((partido as any).set2_b !== null && (partido as any).set2_b !== undefined ? String((partido as any).set2_b) : "");
  const [s3A, setS3A] = useState<string>((partido as any).set3_a !== null && (partido as any).set3_a !== undefined ? String((partido as any).set3_a) : "");
  const [s3B, setS3B] = useState<string>((partido as any).set3_b !== null && (partido as any).set3_b !== undefined ? String((partido as any).set3_b) : "");

  // Match options states
  const [esSupertiebreak, setEsSupertiebreak] = useState<boolean>((partido as any).es_supertiebreak || false);
  const [esWo, setEsWo] = useState<boolean>((partido as any).es_wo || false);
  const [esInjustificadoWo, setEsInjustificadoWo] = useState<boolean>((partido as any).es_injustificado_wo || false);
  const [ganadorWo, setGanadorWo] = useState<"A" | "B">("A");

  const cleanName = (name?: string | null) => {
    if (!name) return "";
    let cleaned = name.trim()
      .replace(/^[\s,.\-]+/, "")
      .replace(/[\s,.\-]+$/, "");
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

  // Determinar si los sets previos están completos
  const set1Completado = s1A !== "" && s1B !== "";
  const set2Completado = s2A !== "" && s2B !== "";

  // Determinar ganador por sets (se necesitan 2 sets ganados)
  const getSetsGanados = () => {
    let setsA = 0;
    let setsB = 0;
    
    if (set1Completado) {
      if (Number(s1A) > Number(s1B)) setsA++; else if (Number(s1B) > Number(s1A)) setsB++;
    }
    if (set2Completado) {
      if (Number(s2A) > Number(s2B)) setsA++; else if (Number(s2B) > Number(s2A)) setsB++;
    }
    if (s3A !== "" && s3B !== "") {
      if (Number(s3A) > Number(s3B)) setsA++; else if (Number(s3B) > Number(s3A)) setsB++;
    }

    return { setsA, setsB };
  };

  const { setsA, setsB } = getSetsGanados();
  const requiereTercerSet = set1Completado && set2Completado && setsA === 1 && setsB === 1;

  const handleFinalizar = () => {
    if (esWo) {
      const ganadorId = ganadorWo === "A" ? partido.equipo_a_id : partido.equipo_b_id;
      if (!ganadorId) {
        onError("No se pudo identificar el equipo ganador del W.O.");
        return;
      }
      onSave(partido.id, ganadorId, {
        set1_a: ganadorWo === "A" ? 6 : 0,
        set1_b: ganadorWo === "A" ? 0 : 6,
        set2_a: ganadorWo === "A" ? 6 : 0,
        set2_b: ganadorWo === "A" ? 0 : 6,
        set3_a: null,
        set3_b: null,
        es_supertiebreak: false,
        es_wo: true,
        es_injustificado_wo: esInjustificadoWo,
      });
      return;
    }

    if (!set1Completado || !set2Completado) {
      onError("Debe completar al menos los primeros dos sets.");
      return;
    }

    const n1A = Number(s1A);
    const n1B = Number(s1B);
    const n2A = Number(s2A);
    const n2B = Number(s2B);
    const n3A = s3A !== "" ? Number(s3A) : null;
    const n3B = s3B !== "" ? Number(s3B) : null;

    // Validar ganador de cada set (no puede haber empates en juegos de un set)
    if (n1A === n1B || n2A === n2B || (n3A !== null && n3B !== null && n3A === n3B)) {
      onError("No puede haber empates en los juegos/puntos de un set.");
      return;
    }

    let ganadorId = null;
    if (setsA >= 2) {
      ganadorId = partido.equipo_a_id;
    } else if (setsB >= 2) {
      ganadorId = partido.equipo_b_id;
    }

    if (!ganadorId) {
      onError("No se ha definido un ganador con 2 sets de ventaja.");
      return;
    }

    onSave(partido.id, ganadorId, {
      set1_a: n1A,
      set1_b: n1B,
      set2_a: n2A,
      set2_b: n2B,
      set3_a: n3A,
      set3_b: n3B,
      es_supertiebreak: esSupertiebreak,
      es_wo: false,
      es_injustificado_wo: false,
    });
  };

  return (
    <div className="bg-brand-card border border-white/5 rounded-3xl p-6 space-y-6 shadow-xl transition-all duration-300">
      {/* Ronda y Fecha Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <span className="text-xs text-brand-chartreuse font-extrabold uppercase tracking-widest bg-brand-chartreuse/10 border border-brand-chartreuse/25 px-3 py-1 rounded-full">
            {partido.ronda}
          </span>
          {partido.cancha_asignada && (
            <span className="text-xs text-gray-400 font-bold">
              {partido.cancha_asignada}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4 text-xs">
          <label className="flex items-center gap-1.5 text-gray-400 font-bold cursor-pointer">
            <input
              type="checkbox"
              checked={esWo}
              onChange={(e) => setEsWo(e.target.checked)}
              className="accent-brand-chartreuse rounded"
            />
            Declarar W.O. (Walkover)
          </label>

          {esWo && (
            <label className="flex items-center gap-1.5 text-red-500 font-bold cursor-pointer">
              <input
                type="checkbox"
                checked={esInjustificadoWo}
                onChange={(e) => setEsInjustificadoWo(e.target.checked)}
                className="accent-red-500 rounded"
              />
              Injustificado
            </label>
          )}
        </div>
      </div>

      {esWo ? (
        <div className="bg-[#1e1e1e] p-4 rounded-2xl border border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-yellow-500 text-sm font-semibold">
            <AlertCircle className="size-4 shrink-0" />
            <span>Seleccione quién gana por Walkover (W.O.):</span>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <button
              onClick={() => setGanadorWo("A")}
              className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all ${ganadorWo === "A" ? "bg-brand-chartreuse text-brand-black" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
            >
              {txtA}
            </button>
            <button
              onClick={() => setGanadorWo("B")}
              className={`flex-1 md:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all ${ganadorWo === "B" ? "bg-brand-chartreuse text-brand-black" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
            >
              {txtB}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Fila del Equipo A */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black text-white truncate max-w-xs">
                {txtA}
              </span>
              {setsA >= 2 && (
                <span className="text-[10px] font-black text-brand-chartreuse bg-brand-chartreuse/10 border border-brand-chartreuse/20 px-2 py-0.5 rounded-md uppercase">
                  ✓ Ganador
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-500 font-black mb-1">Set 1</span>
                <input
                  type="number"
                  min="0"
                  value={s1A}
                  onChange={(e) => setS1A(e.target.value)}
                  className="w-12 h-12 bg-brand-input rounded-xl text-center text-white font-black text-lg outline-none border border-white/10 focus:border-brand-chartreuse"
                />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-500 font-black mb-1">Set 2</span>
                <input
                  type="number"
                  min="0"
                  value={s2A}
                  onChange={(e) => setS2A(e.target.value)}
                  className="w-12 h-12 bg-brand-input rounded-xl text-center text-white font-black text-lg outline-none border border-white/10 focus:border-brand-chartreuse"
                />
              </div>
              {(requiereTercerSet || s3A !== "" || s3B !== "") && (
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-brand-chartreuse font-black mb-1">Set 3</span>
                  <input
                    type="number"
                    min="0"
                    value={s3A}
                    onChange={(e) => setS3A(e.target.value)}
                    className="w-12 h-12 bg-brand-input rounded-xl text-center text-white font-black text-lg outline-none border border-brand-chartreuse"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Fila del Equipo B */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-sm sm:text-base font-black text-white truncate max-w-xs">
                {txtB}
              </span>
              {setsB >= 2 && (
                <span className="text-[10px] font-black text-brand-chartreuse bg-brand-chartreuse/10 border border-brand-chartreuse/20 px-2 py-0.5 rounded-md uppercase">
                  ✓ Ganador
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <input
                  type="number"
                  min="0"
                  value={s1B}
                  onChange={(e) => setS1B(e.target.value)}
                  className="w-12 h-12 bg-brand-input rounded-xl text-center text-white font-black text-lg outline-none border border-white/10 focus:border-brand-chartreuse"
                />
              </div>
              <div className="flex flex-col items-center">
                <input
                  type="number"
                  min="0"
                  value={s2B}
                  onChange={(e) => setS2B(e.target.value)}
                  className="w-12 h-12 bg-brand-input rounded-xl text-center text-white font-black text-lg outline-none border border-white/10 focus:border-brand-chartreuse"
                />
              </div>
              {(requiereTercerSet || s3A !== "" || s3B !== "") && (
                <div className="flex flex-col items-center">
                  <input
                    type="number"
                    min="0"
                    value={s3B}
                    onChange={(e) => setS3B(e.target.value)}
                    className="w-12 h-12 bg-brand-input rounded-xl text-center text-white font-black text-lg outline-none border border-brand-chartreuse"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Opción Supertiebreak para el 3er set */}
          {(requiereTercerSet || s3A !== "" || s3B !== "") && (
            <div className="flex justify-end pt-2">
              <label className="flex items-center gap-1.5 text-xs text-gray-400 font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={esSupertiebreak}
                  onChange={(e) => setEsSupertiebreak(e.target.checked)}
                  className="accent-brand-chartreuse rounded"
                />
                El 3er set es un Super Tie-break (definición a 10/11 puntos)
              </label>
            </div>
          )}
        </div>
      )}

      {/* Acciones */}
      <div className="flex justify-end border-t border-white/5 pt-4">
        <button
          onClick={handleFinalizar}
          disabled={isSaving}
          className="bg-brand-chartreuse text-brand-black hover:opacity-90 px-6 py-3.5 rounded-xl text-sm font-black transition-all shadow-[0_5px_20px_rgba(204,255,0,0.2)] active:scale-95 disabled:opacity-40 flex items-center gap-2 cursor-pointer"
        >
          {isSaving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Trophy className="size-4" />
          )}
          Finalizar Partido
        </button>
      </div>
    </div>
  );
};
