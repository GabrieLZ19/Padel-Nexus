import { supabaseAdmin } from "../config/supabase";
import { mismaProvincia } from "./alcanceCuenta";

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

export type ResumenHistorialAsociacion = {
  tieneHistorial: boolean;
  clubes: number;
  torneos: number;
  licencias: number;
  afiliaciones: number;
  usuariosAdmin: number;
};

export async function historialAsociacion(
  asociacionId: string,
): Promise<ResumenHistorialAsociacion> {
  const resumen: ResumenHistorialAsociacion = {
    tieneHistorial: false,
    clubes: 0,
    torneos: 0,
    licencias: 0,
    afiliaciones: 0,
    usuariosAdmin: 0,
  };

  const { data: asoc } = await supabaseAdmin
    .from("asociaciones")
    .select("id, provincia")
    .eq("id", asociacionId)
    .maybeSingle();

  if (!asoc) return resumen;

  const { count: clubes } = await supabaseAdmin
    .from("clubes")
    .select("id", { count: "exact", head: true })
    .eq("asociacion_id", asociacionId);
  resumen.clubes = clubes ?? 0;

  const { data: clubRows } = await supabaseAdmin
    .from("clubes")
    .select("id")
    .eq("asociacion_id", asociacionId);
  const clubIds = (clubRows || []).map((c) => c.id);

  const torneoIds = new Set<string>();
  const { data: torneosPorAsoc } = await supabaseAdmin
    .from("torneos")
    .select("id")
    .eq("asociacion_id", asociacionId);
  for (const t of torneosPorAsoc || []) {
    torneoIds.add(String(t.id));
  }
  if (clubIds.length > 0) {
    const { data: torneosClub } = await supabaseAdmin
      .from("torneos")
      .select("id")
      .in("club_id", clubIds);
    for (const t of torneosClub || []) {
      torneoIds.add(String(t.id));
    }
  }
  resumen.torneos = torneoIds.size;

  const { count: licencias } = await supabaseAdmin
    .from("licencias")
    .select("id", { count: "exact", head: true })
    .eq("asociacion_id", asociacionId);
  resumen.licencias = licencias ?? 0;

  const { count: afiliaciones } = await supabaseAdmin
    .from("afiliaciones")
    .select("id", { count: "exact", head: true })
    .eq("asociacion_id", asociacionId);
  resumen.afiliaciones = afiliaciones ?? 0;

  let usuariosAdmin = 0;
  if (clubIds.length > 0) {
    const { count: adminsClub } = await supabaseAdmin
      .from("perfiles")
      .select("id", { count: "exact", head: true })
      .in("club_id", clubIds)
      .eq("rol", "admin_club");
    usuariosAdmin += adminsClub ?? 0;
  }

  const { data: adminsProvinciales } = await supabaseAdmin
    .from("perfiles")
    .select("id, lugar_residencia")
    .eq("rol", "admin_provincial");
  usuariosAdmin += (adminsProvinciales || []).filter((p) =>
    mismaProvincia(p.lugar_residencia, asoc.provincia),
  ).length;

  resumen.usuariosAdmin = usuariosAdmin;

  resumen.tieneHistorial =
    resumen.clubes > 0 ||
    resumen.torneos > 0 ||
    resumen.licencias > 0 ||
    resumen.afiliaciones > 0 ||
    resumen.usuariosAdmin > 0;

  return resumen;
}

export type ResumenHistorialFederacion = {
  tieneHistorial: boolean;
  asociaciones: number;
  licencias: number;
  afiliaciones: number;
  usuariosAdmin: number;
};

export async function historialFederacion(
  federacionId: string,
): Promise<ResumenHistorialFederacion> {
  const resumen: ResumenHistorialFederacion = {
    tieneHistorial: false,
    asociaciones: 0,
    licencias: 0,
    afiliaciones: 0,
    usuariosAdmin: 0,
  };

  const { data: asocRows } = await supabaseAdmin
    .from("asociaciones")
    .select("id, provincia")
    .eq("federacion_id", federacionId);

  const asociacionIds = (asocRows || []).map((a) => String(a.id));
  resumen.asociaciones = asociacionIds.length;

  if (asociacionIds.length > 0) {
    const { count: licencias } = await supabaseAdmin
      .from("licencias")
      .select("id", { count: "exact", head: true })
      .in("asociacion_id", asociacionIds);
    resumen.licencias = licencias ?? 0;

    const { count: afiliaciones } = await supabaseAdmin
      .from("afiliaciones")
      .select("id", { count: "exact", head: true })
      .in("asociacion_id", asociacionIds);
    resumen.afiliaciones = afiliaciones ?? 0;

    const { data: clubes } = await supabaseAdmin
      .from("clubes")
      .select("id")
      .in("asociacion_id", asociacionIds);
    const clubIds = (clubes || []).map((c) => String(c.id));

    let usuariosAdmin = 0;
    const { count: adminsFederacion } = await supabaseAdmin
      .from("perfiles")
      .select("id", { count: "exact", head: true })
      .eq("rol", "admin_federacion");
    usuariosAdmin += adminsFederacion ?? 0;

    if (clubIds.length > 0) {
      const { count: adminsClub } = await supabaseAdmin
        .from("perfiles")
        .select("id", { count: "exact", head: true })
        .in("club_id", clubIds)
        .eq("rol", "admin_club");
      usuariosAdmin += adminsClub ?? 0;
    }

    const provincias = new Set(
      (asocRows || [])
        .map((a) => String(a.provincia || "").trim())
        .filter(Boolean),
    );
    const { data: adminsProvinciales } = await supabaseAdmin
      .from("perfiles")
      .select("id, lugar_residencia")
      .eq("rol", "admin_provincial");
    for (const p of adminsProvinciales || []) {
      for (const prov of provincias) {
        if (mismaProvincia(p.lugar_residencia, prov)) {
          usuariosAdmin += 1;
          break;
        }
      }
    }

    resumen.usuariosAdmin = usuariosAdmin;
  }

  resumen.tieneHistorial =
    resumen.asociaciones > 0 ||
    resumen.licencias > 0 ||
    resumen.afiliaciones > 0 ||
    resumen.usuariosAdmin > 0;

  return resumen;
}