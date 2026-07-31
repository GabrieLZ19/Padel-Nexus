import { Partido } from "@/utils/types";
import { Loader2, Trophy, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import CustomDropdown from "@/components/ui/CustomDropdown";
import { TorneosService } from "@/utils/services/torneos";

export const LiveArbitrajeRow = ({
  partido,
  torneo,
  todosLosPartidos = [],
  disponibilidades = [],
  onSave,
  onPartidoUpdated,
  isSaving,
  onError,
}: {
  partido: Partido;
  torneo?: any;
  todosLosPartidos?: Partido[];
  disponibilidades?: any[];
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
    },
  ) => void;
  onPartidoUpdated?: () => void;
  isSaving: boolean;
  onError: (msg: string) => void;
}) => {
  // Extraer configuraciones dinamicas del torneo desde reglas_arbitraje (Paso 7: Cierre)
  const reglasArb = torneo?.reglas_arbitraje || {};
  const esTercerSetCompleto = reglasArb.definicion_tercer_set === "Completo";
  const stbPuntosTarget = Number(
    reglasArb.supertiebreak_puntos ??
      torneo?.stb_puntos ??
      torneo?.puntos_stb ??
      10,
  );
  const stbDiferenciaRequerida = reglasArb.supertiebreak_diferencia !== false;
  // Sets scores states
  const [s1A, setS1A] = useState<string>(
    partido.set1_a !== null && partido.set1_a !== undefined
      ? String(partido.set1_a)
      : "",
  );
  const [s1B, setS1B] = useState<string>(
    partido.set1_b !== null && partido.set1_b !== undefined
      ? String(partido.set1_b)
      : "",
  );
  const [s2A, setS2A] = useState<string>(
    (partido as any).set2_a !== null && (partido as any).set2_a !== undefined
      ? String((partido as any).set2_a)
      : "",
  );
  const [s2B, setS2B] = useState<string>(
    (partido as any).set2_b !== null && (partido as any).set2_b !== undefined
      ? String((partido as any).set2_b)
      : "",
  );
  const [s3A, setS3A] = useState<string>(
    (partido as any).set3_a !== null && (partido as any).set3_a !== undefined
      ? String((partido as any).set3_a)
      : "",
  );
  const [s3B, setS3B] = useState<string>(
    (partido as any).set3_b !== null && (partido as any).set3_b !== undefined
      ? String((partido as any).set3_b)
      : "",
  );

  const [esSupertiebreak, setEsSupertiebreak] = useState<boolean>(
    (partido as any).es_supertiebreak || false,
  );
  const [esWo, setEsWo] = useState<boolean>((partido as any).es_wo || false);
  const [esInjustificadoWo, setEsInjustificadoWo] = useState<boolean>(
    (partido as any).es_injustificado_wo || false,
  );
  const [ganadorWo, setGanadorWo] = useState<"A" | "B">("A");

  // Helper para nombre completo de la cancha
  const getCanchaFullName = (d: any) => {
    const club = d.clubes?.nombre || d.club_nombre || "";
    const cancha =
      d.canchas?.nombre ||
      d.cancha_nombre ||
      (d.cancha_id ? `Cancha ${d.cancha_id.slice(0, 4)}` : null);
    if (!cancha) return "";
    return club ? `${club} - ${cancha}` : cancha;
  };

  // Cancha, fecha y hora asignadas
  const [canchaEdit, setCanchaEdit] = useState<string>(
    partido.cancha_asignada || "",
  );

  const getInitialFechaHora = (isoStr?: string | null) => {
    if (!isoStr) return { fecha: "", hora: "" };
    try {
      const d = new Date(isoStr);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      return {
        fecha: `${yyyy}-${mm}-${dd}`,
        hora: `${hh}:${mins}:00`,
      };
    } catch {
      return { fecha: "", hora: "" };
    }
  };

  const initialFH = getInitialFechaHora((partido as any).fecha_partido);
  const [fechaEdit, setFechaEdit] = useState<string>(initialFH.fecha);
  const [horaEdit, setHoraEdit] = useState<string>(initialFH.hora);

  // Calcular slots de cancha + fecha + hora ocupados por OTROS partidos
  const occupiedSlots = new Set<string>();
  todosLosPartidos.forEach((p) => {
    if (p.id === partido.id) return;
    if (p.cancha_asignada && (p as any).fecha_partido) {
      try {
        const d = new Date((p as any).fecha_partido);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mins = String(d.getMinutes()).padStart(2, "0");
        const fStr = `${yyyy}-${mm}-${dd}`;
        const hStr = `${hh}:${mins}:00`;
        occupiedSlots.add(`${p.cancha_asignada}|${fStr}|${hStr}`);
      } catch {}
    }
  });

  // Opciones de Cancha (Filtrar solo canchas con al menos 1 slot disponible u ocupado por este partido)
  const mapCanchas = new Set<string>();
  disponibilidades.forEach((d) => {
    const name = getCanchaFullName(d);
    if (!name) return;

    if (canchaEdit === name) {
      mapCanchas.add(name);
      return;
    }

    const key = `${name}|${d.fecha}|${d.hora_inicio}`;
    if (!occupiedSlots.has(key)) {
      mapCanchas.add(name);
    }
  });
  const canchaOptions = Array.from(mapCanchas).map((c) => ({
    value: c,
    label: c,
  }));

  // Opciones de Fecha para la cancha seleccionada
  const mapFechas = new Set<string>();
  disponibilidades.forEach((d) => {
    const name = getCanchaFullName(d);
    if (!canchaEdit || name === canchaEdit) {
      if (d.fecha) mapFechas.add(d.fecha);
    }
  });

  const formatDateLabel = (fStr: string) => {
    try {
      const [yyyy, mm, dd] = fStr.split("-");
      const dateObj = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      const dayName = dateObj.toLocaleDateString("es-AR", { weekday: "short" });
      const capDay =
        dayName.charAt(0).toUpperCase() + dayName.slice(1).replace(".", "");
      return `${capDay} ${dd}/${mm}/${yyyy}`;
    } catch {
      return fStr;
    }
  };

  const fechaOptions = Array.from(mapFechas)
    .sort()
    .map((f) => ({
      value: f,
      label: formatDateLabel(f),
    }));

  // Opciones de Hora (filtrando los horarios ocupados por otros partidos)
  const mapHoras = new Set<string>();
  disponibilidades.forEach((d) => {
    const name = getCanchaFullName(d);
    if (canchaEdit && name !== canchaEdit) return;
    if (fechaEdit && d.fecha !== fechaEdit) return;
    if (!d.hora_inicio) return;

    const key = `${canchaEdit || name}|${fechaEdit || d.fecha}|${d.hora_inicio}`;
    if (!occupiedSlots.has(key)) {
      mapHoras.add(d.hora_inicio);
    }
  });

  const horaOptions = Array.from(mapHoras)
    .sort()
    .map((h) => ({
      value: h,
      label: `${h.slice(0, 5)} hs`,
    }));

  const handleSelectDateTimeCourt = async (
    newCancha: string,
    newFecha: string,
    newHora: string,
  ) => {
    setCanchaEdit(newCancha);
    setFechaEdit(newFecha);
    setHoraEdit(newHora);

    try {
      let isoStr: string | null = null;
      if (newFecha && newHora) {
        const [yyyy, mm, dd] = newFecha.split("-").map(Number);
        const [hh, mins] = newHora.split(":").map(Number);
        const d = new Date(yyyy, mm - 1, dd, hh, mins, 0);
        isoStr = d.toISOString();
      }
      await TorneosService.actualizarPartido(partido.id, {
        cancha_asignada: newCancha || null,
        fecha_partido: isoStr,
      });
      onPartidoUpdated?.();
    } catch (e) {
      console.error("Error al actualizar partido:", e);
    }
  };

  const cleanName = (name?: string | null) => {
    if (!name) return "";
    let cleaned = name
      .trim()
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

  // Calcular si los primeros 2 sets quedaron empatados 1-1 (lo que HABILITA y REQUIERE el 3er set)
  const gA1 = set1Completado && Number(s1A) > Number(s1B) ? 1 : 0;
  const gB1 = set1Completado && Number(s1B) > Number(s1A) ? 1 : 0;
  const gA2 = set2Completado && Number(s2A) > Number(s2B) ? 1 : 0;
  const gB2 = set2Completado && Number(s2B) > Number(s2A) ? 1 : 0;

  const requiereTercerSet =
    set1Completado && set2Completado && gA1 + gA2 === 1 && gB1 + gB2 === 1;

  // Determinar total de sets ganados incluyendo el 3er set (para definir el ganador)
  const getSetsGanados = () => {
    let setsA = gA1 + gA2;
    let setsB = gB1 + gB2;

    if (requiereTercerSet && s3A !== "" && s3B !== "") {
      if (Number(s3A) > Number(s3B)) setsA++;
      else if (Number(s3B) > Number(s3A)) setsB++;
    }

    return { setsA, setsB };
  };

  const { setsA, setsB } = getSetsGanados();

  const handleFinalizar = () => {
    if (esWo) {
      const ganadorId =
        ganadorWo === "A" ? partido.equipo_a_id : partido.equipo_b_id;
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

    // Helper para validar un set convencional (6 games con diferencia de 2, 7-5 o 7-6)
    const esSetValido = (a: number, b: number) => {
      const maxG = Math.max(a, b);
      const minG = Math.min(a, b);
      const diff = maxG - minG;
      if (maxG < 6) return false;
      if (maxG === 6 && diff >= 2) return true;
      if (maxG === 7 && (diff === 2 || diff === 1)) return true;
      return false;
    };

    if (!esSetValido(n1A, n1B)) {
      onError(
        "El Set 1 es inválido. Debe finalizar 6-0, 6-1, 6-2, 6-3, 6-4, 7-5 o 7-6 (Tie-break).",
      );
      return;
    }

    if (!esSetValido(n2A, n2B)) {
      onError(
        "El Set 2 es inválido. Debe finalizar 6-0, 6-1, 6-2, 6-3, 6-4, 7-5 o 7-6 (Tie-break).",
      );
      return;
    }

    // Si un equipo ya ganó 2-0 los primeros 2 sets, descartar cualquier 3er set cargado por error
    let finalS3A: number | null = null;
    let finalS3B: number | null = null;

    if (requiereTercerSet) {
      if (n3A === null || n3B === null) {
        onError(
          "El partido está empatado 1-1 en sets. Debe ingresar el resultado del Set 3.",
        );
        return;
      }

      if (esTercerSetCompleto) {
        if (!esSetValido(n3A, n3B)) {
          onError(
            "El Set 3 es un Set Completo. Debe finalizar 6-0, 6-1, 6-2, 6-3, 6-4, 7-5 o 7-6 (Tie-break).",
          );
          return;
        }
      } else {
        const N = stbPuntosTarget;
        const maxPts = Math.max(n3A, n3B);
        const minPts = Math.min(n3A, n3B);
        const diff = maxPts - minPts;

        if (stbDiferenciaRequerida) {
          // Diferencia mínima de 2 puntos siempre requerida
          if (diff < 2) {
            onError(
              `El Super Tie-break a ${N} puntos requiere una diferencia mínima de 2 puntos para ganar.`,
            );
            return;
          }

          // Caso 1: El perdedor no llegó a deuce previo (minPts < N - 1)
          if (minPts < N - 1) {
            if (maxPts !== N) {
              onError(
                `El Super Tie-break a ${N} puntos no puede finalizar ${maxPts}-${minPts}. El marcador correcto era ${N}-${minPts}.`,
              );
              return;
            }
          }
          // Caso 2: Hubo empate previo en N-1 (ej: 1-1 en STB a 2 pts)
          else if (minPts === N - 1) {
            if (maxPts !== N + 1) {
              onError(
                `Al empatar ${N - 1}-${N - 1} en un STB a ${N} puntos, el partido finaliza al alcanzar 2 puntos de ventaja (${N + 1}-${N - 1}).`,
              );
              return;
            }
          }
          // Caso 3: Alargue por deuce sucesivo (minPts >= N)
          else {
            if (diff !== 2) {
              onError(
                `En alargue de Super Tie-break, el partido finaliza inmediatamente al lograr 2 puntos de ventaja (${minPts + 2}-${minPts}).`,
              );
              return;
            }
          }
        } else {
          // Sin diferencia requerida: el primero en alcanzar N puntos gana
          if (maxPts < N) {
            onError(`El Super Tie-break debe alcanzarse a un mínimo de ${N} puntos.`);
            return;
          }
        }
      }
      finalS3A = n3A;
      finalS3B = n3B;
    }

    let ganadorId = null;
    if (setsA >= 2) {
      ganadorId = partido.equipo_a_id;
    } else if (setsB >= 2) {
      ganadorId = partido.equipo_b_id;
    }

    if (!ganadorId) {
      onError("No se ha definido un ganador del partido.");
      return;
    }

    onSave(partido.id, ganadorId, {
      set1_a: n1A,
      set1_b: n1B,
      set2_a: n2A,
      set2_b: n2B,
      set3_a: finalS3A,
      set3_b: finalS3B,
      es_supertiebreak: !esTercerSetCompleto,
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
          <div className="flex flex-wrap items-center gap-2">
            {/* Dropdown Cancha */}
            <CustomDropdown
              value={canchaEdit}
              onChange={(val) => {
                handleSelectDateTimeCourt(val, fechaEdit, horaEdit);
              }}
              options={canchaOptions}
              placeholder={
                canchaOptions.length === 0
                  ? "Sin canchas configuradas"
                  : "Elegir Cancha..."
              }
              disabled={canchaOptions.length === 0}
            />

            {/* Dropdown Fecha */}
            <CustomDropdown
              value={fechaEdit}
              onChange={(val) => {
                handleSelectDateTimeCourt(canchaEdit, val, horaEdit);
              }}
              options={fechaOptions}
              placeholder={
                fechaOptions.length === 0
                  ? "Sin fechas configuradas"
                  : "Elegir Fecha..."
              }
              disabled={fechaOptions.length === 0 || !canchaEdit}
            />

            {/* Dropdown Hora */}
            <CustomDropdown
              value={horaEdit}
              onChange={(val) => {
                handleSelectDateTimeCourt(canchaEdit, fechaEdit, val);
              }}
              options={horaOptions}
              placeholder={
                horaOptions.length === 0
                  ? "Sin horarios disponibles"
                  : "Elegir Hora..."
              }
              disabled={horaOptions.length === 0 || !canchaEdit || !fechaEdit}
            />
          </div>
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
                  GANADOR
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-500 font-black mb-1">
                  Set 1
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={s1A}
                  onChange={(e) =>
                    setS1A(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  className="w-12 h-12 bg-brand-input rounded-xl text-center text-white font-black text-lg outline-none border border-white/10 focus:border-brand-chartreuse"
                />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-500 font-black mb-1">
                  Set 2
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={s2A}
                  onChange={(e) =>
                    setS2A(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  className="w-12 h-12 bg-brand-input rounded-xl text-center text-white font-black text-lg outline-none border border-white/10 focus:border-brand-chartreuse"
                />
              </div>
              {(requiereTercerSet || s3A !== "" || s3B !== "") && (
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-brand-chartreuse font-black mb-1">
                    {esTercerSetCompleto
                      ? "Set 3"
                      : `STB (${stbPuntosTarget} pts)`}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={s3A}
                    onChange={(e) =>
                      setS3A(e.target.value.replace(/[^0-9]/g, ""))
                    }
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
                  GANADOR
                </span>
              )}
            </div>
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-500 font-black mb-1">
                  Set 1
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={s1B}
                  onChange={(e) =>
                    setS1B(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  className="w-12 h-12 bg-brand-input rounded-xl text-center text-white font-black text-lg outline-none border border-white/10 focus:border-brand-chartreuse"
                />
              </div>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-gray-500 font-black mb-1">
                  Set 2
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={s2B}
                  onChange={(e) =>
                    setS2B(e.target.value.replace(/[^0-9]/g, ""))
                  }
                  className="w-12 h-12 bg-brand-input rounded-xl text-center text-white font-black text-lg outline-none border border-white/10 focus:border-brand-chartreuse"
                />
              </div>
              {(requiereTercerSet || s3A !== "" || s3B !== "") && (
                <div className="flex flex-col items-center">
                  <span className="text-[10px] text-brand-chartreuse font-black mb-1">
                    {esTercerSetCompleto
                      ? "Set 3"
                      : `STB (${stbPuntosTarget} pts)`}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={s3B}
                    onChange={(e) =>
                      setS3B(e.target.value.replace(/[^0-9]/g, ""))
                    }
                    className="w-12 h-12 bg-brand-input rounded-xl text-center text-white font-black text-lg outline-none border border-brand-chartreuse"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Aclaración reglamentaria de Super Tie-break o Set Completo */}
          {(requiereTercerSet || s3A !== "" || s3B !== "") && (
            <div className="flex justify-end pt-2">
              <span className="text-xs text-brand-chartreuse/90 font-bold bg-brand-chartreuse/10 border border-brand-chartreuse/20 px-3 py-1 rounded-lg">
                {esTercerSetCompleto
                  ? "El 3er set se define por Set Completo convencional a 6 games."
                  : `El 3er set se define por Super Tie-break a ${stbPuntosTarget} ${stbPuntosTarget === 1 ? "punto" : "puntos"} ${stbDiferenciaRequerida ? "(diferencia mínima de 2 requerida)" : ""}.`}
              </span>
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
