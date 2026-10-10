import {
  codigoRondaPorNumeroFap,
  columnasRondaLlave,
  etiquetaRondaLlave,
} from "./rondasLlave";

/** Medidas del lienzo de la llave FAP. Una columna por ronda. */
export const MEDIDA_LLAVE = {
  cardW: 300,
  colGap: 36,
  joinGutter: 44,
  padX: 12,
  padRight: 32,
  zoomMin: 0.35,
  zoomMax: 1.5,
} as const;

export function anchoColumnaLlave(): number {
  return MEDIDA_LLAVE.cardW + MEDIDA_LLAVE.colGap + MEDIDA_LLAVE.joinGutter;
}

/** Ancho del lienzo con N rondas en columnas. */
export function anchoLienzoLlave(columnas: number): number {
  const cols = Math.max(1, columnas);
  return (
    MEDIDA_LLAVE.padX +
    (cols - 1) * anchoColumnaLlave() +
    MEDIDA_LLAVE.cardW +
    MEDIDA_LLAVE.padRight
  );
}

/**
 * Zoom de apertura para que el lienzo quepa en el ancho disponible.
 * No supera el 100%. El redondeo hacia abajo evita una barra horizontal.
 */
export function zoomAjustadoAlAncho(
  anchoLienzo: number,
  anchoDisponible: number,
): number {
  if (anchoLienzo <= 0) return 1;
  if (anchoDisponible <= 0) return MEDIDA_LLAVE.zoomMin;
  const cabe = Math.min(1, anchoDisponible / anchoLienzo);
  const conPiso = Math.max(MEDIDA_LLAVE.zoomMin, cabe);
  const redondeado = Math.floor(conPiso * 100) / 100;
  return Math.max(MEDIDA_LLAVE.zoomMin, redondeado);
}

export function resumenColumnasLlave(matchNos: number[]): {
  columnas: number;
  ancho: number;
  nombres: string[];
} {
  if (matchNos.length === 0) {
    return { columnas: 0, ancho: 0, nombres: [] };
  }
  const columnas = columnasRondaLlave(matchNos);
  const maxCol = Math.max(0, ...columnas.values());
  const nombres = new Map<number, string>();
  for (const matchNo of matchNos) {
    const col = columnas.get(matchNo) ?? 0;
    if (!nombres.has(col)) {
      nombres.set(col, etiquetaRondaLlave(codigoRondaPorNumeroFap(matchNo)));
    }
  }
  const cantidad = maxCol + 1;
  return {
    columnas: cantidad,
    ancho: anchoLienzoLlave(cantidad),
    nombres: [...nombres.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, nombre]) => nombre),
  };
}
