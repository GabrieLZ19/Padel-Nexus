import type { Afiliacion } from "@/utils/types";

/** Asociación de origen para pase: prioriza fila provincial (sin club_id). */
export function asociacionOrigenIdDesdeAfiliaciones(
  afiliaciones?: Afiliacion[] | null,
): string | null {
  if (!afiliaciones?.length) return null;
  const activas = afiliaciones.filter(
    (af) =>
      af.asociacion_id && (af.estado || "").toLowerCase() === "activo",
  );
  const provincial = activas.find((af) => !af.club_id);
  if (provincial?.asociacion_id) return provincial.asociacion_id;
  return activas.find((af) => af.asociacion_id)?.asociacion_id ?? null;
}

export function etiquetaAsociacionOrigen(
  asociacionId: string | null | undefined,
  asociaciones: { id: string; nombre: string; provincia?: string | null }[],
): string {
  if (!asociacionId) return "sin asociación activa";
  const asoc = asociaciones.find((a) => a.id === asociacionId);
  if (!asoc) return "asociación de origen";
  return asoc.provincia ? `${asoc.nombre} · ${asoc.provincia}` : asoc.nombre;
}
