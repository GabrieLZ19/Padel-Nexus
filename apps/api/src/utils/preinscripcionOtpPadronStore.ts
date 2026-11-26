import { supabaseAdmin } from "../config/supabase";
import {
  OTP_PADRON_VIGENCIA_MS,
  generarCodigoOtpPadron,
  hashCodigoOtpPadron,
} from "./preinscripcionPadronFap";

export type CanalOtpPadron = "email" | "telefono";

export async function invalidarOtpsPadronVigentes(dni: string): Promise<void> {
  const ahora = new Date().toISOString();
  await supabaseAdmin
    .from("preinscripcion_padron_fap_otp")
    .update({ used_at: ahora })
    .eq("dni", dni)
    .is("used_at", null);
}

export async function crearOtpPadronFap(params: {
  dni: string;
  perfilId: string;
  canal: CanalOtpPadron;
  destino: string;
}): Promise<{ codigoPlano: string; expiresAt: string }> {
  const codigoPlano = generarCodigoOtpPadron();
  const codigoHash = hashCodigoOtpPadron(codigoPlano);
  const expiresAt = new Date(Date.now() + OTP_PADRON_VIGENCIA_MS).toISOString();

  await invalidarOtpsPadronVigentes(params.dni);

  const { error } = await supabaseAdmin.from("preinscripcion_padron_fap_otp").insert({
    dni: params.dni,
    perfil_id: params.perfilId,
    canal: params.canal,
    destino: params.destino,
    codigo_hash: codigoHash,
    expires_at: expiresAt,
  });

  if (error) {
    throw new Error(`No se pudo registrar el código OTP: ${error.message}`);
  }

  return { codigoPlano, expiresAt };
}

export async function validarOtpPadronFap(
  dni: string,
  codigo: string,
): Promise<{ perfilId: string; canal: CanalOtpPadron; destino: string }> {
  const codigoHash = hashCodigoOtpPadron(codigo);
  const ahora = new Date().toISOString();

  const { data: row, error } = await supabaseAdmin
    .from("preinscripcion_padron_fap_otp")
    .select("id, perfil_id, dni, canal, destino, expires_at, used_at")
    .eq("dni", dni)
    .eq("codigo_hash", codigoHash)
    .is("used_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !row) {
    throw new Error("Código inválido o vencido.");
  }

  if (row.expires_at < ahora) {
    throw new Error("El código venció. Solicitá uno nuevo.");
  }

  const { error: markError } = await supabaseAdmin
    .from("preinscripcion_padron_fap_otp")
    .update({ used_at: ahora })
    .eq("id", row.id)
    .is("used_at", null);

  if (markError) {
    throw new Error("No se pudo validar el código.");
  }

  return {
    perfilId: String(row.perfil_id),
    canal: row.canal as CanalOtpPadron,
    destino: String(row.destino),
  };
}