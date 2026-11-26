import { supabaseAdmin } from "../config/supabase";
import { esEmailPlaceholderPlanilla } from "./inscripcionPlanilla";

export type ResumenFusionFichas = {
  inscripciones_movidas: number;
  rankings_fusionados: number;
  licencias_movidas: number;
  reservas_movidas: number;
  origen_id: string;
  destino_id: string;
  origen_eliminado: boolean;
};

/**
 * ENT-45: migra referencias del perfil origen al destino y retira la ficha origen.
 */
export async function fusionarFichasJugador(
  origenId: string,
  destinoId: string,
): Promise<ResumenFusionFichas> {
  if (origenId === destinoId) {
    throw new Error("La ficha origen y destino deben ser distintas.");
  }

  const resumen: ResumenFusionFichas = {
    inscripciones_movidas: 0,
    rankings_fusionados: 0,
    licencias_movidas: 0,
    reservas_movidas: 0,
    origen_id: origenId,
    destino_id: destinoId,
    origen_eliminado: false,
  };

  const { count: asJ1Prev } = await supabaseAdmin
    .from("inscripciones")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", origenId)
    .neq("usuario2_id", destinoId);
  const { error: insA } = await supabaseAdmin
    .from("inscripciones")
    .update({ usuario_id: destinoId })
    .eq("usuario_id", origenId)
    .neq("usuario2_id", destinoId);
  if (insA) throw new Error(`Inscripciones (jugador 1): ${insA.message}`);
  resumen.inscripciones_movidas += asJ1Prev ?? 0;

  const { count: asJ2Prev } = await supabaseAdmin
    .from("inscripciones")
    .select("id", { count: "exact", head: true })
    .eq("usuario2_id", origenId)
    .neq("usuario_id", destinoId);
  const { error: insB } = await supabaseAdmin
    .from("inscripciones")
    .update({ usuario2_id: destinoId })
    .eq("usuario2_id", origenId)
    .neq("usuario_id", destinoId);
  if (insB) throw new Error(`Inscripciones (jugador 2): ${insB.message}`);
  resumen.inscripciones_movidas += asJ2Prev ?? 0;

  const { data: ranksOrigen } = await supabaseAdmin
    .from("rankings")
    .select("id, categoria, puntos, alcance, provincia_jurisdiccion")
    .eq("usuario_id", origenId);

  for (const rO of ranksOrigen || []) {
    const { data: rD } = await supabaseAdmin
      .from("rankings")
      .select("id, puntos")
      .eq("usuario_id", destinoId)
      .eq("categoria", rO.categoria)
      .maybeSingle();

    if (rD?.id) {
      const { error: upRank } = await supabaseAdmin
        .from("rankings")
        .update({ puntos: (rD.puntos || 0) + (rO.puntos || 0) })
        .eq("id", rD.id);
      if (upRank) throw new Error(upRank.message);
      await supabaseAdmin.from("rankings").delete().eq("id", rO.id);
    } else {
      const { error: moveRank } = await supabaseAdmin
        .from("rankings")
        .update({ usuario_id: destinoId })
        .eq("id", rO.id);
      if (moveRank) throw new Error(moveRank.message);
    }
    resumen.rankings_fusionados += 1;
  }

  const { count: licDestino } = await supabaseAdmin
    .from("licencias")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", destinoId);

  if ((licDestino ?? 0) === 0) {
    const { count: licMovPrev } = await supabaseAdmin
      .from("licencias")
      .select("id", { count: "exact", head: true })
      .eq("usuario_id", origenId);
    const { error: licErr } = await supabaseAdmin
      .from("licencias")
      .update({ usuario_id: destinoId })
      .eq("usuario_id", origenId);
    if (licErr) throw new Error(licErr.message);
    resumen.licencias_movidas = licMovPrev ?? 0;
  }

  const { count: resMovPrev } = await supabaseAdmin
    .from("reservas")
    .select("id", { count: "exact", head: true })
    .eq("usuario_id", origenId);
  const { error: resErr } = await supabaseAdmin
    .from("reservas")
    .update({ usuario_id: destinoId })
    .eq("usuario_id", origenId);
  if (resErr) throw new Error(resErr.message);
  resumen.reservas_movidas = resMovPrev ?? 0;

  const { data: origen } = await supabaseAdmin
    .from("perfiles")
    .select("id, email")
    .eq("id", origenId)
    .maybeSingle();

  const { count: restantes } = await supabaseAdmin
    .from("inscripciones")
    .select("id", { count: "exact", head: true })
    .or(`usuario_id.eq.${origenId},usuario2_id.eq.${origenId}`);

  if (restantes && restantes > 0) {
    throw new Error(
      "Tras migrar inscripciones siguen referencias en la ficha origen. No se eliminó la ficha duplicada.",
    );
  }

  if (origen?.email && esEmailPlaceholderPlanilla(origen.email)) {
    await supabaseAdmin.from("perfiles").delete().eq("id", origenId);
    await supabaseAdmin.auth.admin.deleteUser(origenId).catch(() => undefined);
    resumen.origen_eliminado = true;
  } else {
    const { error: soft } = await supabaseAdmin
      .from("perfiles")
      .update({
        dni: null,
        pendiente_activacion: false,
        nombre: "Fusionado",
        apellido: "archivado",
      })
      .eq("id", origenId);
    if (soft) throw new Error(soft.message);
  }

  return resumen;
}