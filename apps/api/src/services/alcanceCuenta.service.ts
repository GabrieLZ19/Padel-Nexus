import { supabaseAdmin } from "../config/supabase";
import {
  AVISO_SIN_CLUB,
  AVISO_SIN_PROVINCIA,
  decidirAlcanceTorneo,
  mismaProvincia,
  type AccionSobreTorneo,
  type ContextoCuenta,
  type DecisionAlcance,
} from "../utils/alcanceCuenta";

export interface CuentaResuelta extends ContextoCuenta {
  aviso: string | null;
}

const ROLES_TOTALES = new Set(["superadmin", "admin", "admin_federacion"]);

export class AlcanceCuentaService {
  static async resolver(user?: {
    id: string;
    rol?: string | null;
  }): Promise<CuentaResuelta> {
    const rol = user?.rol || "usuario";
    if (!user?.id || ROLES_TOTALES.has(rol) || rol === "usuario") {
      return { rol, provincia: null, clubId: null, aviso: null };
    }

    const { data: perfil } = await supabaseAdmin
      .from("perfiles")
      .select("lugar_residencia, club_id")
      .eq("id", user.id)
      .maybeSingle();

    if (rol === "admin_provincial") {
      const provincia = String(perfil?.lugar_residencia || "").trim() || null;
      return {
        rol,
        provincia,
        clubId: null,
        aviso: provincia ? null : AVISO_SIN_PROVINCIA,
      };
    }

    if (rol === "admin_club") {
      const clubId = perfil?.club_id || null;
      return {
        rol,
        provincia: null,
        clubId,
        aviso: clubId ? null : AVISO_SIN_CLUB,
      };
    }

    return { rol, provincia: null, clubId: null, aviso: null };
  }

  static async idsClubesDeProvincia(provincia: string): Promise<string[]> {
    const { data, error } = await supabaseAdmin.from("clubes").select("id, provincia");
    if (error) throw new Error(error.message);
    return (data || [])
      .filter((club) => mismaProvincia(club.provincia, provincia))
      .map((club) => club.id as string);
  }

  static async idsAsociacionesDeProvincia(provincia: string): Promise<string[]> {
    const { data, error } = await supabaseAdmin.from("asociaciones").select("id, provincia");
    if (error) throw new Error(error.message);
    return (data || [])
      .filter((asoc) => mismaProvincia(asoc.provincia, provincia))
      .map((asoc) => asoc.id as string);
  }

  static async consultar(
    user: { id: string; rol?: string | null } | undefined,
    torneoId: string,
    accion: AccionSobreTorneo,
  ): Promise<DecisionAlcance> {
    const cuenta = await AlcanceCuentaService.resolver(user);
    if (cuenta.rol !== "admin_provincial" && cuenta.rol !== "admin_club") {
      return {
        permitido: true,
        soloLectura: false,
        puedeCargarResultados: true,
        motivo: null,
      };
    }

    const { data, error } = await supabaseAdmin
      .from("torneos")
      .select("id, alcance, club_id, asociacion_id, clubes!club_id(provincia), asociaciones!asociacion_id(provincia)")
      .eq("id", torneoId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Torneo no encontrado.");

    const club = data.clubes as
      | { provincia?: string | null }
      | { provincia?: string | null }[]
      | null;
    const provinciaClub = Array.isArray(club) ? club[0]?.provincia : club?.provincia;

    const asoc = data.asociaciones as
      | { provincia?: string | null }
      | { provincia?: string | null }[]
      | null;
    const provinciaAsoc = Array.isArray(asoc) ? asoc[0]?.provincia : asoc?.provincia;

    return decidirAlcanceTorneo(
      cuenta,
      {
        alcance: data.alcance,
        clubId: data.club_id,
        provinciaClub: provinciaClub || null,
        provinciaAsociacion: provinciaAsoc || null,
      },
      accion,
    );
  }

  static async exigir(
    user: { id: string; rol?: string | null } | undefined,
    torneoId: string,
    accion: AccionSobreTorneo,
  ): Promise<void> {
    const decision = await AlcanceCuentaService.consultar(user, torneoId, accion);
    if (!decision.permitido) {
      throw new Error(decision.motivo || "No tenés permiso para esta acción.");
    }
  }
}
