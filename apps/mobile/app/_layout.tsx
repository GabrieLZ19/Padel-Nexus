import "../global.css";

import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ThemeProvider, DarkTheme } from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import "react-native-reanimated";
import { StatusBar } from "expo-status-bar";
import { useImmersiveNavigationBar } from "@/src/hooks/useImmersiveNavigationBar";

export { ErrorBoundary } from "expo-router";

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: "#000000",
    card: "#121212",
    primary: "#CBFE01",
    text: "#FFFFFF",
    border: "#2A2A2A",
  },
};

export default function RootLayout() {
  useImmersiveNavigationBar();

  const [loaded, error] = useFonts({
    MuseoModerno: require("../assets/fonts/MuseoModerno-Regular.ttf"),
    "MuseoModerno-Medium": require("../assets/fonts/MuseoModerno-Medium.ttf"),
    "MuseoModerno-SemiBold": require("../assets/fonts/MuseoModerno-SemiBold.ttf"),
    "MuseoModerno-Bold": require("../assets/fonts/MuseoModerno-Bold.ttf"),
    ...FontAwesome.font,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      void SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <ThemeProvider value={navTheme}>
          <StatusBar style="light" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#000" } }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen
              name="notificaciones"
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
          </Stack>
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
