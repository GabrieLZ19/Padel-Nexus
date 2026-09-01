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
      className="mb-3 flex-1 overflow-hidden rounded-card border border-brand-border bg-brand-surface active:opacity-90"
      style={{ maxWidth: "48%" }}
    >
      <View className="relative">
        {image ? (
          <Image
            source={{ uri: image }}
            style={{ width: "100%", height: 130 }}
            contentFit="cover"
          />
        ) : (
          <View className="h-[130px] items-center justify-center bg-brand-elevated">
            <FontAwesome name="shopping-bag" size={24} color="#CBFE01" />
          </View>
        )}
        <Pressable className="absolute right-2 top-2 h-8 w-8 items-center justify-center rounded-full bg-black/50">
          <FontAwesome name="heart-o" size={14} color="#FFFFFF" />
        </Pressable>
      </View>

      <View className="gap-1 p-3">
        <Text className="font-sans text-[10px] uppercase tracking-wider text-brand-muted">
          {producto.marca || producto.vendedor.nombre_tienda}
        </Text>
        <Text className="font-sans-semibold text-sm text-white" numberOfLines={2}>
          {producto.nombre}
        </Text>
        <View className="mt-1 flex-row items-center justify-between">
          <Text className="font-sans-bold text-base text-white">
            {formatCurrencyArs(producto.precio)}
          </Text>
          <View className="h-8 w-8 items-center justify-center rounded-xl bg-brand-chartreuse">
            <FontAwesome name="shopping-cart" size={14} color="#000000" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}
