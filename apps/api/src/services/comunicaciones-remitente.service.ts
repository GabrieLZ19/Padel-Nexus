import { supabaseAdmin } from "../config/supabase";
import type { RolUsuario } from "../constants/roles";

/**
 * Etiqueta visible de la entidad que envía una campaña (sigla FAP, asociación, club, etc.).
 */
export class ComunicacionesRemitenteService {
  static async etiquetaEntidad(
    actorId: string,
    actorRol: RolUsuario,
  ): Promise<string> {
    if (actorRol === "admin_club") {
      const { data } = await supabaseAdmin
        .from("perfiles")
        .select("clubes:club_id ( nombre )")
        .eq("id", actorId)
        .maybeSingle();
      const club = data?.clubes as { nombre?: string | null } | null;
      const nombre = (club?.nombre || "").trim();
      if (nombre) return nombre;
    }

    if (actorRol === "admin_provincial") {
      const { data: perfil } = await supabaseAdmin
        .from("perfiles")
        .select("lugar_residencia")
        .eq("id", actorId)
        .maybeSingle();
      const provincia = (perfil?.lugar_residencia || "").trim();
      if (provincia) {
        const { data: asoc } = await supabaseAdmin
          .from("asociaciones")
          .select("sigla, nombre")
          .eq("provincia", provincia)
          .limit(1)
          .maybeSingle();
        const sigla = (asoc?.sigla || "").trim();
        if (sigla) return sigla;
        const nombre = (asoc?.nombre || "").trim();
        if (nombre) return nombre;
        return provincia;
      }
    }

    if (actorRol === "admin_federacion") {
      const { data: fed } = await supabaseAdmin
        .from("federaciones")
        .select("sigla, nombre")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      const sigla = (fed?.sigla || "").trim();
      if (sigla) return sigla;
      const nombre = (fed?.nombre || "").trim();
      if (nombre) return nombre;
      return "FAP";
    }

    return "Padel Nexus";
  }
}
