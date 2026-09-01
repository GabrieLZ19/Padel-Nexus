import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Pressable, Text, View } from "react-native";

interface QuickActionProps {
  label: string;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
  onPress?: () => void;
}

export function QuickAction({ label, icon, onPress }: QuickActionProps) {
  return (
    <Pressable
      onPress={onPress}
      className="min-w-[46%] flex-1 items-center gap-2 rounded-card border border-brand-border bg-brand-surface px-3 py-4 active:opacity-90"
    >
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand-chartreuse/10">
        <FontAwesome name={icon} size={18} color="#CBFE01" />
      </View>
      <Text className="text-center font-sans-semibold text-sm text-white">
        {label}
      </Text>
    </Pressable>
  );
}
