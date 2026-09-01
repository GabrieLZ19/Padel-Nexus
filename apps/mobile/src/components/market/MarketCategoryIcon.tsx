import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import type { ComponentProps } from "react";
import { View } from "react-native";

type MciIcon = ComponentProps<typeof MaterialCommunityIcons>["name"];

const SLUG_ICONOS: Record<string, MciIcon> = {
  palas: "tennis",
  pala: "tennis",
  pelotas: "tennis-ball",
  pelota: "tennis-ball",
  ropa: "tshirt-crew-outline",
  indumentaria: "tshirt-crew-outline",
  accesorios: "bag-personal-outline",
  accesorio: "bag-personal-outline",
  servicios: "hand-heart-outline",
  servicio: "hand-heart-outline",
};

function resolveIcon(slug: string, nombre: string): MciIcon {
  const key = slug.toLowerCase().trim();
  if (SLUG_ICONOS[key]) return SLUG_ICONOS[key];

  const nombreNorm = nombre.toLowerCase();
  if (nombreNorm.includes("pala")) return "tennis";
  if (nombreNorm.includes("pelota")) return "tennis-ball";
  if (nombreNorm.includes("ropa") || nombreNorm.includes("indument")) {
    return "tshirt-crew-outline";
  }
  if (nombreNorm.includes("accesor") || nombreNorm.includes("bolso")) {
    return "bag-personal-outline";
  }

  return "store-outline";
}

interface MarketCategoryIconProps {
  slug: string;
  nombre: string;
  size?: number;
  color: string;
}

export function MarketCategoryIcon({
  slug,
  nombre,
  size = 22,
  color,
}: MarketCategoryIconProps) {
  return (
    <View className="h-8 w-8 items-center justify-center">
      <MaterialCommunityIcons
        name={resolveIcon(slug, nombre)}
        size={size}
        color={color}
      />
    </View>
  );
}
