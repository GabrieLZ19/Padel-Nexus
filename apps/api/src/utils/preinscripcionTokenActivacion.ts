import { createHash, randomBytes } from "node:crypto";
import { supabaseAdmin } from "../config/supabase";
import type { MetodoVerificacionPreinscripcion } from "./preinscripcionVerificacion";

const TOKEN_BYTES = 32;
const TOKEN_VIGENCIA_MS = 30 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function generarTokenActivacionPlano(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

export async function emitirTokenActivacionPreinscripcion(params: {
  dni: string;
  perfilId: string;
  metodo: MetodoVerificacionPreinscripcion;
}): Promise<{ token: string; expires_at: string }> {
  const dni = String(params.dni || "").replace(/\D/g, "");
  const token = generarTokenActivacionPlano();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + TOKEN_VIGENCIA_MS).toISOString();

  await supabaseAdmin
    .from("preinscripcion_tokens_activacion")
    .update({ used_at: new Date().toISOString() })
    .eq("dni", dni)
    .is("used_at", null);

  const { error } = await supabaseAdmin
    .from("preinscripcion_tokens_activacion")
    .insert({
      dni,
      perfil_id: params.perfilId,
      token_hash: tokenHash,
      metodo: params.metodo,
      expires_at: expiresAt,
    });

  if (error) {
    throw new Error(
      `No se pudo emitir el token de activación: ${error.message}`,
    );
  }

  return { token, expires_at: expiresAt };
}

export async function consumirTokenActivacionPreinscripcion(
  dni: string,
  tokenPlano: string,
): Promise<{ perfilId: string }> {
  const dniLimpio = String(dni || "").replace(/\D/g, "");
  const token = String(tokenPlano || "").trim();
  if (!dniLimpio || token.length < 16) {
    throw new Error("Token de verificación inválido o vencido.");
  }

  const tokenHash = hashToken(token);
  const ahora = new Date().toISOString();

  const { data: row, error } = await supabaseAdmin
    .from("preinscripcion_tokens_activacion")
    .select("id, perfil_id, dni, expires_at, used_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (error || !row) {
    throw new Error("Token de verificación inválido o vencido.");
  }

  if (row.dni !== dniLimpio) {
    throw new Error("Token de verificación inválido o vencido.");
  }

  if (row.used_at) {
    throw new Error("Este enlace de verificación ya fue utilizado.");
  }

  if (row.expires_at < ahora) {
    throw new Error("El token de verificación venció. Volvé a verificar tu identidad.");
  }

  const { error: markError } = await supabaseAdmin
    .from("preinscripcion_tokens_activacion")
    .update({ used_at: ahora })
    .eq("id", row.id)
    .is("used_at", null);

  if (markError) {
    throw new Error("No se pudo validar el token de activación.");
  }

  return { perfilId: String(row.perfil_id) };
}
