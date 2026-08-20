/**
 * Etiqueta de representación en torneos nacionales: "NEUQUÉN A".
 * Provincia = lugar_residencia del jugador 1; letra = letra_prioridad de la inscripción.
 */
export function buildDenominacionNacional(
  provincia?: string | null,
  letra?: string | null,
): string | null {
  const prov = (provincia || "").trim();
  const letter = (letra || "").trim().toUpperCase();
  if (!prov || !letter) return null;
  return `${prov.toUpperCase()} ${letter}`;
}

export function enrichInscripcionDenominacion(ins: {
  letra_prioridad?: string | null;
  usuario_id?: string | null;
  usuario2_id?: string | null;
  perfiles?: { lugar_residencia?: string | null } | null;
  perfiles_jugador2?: { lugar_residencia?: string | null } | null;
}) {
  const provincia =
    ins.perfiles?.lugar_residencia?.trim() ||
    ins.perfiles_jugador2?.lugar_residencia?.trim() ||
    null;
  const letra = ins.letra_prioridad ?? null;
  return {
    provincia,
    letra_prioridad: letra,
    denominacion_nacional: buildDenominacionNacional(provincia, letra),
    usuario_id: ins.usuario_id ?? null,
    usuario2_id: ins.usuario2_id ?? null,
  };
}
