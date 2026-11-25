/** Texto de marca para UI pública; null si no hay marca (MKT-6). */
export function etiquetaMarcaProducto(marca?: string | null): string | null {
  const texto = marca?.trim();
  return texto ? texto : null;
}