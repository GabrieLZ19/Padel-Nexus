import { supabaseAdmin } from "../config/supabase";

export type ResumenHistorialEntidad = {
  tieneHistorial: boolean;
  torneos: number;
  reservas: number;
  inscripciones: number;
  licenciasClub: number;
  afiliaciones: number;
  perfilesVinculados: number;
};

export async function historialClub(clubId: string): Promise<ResumenHistorialEntidad> {
  const resumen: ResumenHistorialEntidad = {
    tieneHistorial: false,
    torneos: 0,
    reservas: 0,
    inscripciones: 0,
    licenciasClub: 0,
    afiliaciones: 0,
    perfilesVinculados: 0,
  };

  const { count: torneos } = await supabaseAdmin
    .from("torneos")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId);
  resumen.torneos = torneos ?? 0;

  const { data: canchas } = await supabaseAdmin
    .from("canchas")
    .select("id")
    .eq("club_id", clubId);
  const canchaIds = (canchas || []).map((c) => c.id);

  if (canchaIds.length > 0) {
    const { data: turnos } = await supabaseAdmin
      .from("turnos")
      .select("id")
      .in("cancha_id", canchaIds);
    const turnoIds = (turnos || []).map((t) => t.id);
    if (turnoIds.length > 0) {
      const { count: reservas } = await supabaseAdmin
        .from("reservas")
        .select("id", { count: "exact", head: true })
        .in("turno_id", turnoIds);
      resumen.reservas = reservas ?? 0;
    }
  }

  if (resumen.torneos > 0) {
    const { data: torneoRows } = await supabaseAdmin
      .from("torneos")
      .select("id")
      .eq("club_id", clubId);
    const torneoIds = (torneoRows || []).map((t) => t.id);
    if (torneoIds.length > 0) {
      const { count: inscripciones } = await supabaseAdmin
        .from("inscripciones")
        .select("id", { count: "exact", head: true })
        .in("torneo_id", torneoIds);
      resumen.inscripciones = inscripciones ?? 0;
    }
  }

  const { count: licenciasClub } = await supabaseAdmin
    .from("licencias_club")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId);
  resumen.licenciasClub = licenciasClub ?? 0;

  const { count: afiliaciones } = await supabaseAdmin
    .from("afiliaciones")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId);
  resumen.afiliaciones = afiliaciones ?? 0;

  const { count: perfilesVinculados } = await supabaseAdmin
    .from("perfiles")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId);
  resumen.perfilesVinculados = perfilesVinculados ?? 0;

  resumen.tieneHistorial =
    resumen.torneos > 0 ||
    resumen.reservas > 0 ||
    resumen.inscripciones > 0 ||
    resumen.licenciasClub > 0 ||
    resumen.afiliaciones > 0 ||
    resumen.perfilesVinculados > 0;

  return resumen;
}

export async function historialAsociacion(
  asociacionId: string,
): Promise<{ tieneHistorial: boolean; clubes: number; torneos: number }> {
  const { count: clubes } = await supabaseAdmin
    .from("clubes")
    .select("id", { count: "exact", head: true })
    .eq("asociacion_id", asociacionId);

  const { data: clubRows } = await supabaseAdmin
    .from("clubes")
    .select("id")
    .eq("asociacion_id", asociacionId);
  const clubIds = (clubRows || []).map((c) => c.id);

  let torneos = 0;
  if (clubIds.length > 0) {
    const { count } = await supabaseAdmin
      .from("torneos")
      .select("id", { count: "exact", head: true })
      .in("club_id", clubIds);
    torneos = count ?? 0;
  }

  const tieneHistorial = (clubes ?? 0) > 0 || torneos > 0;
  return { tieneHistorial, clubes: clubes ?? 0, torneos };
}

export async function historialFederacion(
  federacionId: string,
): Promise<{ tieneHistorial: boolean; asociaciones: number }> {
  const { count: asociaciones } = await supabaseAdmin
    .from("asociaciones")
    .select("id", { count: "exact", head: true })
    .eq("federacion_id", federacionId);

  const tieneHistorial = (asociaciones ?? 0) > 0;
  return { tieneHistorial, asociaciones: asociaciones ?? 0 };
}