/** Etiqueta de jugador en inscripciones: `APELLIDO, Nombre`. */
export function formatNombreInscripcionJugador(
  apellido?: string | null,
  nombre?: string | null,
): string {
  const ap = (apellido || "").trim();
  const nom = (nombre || "").trim();
  if (ap && nom) {
    return `${ap.toUpperCase()}, ${nom}`;
  }
  if (ap) {
    return ap.toUpperCase();
  }
  if (nom) {
    return nom;
  }
  return "Desconocido";
}