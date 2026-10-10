import { Partido } from "@/utils/types";
import { Clock, Loader2, MapPin } from "lucide-react";
import { useState, useEffect } from "react";
import { canchaAsignadaReal } from "@/utils/fiscalPartidos";
import {
  POR_DEFINIR,
  esAlcanceNacional,
  etiquetaParejaVisible,
} from "@/utils/etiquetaPareja";

export const LiveArbitrajeRow = ({
  partido,
  torneo,
  onSave,
  isSaving,
  onError,
}: {
  partido: Partido;
  torneo?: any;
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
      es_lesion: boolean;
    },
  ) => void;
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
  const [esLesion, setEsLesion] = useState<boolean>(
    (partido as any).es_lesion || false,
  );
  const [ganadorWo, setGanadorWo] = useState<"A" | "B">("A");

  const programacionLabel = (() => {
    const parts: string[] = [];
    const cancha = canchaAsignadaReal(partido.cancha_asignada);
    if (cancha) parts.push(cancha);
    if (partido.fecha_partido) {
      try {
        const d = new Date(partido.fecha_partido);
        if (!Number.isNaN(d.getTime())) {
          const fecha = d.toLocaleDateString("es-AR", {
            weekday: "short",
            day: "numeric",
            month: "short",
          });
          const hora = d.toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
          parts.push(fecha);
          parts.push(`${hora} hs`);
        }
      } catch {
        /* ignore */
      }
    }
    return parts.length > 0 ? parts.join(" · ") : null;
  })();

  const set1Completado = s1A !== "" && s1B !== "";
  const set2Completado = s2A !== "" && s2B !== "";

  // Sets ganados en los dos primeros (habilita Set 3 solo si hay 1-1)
  const gA1 = set1Completado && Number(s1A) > Number(s1B) ? 1 : 0;
  const gB1 = set1Completado && Number(s1B) > Number(s1A) ? 1 : 0;
  const gA2 = set2Completado && Number(s2A) > Number(s2B) ? 1 : 0;
  const gB2 = set2Completado && Number(s2B) > Number(s2A) ? 1 : 0;

  const setsTrasDos = { a: gA1 + gA2, b: gB1 + gB2 };
  const requiereTercerSet =
    set1Completado && set2Completado && setsTrasDos.a === 1 && setsTrasDos.b === 1;
  /** Set tradicional (completo): siempre se muestra la columna Set 3. STB: solo si hay 1-1. */
  const mostrarTercerSet = esTercerSetCompleto || requiereTercerSet;
  const tercerSetEditable = requiereTercerSet;

  useEffect(() => {
    // En STB, si el partido queda 2-0, limpiar el 3er set. En tradicional se deja la columna visible.
    if (!esTercerSetCompleto && !requiereTercerSet && (s3A !== "" || s3B !== "")) {
      setS3A("");
      setS3B("");
    }
  }, [esTercerSetCompleto, requiereTercerSet, s3A, s3B]);

  // Determinar total de sets ganados incluyendo el 3er set (para definir el ganador)
  const getSetsGanados = () => {
    let setsA = setsTrasDos.a;
    let setsB = setsTrasDos.b;

    if (requiereTercerSet && s3A !== "" && s3B !== "") {
      if (Number(s3A) > Number(s3B)) setsA++;
      else if (Number(s3B) > Number(s3A)) setsB++;
    }

    return { setsA, setsB };
  };

  const { setsA, setsB } = getSetsGanados();

  const handleFinalizar = () => {
    if (esWo && !esLesion) {
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
        es_injustificado_wo: false,
        es_lesion: false,
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
      es_wo: esWo && esLesion,
      es_injustificado_wo: false,
      es_lesion: esWo && esLesion,
    });
  };

  const horaPartido = (() => {
    if (!partido.fecha_partido) return null;
    const d = new Date(partido.fecha_partido);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  })();
  const sedePartido = canchaAsignadaReal(partido.cancha_asignada);

  const nacional = esAlcanceNacional(torneo?.alcance);
  const etiquetaLado = (side: "a" | "b") =>
    etiquetaParejaVisible({
      j1: side === "a" ? partido.equipo_a_j1 : partido.equipo_b_j1,
      j2: side === "a" ? partido.equipo_a_j2 : partido.equipo_b_j2,
      provincia:
        side === "a" ? partido.equipo_a_provincia : partido.equipo_b_provincia,
      letra:
        side === "a"
          ? partido.equipo_a_letra_prioridad
          : partido.equipo_b_letra_prioridad,
      denominacion:
        side === "a"
          ? partido.equipo_a_denominacion
          : partido.equipo_b_denominacion,
      nacional,
    }) || POR_DEFINIR;

  const codigo = (
    partido.orden != null
      ? String(partido.orden).padStart(2, "0")
      : partido.id.slice(0, 4)
  ).toUpperCase();

  const inputCls =
    "h-8 w-9 rounded-md border border-white/15 bg-[#101010] text-center text-sm font-black tabular-nums text-white outline-none focus:border-brand-chartreuse";

  const casilla = (
    valor: string,
    setValor: (v: string) => void,
    etiqueta: string,
    disabled = false,
  ) => (
    <input
      type="text"
      inputMode="numeric"
      aria-label={etiqueta}
      value={valor}
      disabled={disabled}
      onChange={(e) => setValor(e.target.value.replace(/[^0-9]/g, ""))}
      className={`${inputCls} ${
        disabled ? "cursor-not-allowed border-white/10 opacity-40" : ""
      }`}
    />
  );

  const columnas: {
    id: string;
    label: string;
    valorA: string;
    setA: (v: string) => void;
    valorB: string;
    setB: (v: string) => void;
    disabled?: boolean;
  }[] = [
    {
      id: "1",
      label: "Set 1",
      valorA: s1A,
      setA: setS1A,
      valorB: s1B,
      setB: setS1B,
    },
    {
      id: "2",
      label: "Set 2",
      valorA: s2A,
      setA: setS2A,
      valorB: s2B,
      setB: setS2B,
    },
  ];
  if (mostrarTercerSet) {
    columnas.push({
      id: "3",
      label: esTercerSetCompleto ? "Set 3" : "STB",
      valorA: s3A,
      setA: setS3A,
      valorB: s3B,
      setB: setS3B,
      disabled: !tercerSetEditable,
    });
  }

  return (
    <div className="flex items-center gap-4 border-b border-white/8 bg-[#0a0a0a] px-3 py-3">
      <div className="w-44 shrink-0 space-y-1.5">
        <p className="text-xs font-black tabular-nums text-sky-400">#{codigo}</p>
        <p className="flex items-center gap-1.5 text-sm font-black tabular-nums tracking-tight text-white">
          <Clock className="size-3.5 shrink-0 text-green-400" aria-hidden />
          {horaPartido || "Hora a definir"}
        </p>
        <p
          className="flex items-start gap-1.5 text-xs font-semibold leading-snug text-green-400"
          title={programacionLabel || sedePartido || undefined}
        >
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-green-400" aria-hidden />
          <span className="line-clamp-2">{sedePartido || "Sede a definir"}</span>
        </p>
      </div>

      <div className="min-w-0 flex-1">
        {esWo && !esLesion ? (
          <div className="space-y-1">
            <p className="text-right text-xs font-bold text-amber-300">
              Sin inicio · 6-0 6-0
            </p>
            {(
              [
                ["A", etiquetaLado("a")] as const,
                ["B", etiquetaLado("b")] as const,
              ]
            ).map(([lado, nombre]) => (
              <div key={lado} className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-right text-xs font-bold text-white">
                  {nombre}
                </p>
                <button
                  type="button"
                  onClick={() => setGanadorWo(lado)}
                  className={`h-7 w-24 shrink-0 cursor-pointer rounded-md text-xs font-bold ${
                    ganadorWo === lado
                      ? "bg-brand-chartreuse text-brand-black"
                      : "border border-white/15 text-gray-300"
                  }`}
                >
                  Presente
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="grid items-center gap-x-1.5 gap-y-0"
            style={{
              gridTemplateColumns: `minmax(0,1fr) repeat(${columnas.length}, 3.5rem)`,
            }}
          >
            <span />
            {columnas.map((columna) => (
              <span
                key={`${columna.id}-label`}
                className="whitespace-nowrap rounded-t-md border border-b-0 border-white/15 bg-white/10 py-1 text-center text-xs font-bold tracking-wide text-brand-ayuda"
              >
                {columna.label}
              </span>
            ))}
            <p
              className={`truncate text-right text-xs font-bold ${
                setsA >= 2 ? "text-brand-chartreuse" : "text-white"
              }`}
            >
              {etiquetaLado("a")}
            </p>
            {columnas.map((columna) => (
              <span
                key={`${columna.id}-a`}
                className="flex justify-center border-x border-b border-white/10 bg-white/[0.03] py-1"
              >
                {casilla(
                  columna.valorA,
                  columna.setA,
                  `${columna.label}, ${etiquetaLado("a")}`,
                  columna.disabled,
                )}
              </span>
            ))}
            <p
              className={`truncate text-right text-xs font-bold ${
                setsB >= 2 ? "text-brand-chartreuse" : "text-white"
              }`}
            >
              {etiquetaLado("b")}
            </p>
            {columnas.map((columna) => (
              <span
                key={`${columna.id}-b`}
                className="flex justify-center rounded-b-md border border-t-0 border-white/10 bg-white/[0.03] py-1"
              >
                {casilla(
                  columna.valorB,
                  columna.setB,
                  `${columna.label}, ${etiquetaLado("b")}`,
                  columna.disabled,
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <div className="flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-gray-300">
            <input
              type="checkbox"
              checked={esWo}
              onChange={(e) => {
                setEsWo(e.target.checked);
                if (!e.target.checked) setEsLesion(false);
              }}
              className="accent-brand-chartreuse rounded"
            />
            W.O.
          </label>
          {esWo ? (
            <label
              className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-red-400"
              title="Retiro por lesión: cargá lo jugado y los games que se completan."
            >
              <input
                type="checkbox"
                checked={esLesion}
                onChange={(e) => setEsLesion(e.target.checked)}
                className="accent-red-500 rounded"
              />
              Lesión
            </label>
          ) : null}
        </div>
        <button
          type="button"
          onClick={handleFinalizar}
          disabled={isSaving}
          className="inline-flex h-7 cursor-pointer items-center justify-center gap-1 rounded-md bg-brand-chartreuse px-2.5 text-xs font-black text-brand-black hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Finalizar
        </button>
      </div>
    </div>
  );
};
