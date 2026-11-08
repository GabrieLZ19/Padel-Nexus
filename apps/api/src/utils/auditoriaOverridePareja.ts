import { supabaseAdmin } from "../config/supabase";
import { numerosVisiblesDePartidos } from "./numerosVisiblesPartido";

export type LadoPartidoEditado = "A" | "B" | "ambos";

export function nombreParejaInscripcion(
  j1?: string | null,
  j2?: string | null,
): string {
  const a = (j1 || "").trim();
  const b = (j2 || "").trim();
  if (a && b && b !== "-") return `${a} / ${b}`;
  if (a) return a;
  return "Sin pareja";
}

export function detectarLadoCambiado(
  prevA: string | null,
  prevB: string | null,
  nextA: string | null,
  nextB: string | null,
): LadoPartidoEditado {
  const cambioA = (prevA || null) !== (nextA || null);
  const cambioB = (prevB || null) !== (nextB || null);
  if (cambioA && cambioB) return "ambos";
  if (cambioA) return "A";
  if (cambioB) return "B";
  return "B";
}

export function etiquetaLadoPartido(lado: LadoPartidoEditado): string {
  if (lado === "A") return "Lado A";
  if (lado === "B") return "Lado B";
  return "Lados A y B";
}

export function construirResumenCambioPareja(input: {
  numeroPartido: number;
  lado: LadoPartidoEditado;
  nombreAntesA: string;
  nombreAntesB: string;
  nombreNuevoA: string;
  nombreNuevoB: string;
  prevA: string | null;
  prevB: string | null;
  nextA: string | null;
  nextB: string | null;
}): {
  resumen: string;
  valor_anterior: string;
  valor_nuevo: string;
  lado: LadoPartidoEditado;
} {
  const { numeroPartido, lado } = input;
  const etiquetaLado = etiquetaLadoPartido(lado);

  if (lado === "A") {
    const valor_anterior = input.nombreAntesA;
    const valor_nuevo = input.nombreNuevoA;
    return {
      lado,
      valor_anterior,
      valor_nuevo,
      resumen: `Cambio de pareja · Partido #${numeroPartido} · ${etiquetaLado}: antes ${valor_anterior}, ahora ${valor_nuevo}`,
    };
  }

  if (lado === "B") {
    const valor_anterior = input.nombreAntesB;
    const valor_nuevo = input.nombreNuevoB;
    return {
      lado,
      valor_anterior,
      valor_nuevo,
      resumen: `Cambio de pareja · Partido #${numeroPartido} · ${etiquetaLado}: antes ${valor_anterior}, ahora ${valor_nuevo}`,
    };
  }

  const valor_anterior = `A: ${input.nombreAntesA} · B: ${input.nombreAntesB}`;
  const valor_nuevo = `A: ${input.nombreNuevoA} · B: ${input.nombreNuevoB}`;
  return {
    lado,
    valor_anterior,
    valor_nuevo,
    resumen: `Cambio de pareja · Partido #${numeroPartido} · ${etiquetaLado}: antes (${valor_anterior}), ahora (${valor_nuevo})`,
  };
}

async function mapNombresInscripciones(
  ids: string[],
): Promise<Map<string, string>> {
  const unicos = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, string>();
  if (unicos.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from("inscripciones")
    .select("id, jugador1_nombre, jugador2_nombre")
    .in("id", unicos);

  if (error) throw new Error(error.message);

  for (const row of data || []) {
    map.set(
      row.id,
      nombreParejaInscripcion(row.jugador1_nombre, row.jugador2_nombre),
    );
  }

  for (const id of unicos) {
    if (!map.has(id)) map.set(id, "Sin pareja");
  }

  return map;
}

function nombreDesdeMapa(
  map: Map<string, string>,
  id: string | null,
): string {
  if (!id) return "Sin pareja";
  return map.get(id) ?? "Sin pareja";
}

export async function registrarAuditoriaCambioParejaPartido(params: {
  partido: {
    id: string;
    torneo_id: string;
    ronda: string | null;
    orden: number | null;
    equipo_a_id: string | null;
    equipo_b_id: string | null;
  };
  prevA: string | null;
  prevB: string | null;
  nextA: string | null;
  nextB: string | null;
  motivo: string;
  adminId: string;
}): Promise<void> {
  const { partido, prevA, prevB, nextA, nextB, motivo, adminId } = params;

  const { data: todosPartidos, error: errPartidos } = await supabaseAdmin
    .from("partidos")
    .select("id, ronda, orden")
    .eq("torneo_id", partido.torneo_id);

  if (errPartidos) throw new Error(errPartidos.message);

  const visibles = numerosVisiblesDePartidos(todosPartidos || []);
  const numeroPartido =
    visibles.get(partido.id) ?? partido.orden ?? 0;

  const ids = [prevA, prevB, nextA, nextB].filter(
    (id): id is string => Boolean(id),
  );
  const nombres = await mapNombresInscripciones(ids);

  const lado = detectarLadoCambiado(prevA, prevB, nextA, nextB);
  const { resumen, valor_anterior, valor_nuevo } = construirResumenCambioPareja(
    {
      numeroPartido,
      lado,
      nombreAntesA: nombreDesdeMapa(nombres, prevA),
      nombreAntesB: nombreDesdeMapa(nombres, prevB),
      nombreNuevoA: nombreDesdeMapa(nombres, nextA),
      nombreNuevoB: nombreDesdeMapa(nombres, nextB),
      prevA,
      prevB,
      nextA,
      nextB,
    },
  );

  const { error } = await supabaseAdmin.from("logs_auditoria").insert({
    usuario_id_admin: adminId,
    accion: "cambio_pareja_llave",
    entidad_afectada: partido.torneo_id,
    detalles: {
      torneo_id: partido.torneo_id,
      partido_id: partido.id,
      ronda: partido.ronda,
      orden: partido.orden,
      numero_partido: numeroPartido,
      lado,
      motivo: motivo.trim(),
      resumen,
      valor_anterior,
      valor_nuevo,
      equipo_a_id_anterior: prevA,
      equipo_b_id_anterior: prevB,
      equipo_a_id: nextA,
      equipo_b_id: nextB,
    },
  });

  if (error) throw new Error(`No se pudo registrar el cambio en auditoría: ${error.message}`);
}
