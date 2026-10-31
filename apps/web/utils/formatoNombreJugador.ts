/**
 * Normaliza y formatea el nombre completo del jugador para vistas públicas y listados.
 * Si no tiene apellido, muestra el nombre directamente sin coma inicial (ej: "Gabriel" en vez de ", Gabriel").
 */
export function formatNombreJugador(
  nombre?: string | null,
  apellido?: string | null,
  fallback: string = "Jugador anónimo",
): string {
  const nom = (nombre || "").trim();
  const ape = (apellido || "").trim();

  if (ape && nom) {
    return `${ape.toUpperCase()}, ${nom}`;
  }
  if (nom) {
    return nom;
  }
  if (ape) {
    return ape.toUpperCase();
  }
  return fallback;
}
