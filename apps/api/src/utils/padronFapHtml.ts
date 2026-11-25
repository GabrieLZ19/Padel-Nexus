export type FilaPadronFap = {
  fila: number;
  nombre: string;
  apellido: string;
  nivel: string;
  dni: string;
  fechaNacimiento: string;
  licenciaRaw: string;
  provincia: string;
  ciudad: string;
  instPrimaria: string;
  representacion: string;
};

function parseCell(html: string): string {
  return html.replace(/<[^>]+>/g, "").trim();
}

function extraerFilasHtml(html: string): FilaPadronFap[] {
  const rowRe = /<tr>\s*<td align=center>(\d+)<\/td>[\s\S]*?<\/tr>/g;
  const filas: FilaPadronFap[] = [];
  let match: RegExpExecArray | null;

  while ((match = rowRe.exec(html)) !== null) {
    const chunk = match[0];
    const tds = [...chunk.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((x) =>
      parseCell(x[1]),
    );
    if (tds.length < 11) continue;

    const fechaRaw = tds[5];
    const fechaNacimiento =
      /^\d{4}-\d{2}-\d{2}$/.test(fechaRaw) && !fechaRaw.startsWith("0000")
        ? fechaRaw
        : "";

    filas.push({
      fila: Number(match[1]),
      nombre: tds[1],
      apellido: tds[2],
      nivel: tds[3],
      dni: tds[4].replace(/\D/g, ""),
      fechaNacimiento,
      licenciaRaw: tds[6],
      provincia: tds[9],
      ciudad: tds[10],
      instPrimaria: tds[11] ?? "",
      representacion: tds[12] ?? "",
    });
  }

  return filas;
}

/** Última fila gana ante DNI duplicados en el export. */
export function parsePadronFapHtml(html: string): FilaPadronFap[] {
  const raw = extraerFilasHtml(html);
  const porDni = new Map<string, FilaPadronFap>();

  for (const fila of raw) {
    if (!fila.dni || fila.dni.length < 7) continue;
    porDni.set(fila.dni, fila);
  }

  return [...porDni.values()].sort((a, b) => a.fila - b.fila);
}