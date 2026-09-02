import Constants from "expo-constants";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

import { PerfilService } from "@/src/services/perfil";

function permisosPushConcedidos(permissions: {
  granted?: boolean;
  status?: string;
}): boolean {
  return permissions.granted === true || permissions.status === "granted";
}

function pushRemotoDisponible(): boolean {
  // Expo Go en Android no soporta push remoto desde SDK 53.
  if (Constants.appOwnership === "expo" && Platform.OS === "android") {
    return false;
  }
  return true;
}

/**
 * Registra permisos y envía el Expo Push Token al backend cuando hay sesión.
 * En Expo Go (Android) se omite sin cargar expo-notifications.
 */
export function usePushNotifications(enabled: boolean) {
  const registeredRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled || !pushRemotoDisponible()) {
      if (__DEV__ && enabled && Constants.appOwnership === "expo") {
        console.info(
          "[push] Push remoto omitido en Expo Go. Usá un development build para probar push nativas.",
        );
      }
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const Device = await import("expo-device");
        if (!Device.isDevice) return;

        const Notifications = await import("expo-notifications");

        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            shouldShowBanner: true,
            shouldShowList: true,
          }),
        });

        if (Platform.OS === "android") {
          await Notifications.setNotificationChannelAsync("default", {
            name: "Padel Nexus",
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: "#CBFE01",
          });
        }

        const existing = await Notifications.getPermissionsAsync();
        if (!permisosPushConcedidos(existing as { granted?: boolean; status?: string })) {
          const requested = await Notifications.requestPermissionsAsync();
          if (!permisosPushConcedidos(requested as { granted?: boolean; status?: string })) {
            return;
          }
        }

        const projectId =
          Constants.expoConfig?.extra?.eas?.projectId ??
          Constants.easConfig?.projectId;

        if (!projectId) {
          if (__DEV__) {
            console.warn(
              "[push] Falta extra.eas.projectId en app.json para registrar push nativas.",
            );
          }
          return;
        }

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId,
        });
        const token = tokenData.data;

        if (!token || cancelled) return;
        if (registeredRef.current === token) return;

        await PerfilService.registrarPushToken(token);
        registeredRef.current = token;
      } catch (error) {
        if (__DEV__) {
          console.warn("[push] No se pudo registrar token:", error);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
