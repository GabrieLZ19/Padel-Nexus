import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { ComponentProps, ReactNode } from "react";
import { Pressable, Switch, Text, View } from "react-native";

type FaIcon = ComponentProps<typeof FontAwesome>["name"];
type MciIcon = ComponentProps<typeof MaterialCommunityIcons>["name"];

export type SettingsIcon =
  | { set: "fa"; name: FaIcon }
  | { set: "mci"; name: MciIcon };

function SettingsIconView({ icon }: { icon: SettingsIcon }) {
  if (icon.set === "mci") {
    return (
      <MaterialCommunityIcons name={icon.name} size={20} color="#CBFE01" />
    );
  }
  return <FontAwesome name={icon.name} size={18} color="#CBFE01" />;
}

export function SettingsSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-3">
      <Text className="font-sans-semibold text-xs tracking-[1.5px] text-brand-muted">
        {title}
      </Text>
      <View className="overflow-hidden rounded-card border border-brand-border bg-brand-surface">
        {children}
      </View>
    </View>
  );
}

export function SettingsNavRow({
  label,
  icon,
  onPress,
  isLast = false,
}: {
  label: string;
  icon: SettingsIcon;
  onPress?: () => void;
  isLast?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 px-4 py-4 active:bg-brand-elevated ${
        isLast ? "" : "border-b border-brand-border"
      }`}
    >
      <View className="h-9 w-9 items-center justify-center">
        <SettingsIconView icon={icon} />
      </View>
      <Text className="flex-1 font-sans-medium text-base text-white">
        {label}
      </Text>
      <FontAwesome name="chevron-right" size={12} color="#8A8A8A" />
    </Pressable>
  );
}

export function SettingsToggleRow({
  label,
  icon,
  value,
  onValueChange,
  isLast = false,
}: {
  label: string;
  icon: SettingsIcon;
  value: boolean;
  onValueChange: (next: boolean) => void;
  isLast?: boolean;
}) {
  return (
    <View
      className={`flex-row items-center gap-3 px-4 py-3.5 ${
        isLast ? "" : "border-b border-brand-border"
      }`}
    >
      <View className="h-9 w-9 items-center justify-center">
        <SettingsIconView icon={icon} />
      </View>
      <Text className="flex-1 font-sans-medium text-base text-white">
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#2A2A2A", true: "#CBFE01" }}
        thumbColor={value ? "#FFFFFF" : "#8A8A8A"}
        ios_backgroundColor="#2A2A2A"
      />
    </View>
  );
}
