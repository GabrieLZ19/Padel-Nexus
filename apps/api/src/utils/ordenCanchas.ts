export function nombreCanchaNormalizado(nombre: string): string {
  return nombre.trim().replace(/\s+/g, " ").toLocaleLowerCase("es");
}

export function nombreCanchaVisible(nombre: string): string {
  const visible = nombre.trim().replace(/\s+/g, " ");
  if (!visible) throw new Error("El nombre de la cancha es obligatorio.");
  return visible;
}

export function numeroCancha(nombre: string): number | null {
  const match = /(\d+)/.exec(nombre);
  if (!match) return null;
  return Number(match[1]);
}

/** Número de cancha y, si coincide, el nombre completo. */
export function compararCanchas(a: { nombre: string }, b: { nombre: string }): number {
  const numeroA = numeroCancha(a.nombre);
  const numeroB = numeroCancha(b.nombre);
  if (numeroA != null && numeroB != null && numeroA !== numeroB) return numeroA - numeroB;
  if (numeroA != null && numeroB == null) return -1;
  if (numeroA == null && numeroB != null) return 1;
  return a.nombre.localeCompare(b.nombre, "es");
}
