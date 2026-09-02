import { useCallback, useEffect, useMemo, useState } from "react";
import { formatIsoDate } from "@/src/lib/dateUtils";
import { formatTime } from "@/src/lib/format";
import { ClubesService } from "@/src/services/clubes";
import { ReservasService } from "@/src/services/reservas";
import type { Club, ClubConDisponibilidad } from "@/src/types/club.types";

export function useClubesCercanos(options?: {
  lat?: number | null;
  lng?: number | null;
  search?: string;
}) {
  const [clubes, setClubes] = useState<ClubConDisponibilidad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const hoy = formatIsoDate(new Date());
      const list = await ClubesService.getAll({
        limit: 30,
        search: options?.search,
        lat: options?.lat ?? undefined,
        lng: options?.lng ?? undefined,
        ordenar: options?.lat == null ? "distancia" : undefined,
      });

      const enriched = await Promise.all(
        list.slice(0, 12).map(async (club): Promise<ClubConDisponibilidad> => {
          try {
            const slots = await ReservasService.getDisponibles(club.id, hoy);
            const disponibles = slots.filter((s) => s.disponible);
            const horarios = disponibles
              .slice(0, 3)
              .map((s) => formatTime(s.hora_inicio));
            const precio_desde =
              disponibles.length > 0
                ? Math.min(...disponibles.map((s) => s.precio))
                : null;
            return { ...club, horarios_hoy: horarios, precio_desde };
          } catch {
            return club;
          }
        }),
      );

      const rest = list.slice(12).map((club) => ({ ...club }));
      setClubes([...enriched, ...rest]);
    } catch (err: unknown) {
      setClubes([]);
      setError(
        err instanceof Error ? err.message : "No se pudieron cargar los clubes.",
      );
    } finally {
      setLoading(false);
    }
  }, [options?.lat, options?.lng, options?.search]);

  useEffect(() => {
    void load();
  }, [load]);

  const disponiblesCount = useMemo(
    () => clubes.filter((c) => (c.horarios_hoy?.length ?? 0) > 0).length,
    [clubes],
  );

  return { clubes, loading, error, disponiblesCount, reload: load };
}
