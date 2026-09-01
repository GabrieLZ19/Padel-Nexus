import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Pressable, Text, TextInput, View } from "react-native";

interface SearchFieldProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
}

export function SearchField({
  value,
  onChangeText,
  placeholder = "Buscar...",
}: SearchFieldProps) {
  return (
    <View className="h-12 flex-row items-center gap-3 rounded-full border border-brand-border bg-brand-surface px-4">
      <FontAwesome name="search" size={16} color="#8A8A8A" />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#8A8A8A"
        className="flex-1 font-sans text-base text-white"
      />
    </View>
  );
}

interface FilterChipProps {
  label: string;
  active?: boolean;
  onPress?: () => void;
}

export function FilterChip({ label, active, onPress }: FilterChipProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-2 rounded-full border px-4 py-2 ${
        active
          ? "border-brand-chartreuse bg-brand-chartreuse/10"
          : "border-brand-border bg-brand-surface"
      }`}
    >
      <Text
        className={`font-sans-medium text-sm ${
          active ? "text-brand-chartreuse" : "text-white"
        }`}
      >
        {label}
      </Text>
      <FontAwesome
        name="chevron-down"
        size={10}
        color={active ? "#CBFE01" : "#8A8A8A"}
      />
    </Pressable>
  );
}
