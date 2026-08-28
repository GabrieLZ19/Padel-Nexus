export function esModalidadIndividual(modalidad?: string | null): boolean {
  return /individual/i.test(String(modalidad || ""));
}

export function esModalidadParejas(modalidad?: string | null): boolean {
  return !esModalidadIndividual(modalidad);
}
