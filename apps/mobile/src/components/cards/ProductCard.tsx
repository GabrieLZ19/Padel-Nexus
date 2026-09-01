import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import { formatCurrencyArs } from "@/src/lib/format";
import type { ProductoMarketplace } from "@/src/types/marketplace.types";

interface ProductCardProps {
  producto: ProductoMarketplace;
  onPress?: () => void;
}

export function ProductCard({ producto, onPress }: ProductCardProps) {
  const image =
    producto.thumbnail_url || producto.imagenes?.[0] || null;

  return (
    <Pressable
      onPress={onPress}
      className="flex-1 overflow-hidden rounded-card border border-brand-border bg-brand-surface active:opacity-90"
      style={{ maxWidth: "48%" }}
    >
      {image ? (
        <Image
          source={{ uri: image }}
          style={{ width: "100%", height: 120 }}
          contentFit="cover"
        />
      ) : (
        <View className="h-[120px] items-center justify-center bg-brand-elevated">
          <FontAwesome name="shopping-bag" size={24} color="#CBFE01" />
        </View>
      )}

      <View className="gap-1.5 p-3">
        <Text className="font-sans-semibold text-sm text-white" numberOfLines={2}>
          {producto.nombre}
        </Text>
        <Text className="font-sans text-[11px] text-brand-muted" numberOfLines={1}>
          {producto.vendedor.nombre_tienda}
        </Text>
        <Text className="font-sans-bold text-sm text-brand-chartreuse">
          {formatCurrencyArs(producto.precio)}
        </Text>
      </View>
    </Pressable>
  );
}
