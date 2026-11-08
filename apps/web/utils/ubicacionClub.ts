type ClubUbicacion = {
  nombre?: string | null;
  direccion?: string | null;
  localidad?: string | null;
  provincia?: string | null;
  latitud?: number | null;
  longitud?: number | null;
};

function norm(value?: string | null): string {
  return String(value || "").trim();
}

/** Texto visible de ubicación (prioriza dirección calle). */
export function textoUbicacionClub(club: ClubUbicacion): string {
  const direccion = norm(club.direccion);
  if (direccion) return direccion;

  const localidad = norm(club.localidad);
  const provincia = norm(club.provincia);
  if (localidad && provincia && localidad.toLowerCase() === provincia.toLowerCase()) {
    return localidad;
  }
  const partes = [localidad, provincia].filter(Boolean);
  return partes.length > 0 ? partes.join(", ") : "Ver en mapa";
}

export function consultaMapaUbicacionClub(club: ClubUbicacion): string {
  const nombre = norm(club.nombre);
  const direccion = norm(club.direccion);
  const localidad = norm(club.localidad);
  const provincia = norm(club.provincia);
  return [nombre, direccion, localidad, provincia, "Argentina"]
    .filter(Boolean)
    .join(", ");
}

export function urlGoogleMapsClub(club: ClubUbicacion): string {
  if (club.latitud != null && club.longitud != null) {
    return `https://www.google.com/maps/search/?api=1&query=${club.latitud},${club.longitud}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    consultaMapaUbicacionClub(club),
  )}`;
}
