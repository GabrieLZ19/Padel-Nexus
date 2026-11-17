import {
  buildZonePairCountsFromZonas,
  isSeedRefValidForZoneComposition,
} from "./fapZoneSeeds.ts";

export type ResumenLlaveZonasPayload = {
  zonas_regeneradas?: string[];
  llave?: {
    semillas_invalidadas?: string[];
    semillas_actualizadas?: string[];
    semillas_pendientes?: string[];
  };
  fixture_reparado?: Array<{ nombre_grupo: string; insertados: number }>;
};

export function formatearResumenLlaveZonas(
  data: ResumenLlaveZonasPayload,
  opciones?: {
    countsByZone?: Map<string, number>;
  },
): string {
  const partes: string[] = [];
  if (data.zonas_regeneradas?.length) {
    partes.push(
      `Fixture recalculado en: ${data.zonas_regeneradas.join(", ")}.`,
    );
  }
  const f = data.fixture_reparado?.filter((z) => z.insertados > 0) ?? [];
  if (f.length) {
    partes.push(
      `Se completaron partidos faltantes en ${f.map((z) => z.nombre_grupo).join(", ")}.`,
    );
  }
  const ll = data.llave;
  if (ll?.semillas_invalidadas?.length) {
    partes.push(
      `Llave: se quitaron plazas que ya no aplican (${ll.semillas_invalidadas.join(", ")}).`,
    );
  }
  if (ll?.semillas_actualizadas?.length) {
    partes.push(`Llave actualizada: ${ll.semillas_actualizadas.join(", ")}.`);
  }
  let pendientes = ll?.semillas_pendientes ?? [];
  const counts = opciones?.countsByZone;
  if (counts) {
    pendientes = pendientes.filter((s) =>
      isSeedRefValidForZoneComposition(s, counts),
    );
  }
  if (pendientes.length) {
    partes.push(`Plazas sin clasificado aún: ${pendientes.join(", ")}.`);
  }
  return partes.length
    ? partes.join(" ")
    : "La disposición de las zonas y los partidos se actualizaron exitosamente.";
}

export function formatearResumenTrasGuardarZonas(
  data: ResumenLlaveZonasPayload,
  zonas: Array<{ nombre: string; parejas: unknown[] }>,
): string {
  return formatearResumenLlaveZonas(data, {
    countsByZone: buildZonePairCountsFromZonas(zonas),
  });
}