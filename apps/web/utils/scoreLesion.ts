export interface ParcialLesionInput {
  s1A: number | null;
  s1B: number | null;
  s2A?: number | null;
  s2B?: number | null;
  s3A?: number | null;
  s3B?: number | null;
  retiraLado: "A" | "B";
  esTercerSetCompleto?: boolean;
  stbPuntosTarget?: number;
}

export interface ScoreLesionResultado {
  set1_a: number;
  set1_b: number;
  set2_a: number;
  set2_b: number;
  set3_a: number | null;
  set3_b: number | null;
  ganadorLado: "A" | "B";
}

export function esSetValidoOficial(a: number, b: number): boolean {
  const maxG = Math.max(a, b);
  const minG = Math.min(a, b);
  const diff = maxG - minG;
  if (maxG < 6) return false;
  if (maxG === 6 && diff >= 2) return true;
  if (maxG === 7 && (diff === 2 || diff === 1)) return true;
  return false;
}

function gamesParaCompletarSet(gRetirado: number): number {
  if (gRetirado <= 4) return 6;
  return 7;
}

/**
 * Completa el marcador parcial de un partido cuando una pareja abandona por lesión.
 * Regla: La pareja que se retira mantiene los games ganados hasta el momento del retiro.
 * Los games restantes del set incompleto se otorgan a la otra pareja para cerrarlo (a 6 o 7).
 * Si los sets quedan empatados 1-1, se completa un tercer set a favor de la pareja ganadora (0-6 o 6-0).
 */
export function completarScorePorLesion(
  input: ParcialLesionInput,
): ScoreLesionResultado {
  const { retiraLado, esTercerSetCompleto = true, stbPuntosTarget = 10 } = input;
  const s1A = input.s1A ?? 0;
  const s1B = input.s1B ?? 0;
  const s2A = input.s2A;
  const s2B = input.s2B;
  const s3A = input.s3A;
  const s3B = input.s3B;

  let f1A = s1A;
  let f1B = s1B;
  let f2A = s2A ?? 0;
  let f2B = s2B ?? 0;
  let f3A: number | null = null;
  let f3B: number | null = null;

  let setsA = 0;
  let setsB = 0;

  // 1. Evaluar Set 1
  if (esSetValidoOficial(s1A, s1B)) {
    if (s1A > s1B) setsA++;
    else setsB++;
  } else {
    // La lesión ocurrió durante el Set 1
    if (retiraLado === "A") {
      f1A = s1A;
      f1B = gamesParaCompletarSet(s1A);
      setsB++;
      // Set 2 no se juega y va completo a la pareja que continúa
      f2A = 0;
      f2B = 6;
      setsB++;
    } else {
      f1B = s1B;
      f1A = gamesParaCompletarSet(s1B);
      setsA++;
      // Set 2 no se juega y va completo a la pareja que continúa
      f2A = 6;
      f2B = 0;
      setsA++;
    }
    return {
      set1_a: f1A,
      set1_b: f1B,
      set2_a: f2A,
      set2_b: f2B,
      set3_a: null,
      set3_b: null,
      ganadorLado: retiraLado === "A" ? "B" : "A",
    };
  }

  // 2. Set 1 fue completado. Evaluar Set 2
  const set2Ingresado =
    s2A !== null && s2A !== undefined && s2B !== null && s2B !== undefined;
  const set2Valido = set2Ingresado && esSetValidoOficial(s2A, s2B);

  if (set2Valido) {
    if (s2A > s2B) setsA++;
    else setsB++;
    f2A = s2A;
    f2B = s2B;
  } else {
    // La lesión ocurrió durante el Set 2
    const in2A = s2A ?? 0;
    const in2B = s2B ?? 0;
    if (retiraLado === "A") {
      f2A = in2A;
      f2B = gamesParaCompletarSet(in2A);
      setsB++;
    } else {
      f2B = in2B;
      f2A = gamesParaCompletarSet(in2B);
      setsA++;
    }
  }

  // 3. Evaluar si el partido ya quedó definido (2-0)
  if (setsA >= 2) {
    return {
      set1_a: f1A,
      set1_b: f1B,
      set2_a: f2A,
      set2_b: f2B,
      set3_a: null,
      set3_b: null,
      ganadorLado: "A",
    };
  }
  if (setsB >= 2) {
    return {
      set1_a: f1A,
      set1_b: f1B,
      set2_a: f2A,
      set2_b: f2B,
      set3_a: null,
      set3_b: null,
      ganadorLado: "B",
    };
  }

  // 4. Si quedan empatados 1-1 en sets, se completa el Set 3
  const in3A = s3A ?? 0;
  const in3B = s3B ?? 0;
  const targetSTB = stbPuntosTarget || 10;

  if (retiraLado === "A") {
    f3A = in3A;
    f3B = esTercerSetCompleto ? gamesParaCompletarSet(in3A) : targetSTB;
    setsB++;
  } else {
    f3B = in3B;
    f3A = esTercerSetCompleto ? gamesParaCompletarSet(in3B) : targetSTB;
    setsA++;
  }

  return {
    set1_a: f1A,
    set1_b: f1B,
    set2_a: f2A,
    set2_b: f2B,
    set3_a: f3A,
    set3_b: f3B,
    ganadorLado: retiraLado === "A" ? "B" : "A",
  };
}
