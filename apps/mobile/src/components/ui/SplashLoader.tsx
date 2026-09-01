import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

function LoadingDot({ delay }: { delay: number }) {
  const scale = useSharedValue(0.85);
  const opacity = useSharedValue(0.35);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.15, { duration: 420, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.85, { duration: 420, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 420, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.35, { duration: 420, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View
      style={style}
      className="h-2 w-2 rounded-full bg-brand-chartreuse"
    />
  );
}

export function SplashLoader() {
  return (
    <View className="flex-row items-center justify-center gap-2.5">
      <LoadingDot delay={0} />
      <LoadingDot delay={160} />
      <LoadingDot delay={320} />
    </View>
  );
}
