import { esEmailPlaceholderPlanilla } from "./inscripcionPlanilla";

export type MetodoVerificacionPreinscripcion = "telefono" | "email";

export function soloDigitosTelefono(telefono: string | null | undefined): string {
  if (!telefono) return "";
  return telefono.replace(/\D/g, "");
}

export function telefonoTieneVerificacion(
  telefono: string | null | undefined,
): boolean {
  return soloDigitosTelefono(telefono).length >= 4;
}

export function emailTieneVerificacion(email: string | null | undefined): boolean {
  if (!email) return false;
  return !esEmailPlaceholderPlanilla(email);
}

export function metodosVerificacionPreinscripcion(ficha: {
  telefono?: string | null;
  email?: string | null;
}): MetodoVerificacionPreinscripcion[] {
  const metodos: MetodoVerificacionPreinscripcion[] = [];
  if (telefonoTieneVerificacion(ficha.telefono)) metodos.push("telefono");
  if (emailTieneVerificacion(ficha.email)) metodos.push("email");
  return metodos;
}

export function coincideUltimos4Telefono(
  telefonoFicha: string | null | undefined,
  ultimos4Declarados: string,
): boolean {
  const digitosFicha = soloDigitosTelefono(telefonoFicha);
  const declarados = soloDigitosTelefono(ultimos4Declarados);
  if (declarados.length !== 4 || digitosFicha.length < 4) return false;
  return digitosFicha.slice(-4) === declarados;
}

export function coincideEmailPreinscripcion(
  emailFicha: string | null | undefined,
  emailDeclarado: string,
): boolean {
  if (!emailTieneVerificacion(emailFicha)) return false;
  const a = (emailFicha || "").trim().toLowerCase();
  const b = emailDeclarado.trim().toLowerCase();
  if (!b.includes("@")) return false;
  return a === b;
}
