const ETIQUETAS_CAMPO: Record<string, string> = {
  dni: "DNI",
  nombre: "Nombre",
  apellido: "Apellido",
  fecha_nacimiento: "Fecha de nacimiento",
  email: "Email",
  telefono: "Teléfono",
};

export function etiquetaAccionHistorialFicha(accion: string): string {
  if (accion === "corregir_dni_ficha") return "Corrección de DNI";
  if (accion === "editar_ficha_provisoria") return "Edición ficha provisoria";
  return accion;
}

function formatoValor(valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "(vacío)";
  return String(valor);
}

export function detalleTextoHistorialFicha(ev: {
  accion: string;
  detalles: Record<string, unknown> | null;
}): string {
  const detalles = ev.detalles;
  if (!detalles || typeof detalles !== "object") return "";

  const cambios = detalles.cambios;
  if (!cambios || typeof cambios !== "object") return "";

  const partes: string[] = [];
  for (const [campo, par] of Object.entries(
    cambios as Record<string, { antes?: unknown; despues?: unknown }>,
  )) {
    if (!par || typeof par !== "object") continue;
    const etiqueta = ETIQUETAS_CAMPO[campo] ?? campo;
    partes.push(
      `${etiqueta}: ${formatoValor(par.antes)} → ${formatoValor(par.despues)}`,
    );
  }

  return partes.join(" · ");
}