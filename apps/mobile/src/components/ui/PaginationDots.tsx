import { View } from "react-native";

interface PaginationDotsProps {
  count: number;
  activeIndex: number;
}

export function PaginationDots({ count, activeIndex }: PaginationDotsProps) {
  return (
    <View className="flex-row items-center justify-center gap-2">
      {Array.from({ length: count }).map((_, index) => {
        const active = index === activeIndex;
        return (
          <View
            key={index}
            className={
              active
                ? "h-2 w-6 rounded-full bg-brand-chartreuse"
                : "h-2 w-2 rounded-full bg-brand-moss"
            }
          />
        );
      })}
    </View>
  );
}
