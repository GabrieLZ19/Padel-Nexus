import { useCallback, useEffect, useState } from "react";

export interface UserCoords {
  latitude: number;
  longitude: number;
}

function permisoConcedido(status: string): boolean {
  return status === "granted";
}

/**
 * Ubicación del usuario. Import dinámico para no romper el bundle si hay
 * conflicto de versiones de expo-location en Metro/pnpm.
 */
export function useUserLocation() {
  const [coords, setCoords] = useState<UserCoords | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const Location = await import("expo-location");
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!permisoConcedido(status)) {
        setDenied(true);
        setCoords(null);
        return;
      }
      setDenied(false);
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      });
    } catch (error) {
      if (__DEV__) {
        console.warn("[location] No se pudo obtener ubicación:", error);
      }
      setCoords(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { coords, loading, denied, refresh };
}
