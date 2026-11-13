import type { Afiliacion, Licencia } from "@/utils/types";
import {
  type AfiliacionConAsociacion,
  etiquetaRepresentacionProvincial,
} from "@/utils/etiquetaRepresentacionProvincial";
import { licenciasComoArray } from "@/utils/licenciasArray";

export function afiliacionVisible(estado?: string | null): boolean {
  const e = (estado || "").toLowerCase();
  return e !== "suspendido" && e !== "rechazado" && e !== "baja";
}

export type RepresentacionProvincialItem = AfiliacionConAsociacion & {
  /** Sin fila en `afiliaciones`; se infiere de la licencia activa o pendiente. */
  desde_licencia?: boolean;
};

/**
 * Badges de representación provincial: afiliaciones vigentes o, si no hay,
 * asociación emisora de la licencia Activa/Pendiente (ENT-20).
 */
export function representacionesProvincialMiPerfil(params: {
  afiliaciones?: Afiliacion[] | null;
  licencias?: Licencia | Licencia[] | null;
}): RepresentacionProvincialItem[] {
  const porAfiliacion = (params.afiliaciones ?? []).filter((af) =>
    afiliacionVisible(af.estado),
  ) as RepresentacionProvincialItem[];

  if (porAfiliacion.length > 0) return porAfiliacion;

  const licList = licenciasComoArray(params.licencias);
  const vistos = new Set<string>();
  const desdeLicencia: RepresentacionProvincialItem[] = [];

  for (const lic of licList) {
    const estado = (lic.estado || "").toLowerCase();
    if (estado !== "activa" && estado !== "pendiente") continue;

    const asoc = lic.asociaciones;
    const asocId = lic.asociacion_id ?? asoc?.id ?? null;
    if (!asocId) continue;
    if (vistos.has(asocId)) continue;
    vistos.add(asocId);

    desdeLicencia.push({
      id: `licencia-${lic.id}`,
      usuario_id: lic.usuario_id,
      entidad: asoc?.nombre?.trim() || "",
      estado: lic.estado,
      fecha_vencimiento: lic.fecha_vencimiento || "",
      asociacion_id: asocId,
      asociaciones: asoc ?? {
        id: asocId,
        nombre: "",
        sigla: null,
      },
      desde_licencia: true,
    });
  }

  return desdeLicencia;
}

export function etiquetaRepresentacionProvincialConFallback(
  item: RepresentacionProvincialItem,
): string {
  return etiquetaRepresentacionProvincial(item);
}

/** Aviso bajo badges cuando la asociación se infiere de la licencia, no de afiliación. */
export function textoRepresentacionDesdeLicencia(
  items: RepresentacionProvincialItem[],
): string | null {
  const inferidos = items.filter((r) => r.desde_licencia);
  if (inferidos.length === 0) return null;

  const hayPendiente = inferidos.some(
    (r) => (r.estado || "").toLowerCase() === "pendiente",
  );
  const hayActiva = inferidos.some(
    (r) => (r.estado || "").toLowerCase() === "activa",
  );

  if (hayPendiente && !hayActiva) {
    return "Según tu licencia en trámite (sin afiliación provincial aparte).";
  }
  return "Según tu licencia activa (sin afiliación provincial aparte).";
}
