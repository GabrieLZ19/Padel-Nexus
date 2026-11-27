import { supabaseAdmin } from "../config/supabase";

/**
 * Sitio público: torneos ocultos solo para quien tiene inscripción vigente o CRM.
 */
export function puedeVerTorneoFueraDelSitioPublico(
  esRolCrm: boolean,
  ocultoEnSitioPublico: boolean,
  inscripto: boolean,
): boolean {
  if (esRolCrm) return true;
  if (!ocultoEnSitioPublico) return true;
  return inscripto;
}

export async function jugadorInscriptoEnTorneo(
  torneoId: string,
  usuarioId: string,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("inscripciones")
    .select("id")
    .eq("torneo_id", torneoId)
    .or(`usuario_id.eq."${usuarioId}",usuario2_id.eq."${usuarioId}"`)
    .limit(1);

  if (error) return false;
  return Boolean(data && data.length > 0);
}