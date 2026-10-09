export const ORDEN_RONDAS_LLAVE = [
  "32AVOS",
  "16AVOS",
  "PRELIMINARES",
  "OCTAVOS",
  "CUARTOS",
  "SEMIS",
  "FINAL",
] as const;

export type LadoLlave = "a" | "b";

export type PartidoEditable = {
  id: string;
  ronda: string;
  orden: number;
  equipoAId: string | null;
  equipoBId: string | null;
  ganador: string | null;
  set1A: number | null;
  set1B: number | null;
};

export type ParchePartido = {
  equipoAId: string | null;
  equipoBId: string | null;
  ganador: string | null;
  set1A: number | null;
  set1B: number | null;
  estado: "Programado" | "Finalizado";
};

export function normalizarRonda(ronda: string): string {
  return ronda.toUpperCase().trim();
}

export function primeraRondaDe(rondas: string[]): string | null {
  const presentes = new Set(rondas.map(normalizarRonda));
  return ORDEN_RONDAS_LLAVE.find((ronda) => presentes.has(ronda)) ?? null;
}

/** Sub-14 Promocional queda por debajo de Sub-14, y Sub-14 por debajo de Sub-16. */
export function rangoMenores(categoria: string): number | null {
  const match = /sub[\s-]*(\d+)/i.exec(categoria.trim());
  if (!match) return null;
  const edad = Number(match[1]);
  if (!Number.isFinite(edad)) return null;
  const promocional = /promocional/i.test(categoria);
  return edad * 2 + (promocional ? 0 : 1);
}

export function esCategoriaMenoresSuperior(
  origen: string,
  destino: string,
): boolean {
  const desde = rangoMenores(origen);
  const hacia = rangoMenores(destino);
  if (desde == null || hacia == null) return false;
  return hacia > desde;
}

export function partidoConResultadoReal(partido: PartidoEditable): boolean {
  const hayMarcador = partido.set1A != null && partido.set1B != null;
  const esMarcadorBye =
    hayMarcador && partido.set1A === 0 && partido.set1B === 0;
  if (hayMarcador && !esMarcadorBye) return true;
  if (
    partido.ganador &&
    partido.equipoAId &&
    partido.equipoBId &&
    !esMarcadorBye
  ) {
    return true;
  }
  return false;
}

export function retiroConBye(
  partido: PartidoEditable,
  lado: LadoLlave,
): ParchePartido {
  if (partidoConResultadoReal(partido)) {
    throw new Error(
      "Ese partido ya tiene resultado. No se puede sacar la pareja.",
    );
  }
  const equipoAId = lado === "a" ? null : partido.equipoAId;
  const equipoBId = lado === "b" ? null : partido.equipoBId;
  const queda = equipoAId || equipoBId;
  if (queda) {
    return {
      equipoAId,
      equipoBId,
      ganador: queda,
      set1A: 0,
      set1B: 0,
      estado: "Finalizado",
    };
  }
  return {
    equipoAId: null,
    equipoBId: null,
    ganador: null,
    set1A: null,
    set1B: null,
    estado: "Programado",
  };
}

/** Quita a la pareja de un partido al que ya había avanzado, sin regalarle el bye al otro lado. */
export function limpiarSlot(
  partido: PartidoEditable,
  lado: LadoLlave,
): ParchePartido {
  if (partidoConResultadoReal(partido)) {
    throw new Error(
      "La pareja ya jugó un partido de la llave. No se puede mover.",
    );
  }
  const saliente = lado === "a" ? partido.equipoAId : partido.equipoBId;
  const equipoAId = lado === "a" ? null : partido.equipoAId;
  const equipoBId = lado === "b" ? null : partido.equipoBId;
  const ganador = partido.ganador === saliente ? null : partido.ganador;
  return {
    equipoAId,
    equipoBId,
    ganador,
    set1A: ganador ? partido.set1A : null,
    set1B: ganador ? partido.set1B : null,
    estado: ganador ? "Finalizado" : "Programado",
  };
}

export function insercionEnBye(
  partido: PartidoEditable,
  ladoVacio: LadoLlave,
  inscripcionId: string,
): ParchePartido {
  if (partidoConResultadoReal(partido)) {
    throw new Error("Ese partido ya tiene resultado.");
  }
  const ocupado = ladoVacio === "a" ? partido.equipoAId : partido.equipoBId;
  if (ocupado) throw new Error("Ese lado de la llave ya está ocupado.");
  const equipoAId = ladoVacio === "a" ? inscripcionId : partido.equipoAId;
  const equipoBId = ladoVacio === "b" ? inscripcionId : partido.equipoBId;
  if (equipoAId && equipoBId) {
    return {
      equipoAId,
      equipoBId,
      ganador: null,
      set1A: null,
      set1B: null,
      estado: "Programado",
    };
  }
  const queda = equipoAId || equipoBId;
  return {
    equipoAId,
    equipoBId,
    ganador: queda,
    set1A: queda ? 0 : null,
    set1B: queda ? 0 : null,
    estado: queda ? "Finalizado" : "Programado",
  };
}

export function estadoTrasAsignar(
  partido: PartidoEditable,
  equipoAId: string | null,
  equipoBId: string | null,
): ParchePartido {
  if (partidoConResultadoReal(partido)) {
    throw new Error(
      "Ese partido ya tiene resultado. No se puede cambiar las parejas.",
    );
  }
  if (equipoAId && equipoBId) {
    return {
      equipoAId,
      equipoBId,
      ganador: null,
      set1A: null,
      set1B: null,
      estado: "Programado",
    };
  }
  const queda = equipoAId || equipoBId;
  if (queda) {
    return {
      equipoAId,
      equipoBId,
      ganador: queda,
      set1A: 0,
      set1B: 0,
      estado: "Finalizado",
    };
  }
  return {
    equipoAId: null,
    equipoBId: null,
    ganador: null,
    set1A: null,
    set1B: null,
    estado: "Programado",
  };
}

export function indiceDestinoAvance(indiceEnRonda: number): {
  indiceHijo: number;
  lado: LadoLlave;
} {
  return {
    indiceHijo: Math.floor(indiceEnRonda / 2),
    lado: indiceEnRonda % 2 === 0 ? "a" : "b",
  };
}

export function puedeOcuparSlot(
  actual: string | null,
  reemplazable: string | null,
): boolean {
  return actual == null || (reemplazable != null && actual === reemplazable);
}

export function byesDeRonda(
  partidos: PartidoEditable[],
  ronda: string,
): { partidoId: string; lado: LadoLlave; rivalId: string }[] {
  return partidos
    .filter(
      (partido) =>
        normalizarRonda(partido.ronda) === ronda &&
        !partidoConResultadoReal(partido),
    )
    .flatMap((partido) => {
      const tieneA = Boolean(partido.equipoAId);
      const tieneB = Boolean(partido.equipoBId);
      if (tieneA === tieneB) return [];
      const lado: LadoLlave = tieneA ? "b" : "a";
      const rivalId = (tieneA ? partido.equipoAId : partido.equipoBId) as string;
      return [{ partidoId: partido.id, lado, rivalId }];
    });
}
