/** DNI numérico (sin @) con al menos 7 dígitos — alta provisional TOR-20. */
export function identificadorPareceDni(identificador: string): boolean {
  const t = identificador.trim();
  if (!t || t.includes("@")) return false;
  const digits = t.replace(/\D/g, "");
  return digits.length >= 7;
}

export interface DatosAltaJugadorManualPayload {
  nombre?: string;
  apellido?: string;
  categoria_padel?: string;
  fecha_nacimiento?: string;
  telefono?: string;
}

export function datosAltaJugadorCompletos(
  identificador: string,
  nombre: string,
  apellido: string,
): DatosAltaJugadorManualPayload | undefined {
  if (!identificadorPareceDni(identificador)) return undefined;
  const n = nombre.trim();
  const a = apellido.trim();
  if (!n && !a) return undefined;
  return { nombre: n, apellido: a };
}
