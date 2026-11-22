import { supabaseAdmin } from "../config/supabase";
import type { PlatformFeeOrgRef } from "../constants/platformFee";
import { AlcanceCuentaService } from "../services/alcanceCuenta.service";
import { PlatformFeeService } from "../services/platformFee.service";
import { mismaProvincia } from "./alcanceCuenta";

/**
 * Resuelve club / asociación / federación del usuario para preferencias de fee por org.
 */
export async function resolverOrgFeeDesdeUsuario(user: {
  id: string;
  rol?: string | null;
}): Promise<PlatformFeeOrgRef | null> {
  const rol = user.rol || "usuario";
  const cuenta = await AlcanceCuentaService.resolver(user);

  if (rol === "admin_club" && cuenta.clubId) {
    return { org_tipo: "club", org_id: cuenta.clubId };
  }

  if (rol === "admin_provincial" && cuenta.provincia) {
    const asocId = await asociacionIdPorProvincia(cuenta.provincia);
    if (asocId) {
      return { org_tipo: "asociacion", org_id: asocId };
    }
  }

  if (rol === "admin_federacion" || rol === "admin") {
    const fedId = await federacionIdPrincipal();
    if (fedId) {
      return { org_tipo: "federacion", org_id: fedId };
    }
  }

  const { data: perfil } = await supabaseAdmin
    .from("perfiles")
    .select("club_id, asociacion_id")
    .eq("id", user.id)
    .maybeSingle();

  if (perfil?.club_id) {
    return { org_tipo: "club", org_id: perfil.club_id };
  }
  if (perfil?.asociacion_id) {
    return { org_tipo: "asociacion", org_id: perfil.asociacion_id };
  }

  return null;
}

async function asociacionIdPorProvincia(provincia: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from("asociaciones")
    .select("id, provincia");
  if (error) return null;
  const asoc = (data || []).find((a) => mismaProvincia(a.provincia, provincia));
  return asoc?.id ?? null;
}

async function federacionIdPrincipal(): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("federaciones")
    .select("id")
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

/** Solo el organizador dueño del torneo (org de fee) o superadmin pueden ver/pagar el saldo. */
export async function usuarioPuedeSaldoTorneo(
  user: { id: string; rol?: string | null },
  torneoId: string,
): Promise<boolean> {
  if (user.rol === "superadmin") return true;
  const orgUsuario = await resolverOrgFeeDesdeUsuario(user);
  if (!orgUsuario) return false;
  try {
    const orgTorneo = await PlatformFeeService.resolverOrgDesdeTorneo(torneoId);
    return (
      orgUsuario.org_tipo === orgTorneo.org_tipo &&
      orgUsuario.org_id === orgTorneo.org_id
    );
  } catch {
    return false;
  }
}