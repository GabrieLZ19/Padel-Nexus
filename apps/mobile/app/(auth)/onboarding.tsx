import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInRight } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/src/components/ui/Button";
import { OnboardingIllustration } from "@/src/components/ui/OnboardingIllustration";
import { PaginationDots } from "@/src/components/ui/PaginationDots";

const ONBOARDING_KEY = "padel_onboarding_seen";

const SLIDES = [
  {
    title: "Reservá canchas",
    body: "Encontrá turnos cerca tuyo y confirmá en segundos.",
    icon: "calendar" as const,
  },
  {
    title: "Competí en torneos",
    body: "Inscribite a torneos locales, provinciales y nacionales. Seguí el cuadro y tus resultados en vivo.",
    icon: "trophy" as const,
  },
  {
    title: "Seguí tu ranking",
    body: "Consultá tu posición, licencia y evolución dentro del ecosistema FAP.",
    icon: "ranking" as const,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const slide = SLIDES[index];

  async function finish() {
    await SecureStore.setItemAsync(ONBOARDING_KEY, "1");
    router.replace("/(auth)/login");
  }

  function next() {
    if (index >= SLIDES.length - 1) {
      void finish();
      return;
    }
    setIndex((value) => value + 1);
  }

  return (
    <View
      className="flex-1 bg-brand-black px-6"
      style={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 }}
    >
      <View className="flex-row justify-end">
        <Pressable onPress={() => void finish()} accessibilityRole="button">
          <Text className="font-sans-medium text-base text-brand-muted">
            Saltar
          </Text>
        </Pressable>
      </View>

      <Animated.View
        key={slide.title}
        entering={FadeInRight.duration(320)}
        className="mt-10 flex-1 items-center"
      >
        <OnboardingIllustration icon={slide.icon} />
        <Text className="mt-10 text-center font-sans-bold text-3xl text-white">
          {slide.title}
        </Text>
        <Text className="mt-4 px-2 text-center font-sans text-base leading-6 text-brand-muted">
          {slide.body}
        </Text>
      </Animated.View>

      <PaginationDots count={SLIDES.length} activeIndex={index} />
      <View className="mt-8">
        <Button
          label={index === SLIDES.length - 1 ? "Comenzar" : "Siguiente"}
          trailingIcon={index === SLIDES.length - 1 ? undefined : "arrow-right"}
          onPress={next}
        />
      </View>
    </View>
  );
}
