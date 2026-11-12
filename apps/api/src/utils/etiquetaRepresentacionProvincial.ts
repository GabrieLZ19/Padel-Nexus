type AsociacionEmbed = {
  nombre?: string | null;
  sigla?: string | null;
};

type FilaAfiliacion = {
  entidad?: string | null;
  asociaciones?: AsociacionEmbed | AsociacionEmbed[] | null;
};

function unwrapAsociacion(
  value: AsociacionEmbed | AsociacionEmbed[] | null | undefined,
): AsociacionEmbed | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function etiquetaRepresentacionProvincial(af: FilaAfiliacion): string {
  const asoc = unwrapAsociacion(af.asociaciones);
  const sigla = String(asoc?.sigla || "").trim();
  if (sigla) return sigla;
  const nombre = String(asoc?.nombre || "").trim();
  if (nombre) return nombre;

  const entidad = String(af.entidad || "").trim();
  return entidad || "Asociación";
}
