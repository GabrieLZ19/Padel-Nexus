import { Pressable, Text, View } from "react-native";

interface SegmentTabsProps<T extends string> {
  value: T;
  options: { id: T; label: string }[];
  onChange: (value: T) => void;
}

export function SegmentTabs<T extends string>({
  value,
  options,
  onChange,
}: SegmentTabsProps<T>) {
  return (
    <View className="flex-row rounded-cta border border-brand-border bg-brand-surface p-1">
      {options.map((option) => {
        const active = option.id === value;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            className={`flex-1 items-center rounded-[14px] py-2.5 ${
              active ? "bg-brand-chartreuse" : ""
            }`}
          >
            <Text
              className={`font-sans-semibold text-sm ${
                active ? "text-black" : "text-brand-muted"
              }`}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
