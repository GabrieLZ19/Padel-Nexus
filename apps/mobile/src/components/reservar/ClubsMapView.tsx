import { useMemo } from "react";

import {
  ClubsInteractiveFallback,
  type ClubsInteractiveFallbackProps,
} from "@/src/components/reservar/ClubsInteractiveFallback";
import { LeafletClubsMap } from "@/src/components/reservar/LeafletClubsMap";
import { SafeErrorBoundary } from "@/src/components/ui/SafeErrorBoundary";
import type { UserCoords } from "@/src/hooks/useUserLocation";
import type { Club } from "@/src/types/club.types";

export interface ClubsMapViewProps {
  clubs: Club[];
  userCoords?: UserCoords | null;
  selectedClubId?: string | null;
  onSelectClub?: (clubId: string) => void;
  height?: number;
}

/**
 * Mapa interactivo de clubes basado en Leaflet + OpenStreetMap (CartoDB Dark Matter).
 * - 100% gratuito y de código abierto (sin costos ni cuenta de Google Cloud / facturación).
 * - Estilo oscuro de alta calidad acorde a la identidad visual de Padel Nexus.
 * - Marcadores personalizados en color chartreuse con soporte de selección.
 * - Libre de dependencias nativas de Google Play Services, inmune a los cierres
 *   repentinos en Android APK preview / producción.
 */
export function ClubsMapView(props: ClubsMapViewProps) {
  const hasValidCoords = useMemo(
    () =>
      props.clubs.some(
        (c) =>
          c.latitud != null &&
          c.longitud != null &&
          Number.isFinite(Number(c.latitud)) &&
          Number.isFinite(Number(c.longitud)) &&
          Number(c.latitud) !== 0,
      ),
    [props.clubs],
  );

  if (!hasValidCoords) {
    return <ClubsInteractiveFallback {...props} />;
  }

  return (
    <SafeErrorBoundary fallback={<ClubsInteractiveFallback {...props} />}>
      <LeafletClubsMap {...props} />
    </SafeErrorBoundary>
  );
}

export { ClubsInteractiveFallback, LeafletClubsMap };
export type { ClubsInteractiveFallbackProps };
