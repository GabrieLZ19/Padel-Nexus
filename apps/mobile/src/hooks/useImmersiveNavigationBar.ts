import * as NavigationBar from "expo-navigation-bar";
import { useEffect } from "react";
import { AppState, Platform } from "react-native";

const AUTO_HIDE_DELAY_MS = 2500;

async function applyImmersiveNavigationBar() {
  if (Platform.OS !== "android") return;

  await NavigationBar.setPositionAsync("absolute");
  await NavigationBar.setVisibilityAsync("hidden");
  await NavigationBar.setBehaviorAsync("overlay-swipe");
  await NavigationBar.setBackgroundColorAsync("#000000");
}

export function useImmersiveNavigationBar() {
  const visibility = NavigationBar.useVisibility();

  useEffect(() => {
    void applyImmersiveNavigationBar();

    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void applyImmersiveNavigationBar();
      }
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android" || visibility !== "visible") return;

    const timer = setTimeout(() => {
      void NavigationBar.setVisibilityAsync("hidden");
    }, AUTO_HIDE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [visibility]);
}
