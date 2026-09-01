import { View, type ViewProps } from "react-native";
import { cn } from "@/src/lib/cn";

interface SkeletonProps extends ViewProps {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <View
      className={cn("rounded-card bg-brand-elevated/80", className)}
      {...props}
    />
  );
}
