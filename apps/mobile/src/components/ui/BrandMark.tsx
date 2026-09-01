import { Platform, View } from "react-native";

import { LogoAccessory } from "@/src/components/ui/BrandLogo";

interface BrandMarkProps {
  size?: number;
  glow?: boolean;
}

export function BrandMark({ size = 72, glow = false }: BrandMarkProps) {
  return (
    <View
      className="items-center justify-center"
      style={{ width: size, height: size }}
    >
      <View
        className="items-center justify-center overflow-hidden rounded-2xl"
        style={[
          { width: size, height: size },
          glow
            ? Platform.select({
                ios: {
                  shadowColor: "#CBFE01",
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: 0.38,
                  shadowRadius: 22,
                },
                android: {
                  elevation: 14,
                },
                default: {},
              })
            : undefined,
        ]}
      >
        <LogoAccessory size={size} />
      </View>
    </View>
  );
}
