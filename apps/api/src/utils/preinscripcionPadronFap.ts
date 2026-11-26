import { createHash, randomInt } from "node:crypto";
import { normalizeFechaNacimiento } from "./perfilPatch";
import { soloDigitosTelefono } from "./preinscripcionVerificacion";

export const OTP_PADRON_VIGENCIA_MS = 15 * 60 * 1000;
export const OTP_PADRON_LONGITUD = 6;

export function normalizarNroLicenciaPadron(
  valor: string | null | undefined,
): string {
  return String(valor || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

export function coincidenLicenciasPadron(
  registro: string | null | undefined,
  declarado: string | null | undefined,
): boolean {
  const a = normalizarNroLicenciaPadron(registro);
  const b = normalizarNroLicenciaPadron(declarado);
  if (!a || !b) return false;
  return a === b;
}

export function coincideFechaNacimientoPadron(
  ficha: string | null | undefined,
  declarada: string | null | undefined,
): boolean {
  const a = normalizeFechaNacimiento(ficha);
  const b = normalizeFechaNacimiento(declarada);
  if (!a || !b) return false;
  return a === b;
}

export function normalizarEmailPadronOtp(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizarTelefonoPadronOtp(telefono: string): string {
  return soloDigitosTelefono(telefono);
}

export function emailValidoPadronOtp(email: string): boolean {
  const n = normalizarEmailPadronOtp(email);
  return n.length >= 5 && n.includes("@") && n.includes(".");
}

export function telefonoValidoPadronOtp(telefono: string): boolean {
  return normalizarTelefonoPadronOtp(telefono).length >= 8;
}

export function generarCodigoOtpPadron(): string {
  const max = 10 ** OTP_PADRON_LONGITUD;
  const n = randomInt(0, max);
  return String(n).padStart(OTP_PADRON_LONGITUD, "0");
}

export function hashCodigoOtpPadron(codigo: string): string {
  return createHash("sha256")
    .update(String(codigo || "").trim(), "utf8")
    .digest("hex");
}