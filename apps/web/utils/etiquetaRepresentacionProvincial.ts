import type { Afiliacion } from "@/utils/types";

type AsociacionEmbed = {
  id?: string;
  nombre?: string | null;
  sigla?: string | null;
};

export type AfiliacionConAsociacion = Afiliacion & {
  asociaciones?: AsociacionEmbed | AsociacionEmbed[] | null;
};

function unwrapAsociacion(
  value: AsociacionEmbed | AsociacionEmbed[] | null | undefined,
): AsociacionEmbed | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

/** Badge «Representación provincial»: asociación, no nombre del club en `entidad`. */
export function etiquetaRepresentacionProvincial(
  af: AfiliacionConAsociacion,
): string {
  const asoc = unwrapAsociacion(af.asociaciones);
  const sigla = String(asoc?.sigla || "").trim();
  if (sigla) return sigla;
  const nombre = String(asoc?.nombre || "").trim();
  if (nombre) return nombre;

  const entidad = String(af.entidad || "").trim();
  return entidad || "Asociación";
}
