import { supabaseAdmin } from "../config/supabase";
import { partidoYaFinalizado } from "./programacionZonaLlave";

const MSJ_PROGRAMACION_PUBLICADA =
  "La programación está publicada. Solo podés intercambiar dos parejas entre zonas (mismo cupo en cada zona) conservando horarios, o abrir «Nueva edición» en el programador para otros cambios.";

const MSJ_PAREJA_CON_RESULTADO =
  "No se puede mover una pareja que ya tiene partidos con resultado cargado en esta zona.";

export class ZonasOverrideError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 409) {
    super(message);
    this.name = "ZonasOverrideError";
    this.statusCode = statusCode;
  }
}

export { MSJ_PROGRAMACION_PUBLICADA, MSJ_PAREJA_CON_RESULTADO };

export function partidoTieneResultadoCargado(p: {
  ganador?: string | null;
  estado_partido?: string | null;
  set1_a?: number | null;
  set1_b?: number | null;
}): boolean {
  if (p.ganador) return true;
  if (partidoYaFinalizado(p)) return true;
  if (p.set1_a != null && p.set1_b != null) return true;
  return false;
}

export async function inscripcionesConPartidoConResultado(
  torneoId: string,
  inscripcionIds: string[],
): Promise<string[]> {
  if (inscripcionIds.length === 0) return [];
  const buscados = new Set(inscripcionIds);
  const conResultado = new Set<string>();

  const { data, error } = await supabaseAdmin
    .from("partidos")
    .select(
      "equipo_a_id, equipo_b_id, ganador, estado_partido, set1_a, set1_b",
    )
    .eq("torneo_id", torneoId);

  if (error) {
    throw new Error(`No se pudieron validar partidos de zona: ${error.message}`);
  }

  for (const partido of data || []) {
    if (!partidoTieneResultadoCargado(partido)) continue;
    const a = partido.equipo_a_id ? String(partido.equipo_a_id) : "";
    const b = partido.equipo_b_id ? String(partido.equipo_b_id) : "";
    if (a && buscados.has(a)) conResultado.add(a);
    if (b && buscados.has(b)) conResultado.add(b);
  }

  return [...conResultado];
}

export async function assertInscripcionesSinResultadoEnTorneo(
  torneoId: string,
  inscripcionIds: string[],
): Promise<void> {
  const bloqueadas = await inscripcionesConPartidoConResultado(
    torneoId,
    inscripcionIds,
  );
  if (bloqueadas.length > 0) {
    throw new ZonasOverrideError(MSJ_PAREJA_CON_RESULTADO);
  }
}

export type IntercambioParejasZona = {
  inscripcionA: string;
  inscripcionB: string;
  grupoOrigenA: string;
  grupoOrigenB: string;
};

export type AnalisisCambioZonas = {
  inscripcionesMovidas: string[];
  intercambios: IntercambioParejasZona[];
  cardinalidadPreservada: boolean;
  esSoloIntercambioSimetrico: boolean;
};

