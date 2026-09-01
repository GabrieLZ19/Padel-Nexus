import { Redirect } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";

import { BrandMark } from "@/src/components/ui/BrandMark";
import { BrandWordmark } from "@/src/components/ui/BrandWordmark";
import { SplashLoader } from "@/src/components/ui/SplashLoader";
import { useAuthStore } from "@/src/stores/authStore";

const ONBOARDING_KEY = "padel_onboarding_seen";

export default function SplashScreen() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [ready, setReady] = useState(false);
  const [seenOnboarding, setSeenOnboarding] = useState<boolean | null>(null);

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    void hydrate();
    void SecureStore.getItemAsync(ONBOARDING_KEY).then((value) => {
      setSeenOnboarding(value === "1");
    });
  }, [hydrate]);

  useEffect(() => {
    opacity.value = withDelay(120, withSpring(1));
    translateY.value = withDelay(120, withSpring(0));
    const timer = setTimeout(() => setReady(true), 1400);
    return () => clearTimeout(timer);
  }, [opacity, translateY]);

  const contentStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (ready && isHydrated && seenOnboarding !== null) {
    if (isAuthenticated) {
      return <Redirect href="/(tabs)" />;
    }
    if (!seenOnboarding) {
      return <Redirect href="/(auth)/onboarding" />;
    }
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View className="flex-1 items-center justify-center bg-brand-black px-8">
      <Animated.View entering={FadeIn.duration(500)} exiting={FadeOut}>
        <BrandMark size={88} glow />
      </Animated.View>

      <Animated.View style={contentStyle} className="mt-8 w-full items-center">
        <BrandWordmark />
        <Text className="mt-3 w-full text-center font-sans text-base text-brand-muted">
          El ecosistema del pádel
        </Text>
        <View className="mt-10">
          <SplashLoader />
        </View>
      </Animated.View>
    </View>
  );
}
