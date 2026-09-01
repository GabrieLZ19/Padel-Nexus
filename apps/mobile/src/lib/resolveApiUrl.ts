import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * En Expo Go (dispositivo físico), localhost apunta al teléfono.
 * Reemplazamos por la IP del bundler (misma máquina que corre Metro/API).
 */
export function resolveApiUrl(): string {
  const configured =
    process.env.EXPO_PUBLIC_API_URL?.trim() || "http://localhost:4000/api";

  if (
    !configured.includes("localhost") &&
    !configured.includes("127.0.0.1")
  ) {
    return configured;
  }

  const hostUri =
    Constants.expoConfig?.hostUri ??
    Constants.linkingUri ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  const debuggerHost =
    typeof hostUri === "string" ? hostUri.split(":")[0] : undefined;

  if (debuggerHost) {
    return configured
      .replace("localhost", debuggerHost)
      .replace("127.0.0.1", debuggerHost);
  }

  if (Platform.OS === "android") {
    return configured
      .replace("localhost", "10.0.2.2")
      .replace("127.0.0.1", "10.0.2.2");
  }

  return configured;
}
