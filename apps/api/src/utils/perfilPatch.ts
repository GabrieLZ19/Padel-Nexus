/**
 * Arma un patch de actualización omitiendo claves `undefined`
 * para no pisar columnas existentes con null accidentalmente.
 */
export function buildPerfilUpdatePatch(
  values: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value !== undefined),
  );
}

export function normalizeFechaNacimiento(
  value?: string | null,
): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return undefined;
  return `${match[1]}-${match[2]}-${match[3]}`;
}
