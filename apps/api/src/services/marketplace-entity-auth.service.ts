import { supabaseAdmin } from "../config/supabase";
import type { RolUsuario } from "../constants/roles";

export type EntidadMarketplaceTipo = "club" | "asociacion" | "federacion";

export interface EntidadMarketplaceRef {
  entidad_tipo: EntidadMarketplaceTipo;
  entidad_id: string;
}

const ROLES_GESTION_TOTAL: RolUsuario[] = [
  "superadmin",
  "admin",
  "admin_federacion",
];

const ROLES_GESTION_CRM: RolUsuario[] = [
  ...ROLES_GESTION_TOTAL,
  "admin_provincial",
  "admin_club",
];

export class MarketplaceEntityAuthService {
  static puedeGestionarMarketplace(rol: string | undefined): boolean {
    return Boolean(rol && ROLES_GESTION_CRM.includes(rol as RolUsuario));
  }

  static async verificarAccesoEntidad(
    usuarioId: string,
    rol: string | undefined,
    ref: EntidadMarketplaceRef,
  ): Promise<void> {
    if (!rol || !this.puedeGestionarMarketplace(rol)) {
      throw new Error("No tenés permisos para gestionar el marketplace.");
    }

    if (ROLES_GESTION_TOTAL.includes(rol as RolUsuario)) {
      await this.verificarEntidadExiste(ref);
      return;
    }

    if (rol === "admin_provincial") {
      if (ref.entidad_tipo !== "asociacion" && ref.entidad_tipo !== "club") {
        throw new Error(
          "Los administradores provinciales solo pueden gestionar tiendas de asociaciones y clubes.",
        );
      }
      await this.verificarEntidadExiste(ref);
      return;
    }

    if (rol === "admin_club") {
      if (ref.entidad_tipo !== "club") {
        throw new Error("Solo podés gestionar la tienda de tu club.");
      }

      const { data: perfil, error } = await supabaseAdmin
        .from("perfiles")
        .select("club_id")
        .eq("id", usuarioId)
        .single();

      if (error || !perfil?.club_id || perfil.club_id !== ref.entidad_id) {
        throw new Error("No tenés permisos para gestionar este club.");
      }

      await this.verificarEntidadExiste(ref);
      return;
    }

    throw new Error("Rol no autorizado para gestionar marketplace.");
  }

  static async verificarEntidadExiste(
    ref: EntidadMarketplaceRef,
  ): Promise<void> {
    const tabla =
      ref.entidad_tipo === "club"
        ? "clubes"
        : ref.entidad_tipo === "asociacion"
          ? "asociaciones"
          : "federaciones";

    const { data, error } = await supabaseAdmin
      .from(tabla)
      .select("id")
      .eq("id", ref.entidad_id)
      .single();

    if (error || !data) {
      throw new Error(`La entidad ${ref.entidad_tipo} indicada no existe.`);
    }
  }

  /** Usuario de contacto para chat/notificaciones de la tienda. */
  static async resolverContactoVendedor(vendedor: {
    id: string;
    usuario_id?: string | null;
    creado_por?: string | null;
    entidad_tipo?: string | null;
    entidad_id?: string | null;
  }): Promise<string | null> {
    if (vendedor.usuario_id) return vendedor.usuario_id;
    if (vendedor.creado_por) return vendedor.creado_por;

    if (vendedor.entidad_tipo === "club" && vendedor.entidad_id) {
      const { data: adminClub } = await supabaseAdmin
        .from("perfiles")
        .select("id")
        .eq("club_id", vendedor.entidad_id)
        .eq("rol", "admin_club")
        .limit(1)
        .maybeSingle();

      if (adminClub?.id) return adminClub.id;
    }

    return null;
  }

  static async obtenerNombreEntidad(
    ref: EntidadMarketplaceRef,
  ): Promise<string> {
    const tabla =
      ref.entidad_tipo === "club"
        ? "clubes"
        : ref.entidad_tipo === "asociacion"
          ? "asociaciones"
          : "federaciones";

    const { data } = await supabaseAdmin
      .from(tabla)
      .select("nombre")
      .eq("id", ref.entidad_id)
      .single();

    return data?.nombre || "Entidad";
  }
}
