/**
 * Numeración visible continua (zonas + llave). Alineado con apps/web/utils/rondasLlave.ts.
 */

const ORDEN: Record<string, number> = {
  "32AVOS": 100,
  "16AVOS": 110,
  PRELIMINARES: 110,
  PRELIMINAR: 110,
  OCTAVOS: 120,
  CUARTOS: 130,
  SEMIS: 140,
  SEMIFINAL: 140,
  SEMIFINALES: 140,
  FINAL: 150,
};

function compactar(ronda?: string | null): string {
  return String(ronda || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function esRondaDeZona(ronda?: string | null): boolean {
  return /^ZONA\s+/i.test(String(ronda || "").trim());
}

function ordenRondaLlave(ronda?: string | null): number {
  const raw = String(ronda || "").trim();
  const zona = raw.toUpperCase().match(/^ZONA\s+([A-Z0-9]+)/);
  if (zona) {
    const code = zona[1].charCodeAt(0);
    return code >= 65 && code <= 90 ? code - 65 : 40;
  }
  return ORDEN[compactar(raw)] ?? 200;
}

function ordenarPorRonda(
  aRonda: string,
  aOrden: number,
  bRonda: string,
  bOrden: number,
): number {
  const porRonda = ordenRondaLlave(aRonda) - ordenRondaLlave(bRonda);
  if (porRonda !== 0) return porRonda;
  return aOrden - bOrden;
}

export function numerosVisiblesDePartidos(
  partidos: Array<{
    id: string;
    ronda?: string | null;
    orden?: number | null;
  }>,
  inicioLlave?: number,
): Map<string, number> {
  const map = new Map<string, number>();

  const zonas = partidos
    .filter((p) => esRondaDeZona(p.ronda) && !String(p.id).startsWith("empty-"))
    .sort((a, b) => {
      const porRonda = ordenRondaLlave(a.ronda) - ordenRondaLlave(b.ronda);
      if (porRonda !== 0) return porRonda;
      return (a.orden ?? 0) - (b.orden ?? 0);
    });

  zonas.forEach((partido, index) => {
    map.set(partido.id, index + 1);
  });

  const llave = partidos
    .filter(
      (p) =>
        !esRondaDeZona(p.ronda) &&
        p.orden != null &&
        !String(p.id).startsWith("empty-"),
    )
    .sort((a, b) =>
      ordenarPorRonda(a.ronda || "", a.orden ?? 0, b.ronda || "", b.orden ?? 0),
    );

  const inicio =
    zonas.length > 0
      ? zonas.length + 1
      : Math.max(1, Number(inicioLlave) || 1);
  llave.forEach((partido, index) => {
    map.set(partido.id, inicio + index);
  });

  return map;
}
