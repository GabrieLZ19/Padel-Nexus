import { supabaseAdmin } from "../config/supabase";
import {
  PROGRAMADOR_HORA_FIN_BLOQUE,
  PROGRAMADOR_HORA_INICIO_BLOQUE,
  resolverDiasProgramacion,
} from "./programacionPartidos";

type TorneoSedeSeed = {
  id: string;
  club_id?: string | null;
  fecha?: string | null;
  fecha_fin?: string | null;
  dias_juego?: string[] | null;
  categoria?: string | null;
};

/**
 * CLI-2: torneos de club creados antes del seed automatico — sede + disponibilidad
 * base si `torneo_canchas_disponibilidad` esta vacia (idempotente).
 */
export async function asegurarDisponibilidadOrganizadorSiVacia(
  torneoId: string,
): Promise<boolean> {
  const { count: dispPrevias, error: countError } = await supabaseAdmin
    .from("torneo_canchas_disponibilidad")
    .select("id", { count: "exact", head: true })
    .eq("torneo_id", torneoId);

  if (countError) throw new Error(countError.message);
  if (dispPrevias && dispPrevias > 0) return false;

  const { data: torneo, error: torneoError } = await supabaseAdmin
    .from("torneos")
    .select("id, club_id, fecha, fecha_fin, dias_juego, categoria")
    .eq("id", torneoId)
    .maybeSingle();

  if (torneoError) throw new Error(torneoError.message);
  if (!torneo?.club_id) return false;

  await inicializarSedesTorneoOrganizador(
    {
      id: torneo.id,
      club_id: torneo.club_id,
      fecha: torneo.fecha,
      fecha_fin: torneo.fecha_fin,
      dias_juego: (torneo.dias_juego as string[] | null) ?? null,
      categoria: torneo.categoria,
    },
    String(torneo.club_id),
  );
  return true;
}

/**
 * Tras crear un torneo de club: sede organizadora + disponibilidad base por cancha activa.
 */
export async function inicializarSedesTorneoOrganizador(
  torneo: TorneoSedeSeed,
  clubId: string,
): Promise<void> {
  const torneoId = torneo.id;

  const { count: sedesPrevias } = await supabaseAdmin
    .from("torneo_sedes")
    .select("club_id", { count: "exact", head: true })
    .eq("torneo_id", torneoId);

  if (!sedesPrevias) {
    const { error: sedesError } = await supabaseAdmin.from("torneo_sedes").insert({
      torneo_id: torneoId,
      club_id: clubId,
    });
    if (sedesError) throw new Error(sedesError.message);
  }

  const { count: dispPrevias } = await supabaseAdmin
    .from("torneo_canchas_disponibilidad")
    .select("id", { count: "exact", head: true })
    .eq("torneo_id", torneoId);

  if (dispPrevias && dispPrevias > 0) return;

  const { data: canchas, error: canchasError } = await supabaseAdmin
    .from("canchas")
    .select("id")
    .eq("club_id", clubId)
    .eq("activa", true);

  if (canchasError) throw new Error(canchasError.message);
  const canchaIds = (canchas || []).map((c) => String(c.id));
  if (canchaIds.length === 0) return;

  const dias = resolverDiasProgramacion({
    fecha: torneo.fecha,
    fecha_fin: torneo.fecha_fin ?? torneo.fecha,
    dias_juego: torneo.dias_juego,
  });

  if (dias.length === 0) return;

  const categoria =
    String(torneo.categoria || "").trim() || null;

  const rows = dias.flatMap((fecha) =>
    canchaIds.map((cancha_id) => ({
      torneo_id: torneoId,
      club_id: clubId,
      cancha_id,
      fecha,
      hora_inicio: PROGRAMADOR_HORA_INICIO_BLOQUE,
      hora_fin: PROGRAMADOR_HORA_FIN_BLOQUE,
      categoria,
    })),
  );

  const { error: dispError } = await supabaseAdmin
    .from("torneo_canchas_disponibilidad")
    .insert(rows);

  if (dispError) throw new Error(dispError.message);
}
