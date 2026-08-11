import { supabaseAdmin } from "../config/supabase";
import { esRolAdministrativo, type RolUsuario } from "../constants/roles";

export interface FiscalSesion {
  id: string;
  nombre: string;
  apellido: string;
  rango: "Nacional" | "Provincial" | "Regional" | "Local";
  activo: boolean;
}

export type PerfilConFiscal<T extends { id: string; rol?: string | null }> = T & {
  rol: RolUsuario;
  es_fiscal: boolean;
  fiscal_id: string | null;
  fiscal_rango: FiscalSesion["rango"] | null;
};

export class FiscalSesionService {
  static async obtenerFiscalActivoPorUsuario(
    usuarioId: string,
  ): Promise<FiscalSesion | null> {
    const { data, error } = await supabaseAdmin
      .from("fiscales")
      .select("id, nombre, apellido, rango, activo")
      .eq("usuario_id", usuarioId)
      .eq("activo", true)
      .maybeSingle();

    if (error) {
      console.error("Error al resolver ficha de fiscal:", error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      nombre: data.nombre,
      apellido: data.apellido,
      rango: data.rango as FiscalSesion["rango"],
      activo: Boolean(data.activo),
    };
  }

  /**
   * Si el usuario está en el Colegio y no es admin, la sesión operativa es `fiscal`.
   * Un admin que también figura como fiscal conserva su rol administrativo.
   */
  static async enriquecerPerfil<T extends { id: string; rol?: string | null }>(
    perfil: T,
  ): Promise<PerfilConFiscal<T>> {
    const fiscal = await this.obtenerFiscalActivoPorUsuario(perfil.id);
    const rolBase = (perfil.rol || "usuario") as RolUsuario;

    if (!fiscal) {
      return {
        ...perfil,
        rol: rolBase,
        es_fiscal: false,
        fiscal_id: null,
        fiscal_rango: null,
      };
    }

    const usarFichaColegio = !esRolAdministrativo(rolBase);

    return {
      ...perfil,
      ...(usarFichaColegio
        ? { nombre: fiscal.nombre, apellido: fiscal.apellido }
        : {}),
      rol: usarFichaColegio ? "fiscal" : rolBase,
      es_fiscal: true,
      fiscal_id: fiscal.id,
      fiscal_rango: fiscal.rango,
    };
  }
}
