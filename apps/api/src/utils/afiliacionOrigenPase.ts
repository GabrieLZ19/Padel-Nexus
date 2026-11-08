/** Afiliación activa cuya asociacion_id define el origen del pase (no la fila de club). */
export type FilaAfiliacionOrigen = {
  asociacion_id: string | null;
  club_id?: string | null;
};

export function asociacionOrigenIdDesdeAfiliaciones(
  filas: FilaAfiliacionOrigen[] | null | undefined,
): string | null {
  if (!filas?.length) return null;
  const conAsoc = filas.filter((row) => row.asociacion_id);
  const provincial = conAsoc.find((row) => !row.club_id);
  if (provincial?.asociacion_id) return provincial.asociacion_id;
  return conAsoc.find((row) => row.asociacion_id)?.asociacion_id ?? null;
}