export function analizarCambiosZonas(
  zonas: { id: string; parejas: { id: string }[] }[],
  grupoPorInscripcionAntes: Map<string, string>,
  conteoPorGrupoAntes: Map<string, number>,
): AnalisisCambioZonas {
  const grupoPorInscripcionDespues = new Map<string, string>();
  const conteoPorGrupoDespues = new Map<string, number>();

  for (const z of zonas) {
    conteoPorGrupoDespues.set(z.id, z.parejas.length);
    for (const p of z.parejas) {
      grupoPorInscripcionDespues.set(p.id, z.id);
    }
  }

  let cardinalidadPreservada = true;
  for (const z of zonas) {
    const antes = conteoPorGrupoAntes.get(z.id);
    const despues = conteoPorGrupoDespues.get(z.id);
    if (antes !== despues) cardinalidadPreservada = false;
  }

  const inscripcionesMovidas: string[] = [];
  for (const [ins, grupoDespues] of grupoPorInscripcionDespues) {
    const grupoAntes = grupoPorInscripcionAntes.get(ins);
    if (grupoAntes && grupoAntes !== grupoDespues) {
      inscripcionesMovidas.push(ins);
    }
  }

  const intercambios: IntercambioParejasZona[] = [];
  const usados = new Set<string>();
  let esSoloIntercambioSimetrico = inscripcionesMovidas.length > 0;

  for (const id of inscripcionesMovidas) {
    if (usados.has(id)) continue;
    const grupoOrigenA = grupoPorInscripcionAntes.get(id);
    const grupoDestinoA = grupoPorInscripcionDespues.get(id);
    if (!grupoOrigenA || !grupoDestinoA) {
      esSoloIntercambioSimetrico = false;
      continue;
    }

    const parejasCandidatas = inscripcionesMovidas.filter(
      (otro) =>
        otro !== id &&
        !usados.has(otro) &&
        grupoPorInscripcionAntes.get(otro) === grupoDestinoA &&
        grupoPorInscripcionDespues.get(otro) === grupoOrigenA,
    );

    if (parejasCandidatas.length !== 1) {
      esSoloIntercambioSimetrico = false;
      continue;
    }

    const inscripcionB = parejasCandidatas[0];
    intercambios.push({
      inscripcionA: id,
      inscripcionB,
      grupoOrigenA,
      grupoOrigenB: grupoDestinoA,
    });
    usados.add(id);
    usados.add(inscripcionB);
  }

  if (usados.size !== inscripcionesMovidas.length) {
    esSoloIntercambioSimetrico = false;
  }
  if (inscripcionesMovidas.length === 0) {
    esSoloIntercambioSimetrico = false;
  }

  return {
    inscripcionesMovidas,
    intercambios,
    cardinalidadPreservada,
    esSoloIntercambioSimetrico:
      esSoloIntercambioSimetrico && cardinalidadPreservada,
  };
}

export async function reemplazarParejaEnPartidosZona(
  torneoId: string,
  nombreZona: string,
  parejaSale: string,
  parejaEntra: string,
): Promise<number> {
  const { data: partidos, error } = await supabaseAdmin
    .from("partidos")
    .select("id, equipo_a_id, equipo_b_id, ganador")
    .eq("torneo_id", torneoId)
    .eq("ronda", nombreZona);

  if (error) {
    throw new Error(
      `No se pudieron actualizar partidos de ${nombreZona}: ${error.message}`,
    );
  }

  let actualizados = 0;
  for (const partido of partidos || []) {
    const patch: Record<string, string> = {};
    if (partido.equipo_a_id === parejaSale) patch.equipo_a_id = parejaEntra;
    if (partido.equipo_b_id === parejaSale) patch.equipo_b_id = parejaEntra;
    if (partido.ganador === parejaSale) patch.ganador = parejaEntra;
    if (Object.keys(patch).length === 0) continue;

    const { error: errUpd } = await supabaseAdmin
      .from("partidos")
      .update(patch)
      .eq("id", partido.id);
    if (errUpd) {
      throw new Error(
        `No se pudo conservar horarios al intercambiar parejas: ${errUpd.message}`,
      );
    }
    actualizados += 1;
  }
  return actualizados;
}

export async function aplicarIntercambiosPublicadoEnPartidos(
  torneoId: string,
  intercambios: IntercambioParejasZona[],
  nombreGrupoPorId: Map<string, string>,
): Promise<number> {
  let total = 0;
  for (const ic of intercambios) {
    const nombreZonaA = nombreGrupoPorId.get(ic.grupoOrigenA);
    const nombreZonaB = nombreGrupoPorId.get(ic.grupoOrigenB);
    if (!nombreZonaA || !nombreZonaB) {
      throw new ZonasOverrideError(
        "No se encontraron las zonas del intercambio.",
      );
    }
    total += await reemplazarParejaEnPartidosZona(
      torneoId,
      nombreZonaA,
      ic.inscripcionA,
      ic.inscripcionB,
    );
    total += await reemplazarParejaEnPartidosZona(
      torneoId,
      nombreZonaB,
      ic.inscripcionB,
      ic.inscripcionA,
    );
  }
  return total;
}