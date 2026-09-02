import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/src/components/ui/Button";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { formatCurrencyArs } from "@/src/lib/format";
import { useCartStore } from "@/src/stores/cartStore";

export default function CarritoScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const items = useCartStore((s) => s.items);
  const setCantidad = useCartStore((s) => s.setCantidad);
  const quitar = useCartStore((s) => s.quitar);
  const totalPrecio = useCartStore((s) => s.totalPrecio);

  return (
    <View className="flex-1 bg-brand-black px-6">
      <ScreenHeader title="Carrito" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 120,
          gap: 12,
          flexGrow: 1,
        }}
      >
        {items.length === 0 ? (
          <View className="flex-1 items-center justify-center gap-4 rounded-card border border-brand-border bg-brand-surface p-8">
            <FontAwesome name="shopping-cart" size={32} color="#8A8A8A" />
            <Text className="text-center font-sans text-base text-brand-muted">
              Tu carrito está vacío.
            </Text>
            <Button label="Explorar market" onPress={() => router.back()} />
          </View>
        ) : (
          items.map((item) => {
            const producto = item.producto;
            const imagen =
              producto?.thumbnail_url || producto?.imagenes?.[0] || null;
            return (
              <View
                key={item.productoId}
                className="flex-row gap-3 rounded-card border border-brand-border bg-brand-surface p-3"
              >
                {imagen ? (
                  <Image
                    source={{ uri: imagen }}
                    style={{ width: 72, height: 72, borderRadius: 12 }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="h-[72px] w-[72px] items-center justify-center rounded-xl bg-brand-elevated">
                    <FontAwesome name="shopping-bag" size={20} color="#CBFE01" />
                  </View>
                )}
                <View className="flex-1 gap-2">
                  <Text
                    className="font-sans-semibold text-base text-white"
                    numberOfLines={2}
                  >
                    {producto?.nombre ?? "Producto"}
                  </Text>
                  <Text className="font-sans-bold text-sm text-brand-chartreuse">
                    {formatCurrencyArs((producto?.precio ?? 0) * item.cantidad)}
                  </Text>
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <Pressable
                        onPress={() =>
                          setCantidad(item.productoId, item.cantidad - 1)
                        }
                      >
                        <FontAwesome name="minus-circle" size={20} color="#8A8A8A" />
                      </Pressable>
                      <Text className="font-sans-semibold text-sm text-white">
                        {item.cantidad}
                      </Text>
                      <Pressable
                        onPress={() =>
                          setCantidad(item.productoId, item.cantidad + 1)
                        }
                      >
                        <FontAwesome name="plus-circle" size={20} color="#CBFE01" />
                      </Pressable>
                    </View>
                    <Pressable onPress={() => quitar(item.productoId)}>
                      <FontAwesome name="trash-o" size={18} color="#F87171" />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {items.length > 0 ? (
        <View
          className="absolute bottom-0 left-0 right-0 border-t border-brand-border bg-brand-black px-6 pt-4"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <View className="mb-4 flex-row items-center justify-between">
            <Text className="font-sans text-sm text-brand-muted">Total</Text>
            <Text className="font-sans-bold text-xl text-white">
              {formatCurrencyArs(totalPrecio())}
            </Text>
          </View>
          <Button
            label="Ir al checkout"
            onPress={() => router.push("/market/checkout")}
          />
        </View>
      ) : null}
    </View>
  );
}
