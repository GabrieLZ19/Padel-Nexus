import { supabaseAdmin } from "../config/supabase";
import { numerosVisiblesDePartidos } from "./numerosVisiblesPartido";

/** Valores históricos de `entidad_afectada` usados en logs del torneo. */
export function referenciasEntidadTorneoEnAuditoria(torneoId: string): string[] {
  const id = String(torneoId || "").trim();
  if (!id) return [];
  return [id, `torneo_id: ${id}`, `torneos_id: ${id}`];
}

export function partidoYaTeniaResultado(
  previo:
    | {
        ganador?: string | null;
        estado_partido?: string | null;
        set1_a?: number | null;
        set1_b?: number | null;
      }
    | null
    | undefined,
): boolean {
  if (!previo) return false;
  if (previo.ganador) return true;
  const estado = String(previo.estado_partido || "").trim().toLowerCase();
  if (estado === "finalizado" || estado === "completado") return true;
  return previo.set1_a != null && previo.set1_b != null;
}

export function dedupeAuditoriaPorId<T extends { id: string | number }>(
  rows: T[],
): T[] {
  const seen = new Set<string>();
  return rows.filter((log) => {
    const logId = String(log.id);
    if (seen.has(logId)) return false;
    seen.add(logId);
    return true;
  });
}

export type MarcadorAuditoria = {
  set1_a?: number | null;
  set1_b?: number | null;
  set2_a?: number | null;
  set2_b?: number | null;
  set3_a?: number | null;
  set3_b?: number | null;
  es_supertiebreak?: boolean;
  es_wo?: boolean;
  es_lesion?: boolean;
};

export function formatearMarcadorAuditoria(marcador: MarcadorAuditoria): string {
  if (marcador.es_wo) return "Walkover";
  if (marcador.es_lesion) return "Lesión";
  const sets: string[] = [];
  if (marcador.set1_a != null && marcador.set1_b != null) {
    sets.push(`${marcador.set1_a}-${marcador.set1_b}`);
  }
  if (marcador.set2_a != null && marcador.set2_b != null) {
    sets.push(`${marcador.set2_a}-${marcador.set2_b}`);
  }
  if (marcador.set3_a != null && marcador.set3_b != null) {
    sets.push(
      marcador.es_supertiebreak
        ? `STB ${marcador.set3_a}-${marcador.set3_b}`
        : `${marcador.set3_a}-${marcador.set3_b}`,
    );
  }
  return sets.length ? sets.join(", ") : "Sin marcador";
}

export function construirResumenCorreccionResultado(input: {
  numeroPartido: number;
  ronda?: string | null;
  valorAnterior: MarcadorAuditoria;
  valorNuevo: MarcadorAuditoria;
}): string {
  const ronda = input.ronda ? ` · ${input.ronda}` : "";
  return `Corrección de resultado · Partido #${input.numeroPartido}${ronda}: antes ${formatearMarcadorAuditoria(input.valorAnterior)}, ahora ${formatearMarcadorAuditoria(input.valorNuevo)}`;
}

const SELECT_AUDITORIA_TORNEO = `
  id,
  accion,
  detalles,
  created_at,
  perfiles!fk_logs_admin(nombre, apellido)
`;

export async function listarAuditoriaTorneo(torneoId: string): Promise<unknown[]> {
  const id = String(torneoId || "").trim();
  if (!id) return [];

  const entidades = referenciasEntidadTorneoEnAuditoria(id);

  const consultas = [
    supabaseAdmin
      .from("logs_auditoria")
      .select(SELECT_AUDITORIA_TORNEO)
      .in("entidad_afectada", entidades)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("logs_auditoria")
      .select(SELECT_AUDITORIA_TORNEO)
      .filter("detalles->>torneo_id", "eq", id)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("logs_auditoria")
      .select(SELECT_AUDITORIA_TORNEO)
      .ilike("entidad_afectada", `%${id}%`)
      .order("created_at", { ascending: false }),
  ];

  const { data: partidosTorneo } = await supabaseAdmin
    .from("partidos")
    .select("id")
    .eq("torneo_id", id);

  const partidoIds = (partidosTorneo || []).map((p) => String(p.id)).filter(Boolean);
  if (partidoIds.length > 0) {
    consultas.push(
      supabaseAdmin
        .from("logs_auditoria")
        .select(SELECT_AUDITORIA_TORNEO)
        .in("detalles->>partido_id", partidoIds)
        .order("created_at", { ascending: false }),
    );
  }

  const resultados = await Promise.all(consultas);
  for (const res of resultados) {
    if (res.error) throw new Error(res.error.message);
  }

  const merged = dedupeAuditoriaPorId(
    resultados.flatMap((res) => (res.data || []) as { id: string | number }[]),
  );

  merged.sort(
    (a, b) =>
      new Date(String((b as { created_at?: string }).created_at)).getTime() -
      new Date(String((a as { created_at?: string }).created_at)).getTime(),
  );

  return merged;
}

export async function numeroVisiblePartidoTorneo(
  torneoId: string,
  partidoId: string,
  ordenFallback?: number | null,
): Promise<number> {
  const { data: todosPartidos, error } = await supabaseAdmin
    .from("partidos")
    .select("id, ronda, orden")
    .eq("torneo_id", torneoId);

  if (error) throw new Error(error.message);

  const visibles = numerosVisiblesDePartidos(todosPartidos || []);
  return visibles.get(partidoId) ?? ordenFallback ?? 0;
}
