import { Text, View } from "react-native";

export function BrandWordmark() {
  return (
    <View className="items-center">
      <View className="flex-row items-baseline justify-center">
        <Text className="font-sans-bold text-[34px] leading-[40px] text-white">
          padel
        </Text>
        <Text className="font-sans text-[34px] leading-[40px] text-brand-chartreuse">
          nexus
        </Text>
      </View>
    </View>
  );
}
