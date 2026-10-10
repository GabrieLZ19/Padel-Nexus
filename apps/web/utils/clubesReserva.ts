export interface ClubReservable {
  nombre: string;
  canchas: number;
  distancia_km?: number | null;
}

/** Clubes con al menos una cancha. Con ubicación, del más cercano al más lejano. */
export function clubesVisiblesEnReserva<T extends ClubReservable>(
  clubes: T[],
  hayUbicacion: boolean,
): T[] {
  const conCanchas = clubes.filter((club) => Number(club.canchas) > 0);
  if (!hayUbicacion) return conCanchas;

  return [...conCanchas].sort((a, b) => {
    const da = a.distancia_km;
    const db = b.distancia_km;
    if (da == null && db == null) return a.nombre.localeCompare(b.nombre, "es");
    if (da == null) return 1;
    if (db == null) return -1;
    if (da !== db) return da - db;
    return a.nombre.localeCompare(b.nombre, "es");
  });
}
