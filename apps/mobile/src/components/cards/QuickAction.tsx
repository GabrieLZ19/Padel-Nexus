import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";

type FaIcon = ComponentProps<typeof FontAwesome>["name"];
type MciIcon = ComponentProps<typeof MaterialCommunityIcons>["name"];

type QuickActionIcon =
  | { set: "fa"; name: FaIcon }
  | { set: "mci"; name: MciIcon };

interface QuickActionProps {
  label: string;
  icon: QuickActionIcon;
  onPress?: () => void;
}

export function QuickAction({ label, icon, onPress }: QuickActionProps) {
  return (
    <Pressable
      onPress={onPress}
      className="min-w-[22%] flex-1 items-center gap-2 rounded-card border border-brand-border bg-brand-surface px-2 py-3 active:opacity-90"
    >
      <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand-elevated">
        {icon.set === "mci" ? (
          <MaterialCommunityIcons name={icon.name} size={20} color="#CBFE01" />
        ) : (
          <FontAwesome name={icon.name} size={18} color="#CBFE01" />
        )}
      </View>
      <Text className="text-center font-sans-medium text-xs text-white">
        {label}
      </Text>
    </Pressable>
  );
}
