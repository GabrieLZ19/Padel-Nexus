import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface ButtonProps {
  label: string;
  onPress?: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: "primary" | "ghost";
  trailingIcon?: React.ComponentProps<typeof FontAwesome>["name"];
}

export function Button({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = "primary",
  trailingIcon,
}: ButtonProps) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 18, stiffness: 320 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 18, stiffness: 320 });
      }}
      style={animatedStyle}
      className={`h-14 w-full flex-row items-center justify-center gap-2 rounded-cta ${
        variant === "primary" ? "bg-brand-chartreuse" : "bg-transparent"
      } ${isDisabled ? "opacity-50" : ""}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#000" : "#CBFE01"} />
      ) : (
        <>
          <Text
            className={`font-sans-bold text-base ${
              variant === "primary" ? "text-black" : "text-brand-chartreuse"
            }`}
          >
            {label}
          </Text>
          {trailingIcon ? (
            <FontAwesome
              name={trailingIcon}
              size={16}
              color={variant === "primary" ? "#000000" : "#CBFE01"}
            />
          ) : null}
        </>
      )}
    </AnimatedPressable>
  );
}
