import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { Button } from "@/src/components/ui/Button";
import { ImageLightbox } from "@/src/components/ui/ImageLightbox";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { formatCurrencyArs } from "@/src/lib/format";
import { hrefMarketCarrito } from "@/src/lib/navigation";
import { MarketplaceService } from "@/src/services/marketplace";
import { useCartStore } from "@/src/stores/cartStore";
import type { ProductoMarketplace } from "@/src/types/marketplace.types";

const { width } = Dimensions.get("window");

export default function ProductoDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const agregar = useCartStore((s) => s.agregar);

  const [producto, setProducto] = useState<ProductoMarketplace | null>(null);
  const [favorito, setFavorito] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const [prod, esFav] = await Promise.all([
      MarketplaceService.getProducto(id),
      MarketplaceService.esFavorito(id).catch(() => false),
    ]);
    setProducto(prod);
    setFavorito(esFav);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      setError(null);
      void load()
        .catch((err: unknown) => {
          setError(
            err instanceof Error ? err.message : "No se pudo cargar el producto.",
          );
        })
        .finally(() => setLoading(false));
    }, [load]),
  );

  async function onToggleFavorito() {
    if (!id) return;
    try {
      const res = await MarketplaceService.toggleFavorito(id);
      setFavorito(res.favorito);
    } catch {
      // silencioso
    }
  }

  function onAgregarCarrito() {
    if (!producto) return;
    agregar(producto, cantidad);
    router.push(hrefMarketCarrito());
  }

  const imagenes =
    producto?.imagenes?.length
      ? producto.imagenes
      : producto?.thumbnail_url
        ? [producto.thumbnail_url]
        : [];
  const imagen = imagenes[0] || null;
  const stock = producto?.stock;
  const sinStock =
    producto?.tipo === "producto" && stock != null && stock <= 0;

  return (
    <View className="flex-1 bg-brand-black">
      <View className="px-6">
        <ScreenHeader title="Producto" />
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#CBFE01" />
        </View>
      ) : error || !producto ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center font-sans text-base text-red-400">
            {error || "Producto no encontrado."}
          </Text>
        </View>
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
          >
            <View className="relative">
              {imagen ? (
                <Pressable onPress={() => setLightboxUri(imagen)}>
                  <Image
                    source={{ uri: imagen }}
                    style={{ width, height: width * 0.85 }}
                    contentFit="cover"
                  />
                  <View className="absolute bottom-3 right-3 flex-row items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5">
                    <FontAwesome name="expand" size={12} color="#FFFFFF" />
                    <Text className="font-sans-medium text-xs text-white">
                      Ver foto
                    </Text>
                  </View>
                </Pressable>
              ) : (
                <View
                  style={{ width, height: width * 0.6 }}
                  className="items-center justify-center bg-brand-surface"
                >
                  <FontAwesome name="shopping-bag" size={40} color="#CBFE01" />
                </View>
              )}
              <Pressable
                onPress={() => void onToggleFavorito()}
                className="absolute right-6 top-4 h-11 w-11 items-center justify-center rounded-full bg-black/60"
              >
                <FontAwesome
                  name={favorito ? "heart" : "heart-o"}
                  size={18}
                  color={favorito ? "#F87171" : "#FFFFFF"}
                />
              </Pressable>
            </View>

            {imagenes.length > 1 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingHorizontal: 24, paddingTop: 12 }}
              >
                {imagenes.map((uri) => (
                  <Pressable key={uri} onPress={() => setLightboxUri(uri)}>
                    <Image
                      source={{ uri }}
                      style={{ width: 64, height: 64, borderRadius: 10 }}
                      contentFit="cover"
                    />
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}

            <View className="gap-4 px-6 pt-5">
              <View>
                <Text className="font-sans text-xs uppercase tracking-wider text-brand-muted">
                  {producto.marca || producto.vendedor.nombre_tienda}
                </Text>
                <Text className="mt-1 font-sans-bold text-2xl text-white">
                  {producto.nombre}
                </Text>
                <Text className="mt-1 font-sans text-sm text-brand-muted">
                  {producto.categoria.nombre} · {producto.tipo}
                </Text>
              </View>

              <View className="flex-row items-end gap-3">
                <Text className="font-sans-bold text-3xl text-brand-chartreuse">
                  {formatCurrencyArs(producto.precio)}
                </Text>
                {producto.precio_anterior ? (
                  <Text className="mb-1 font-sans text-base text-brand-muted line-through">
                    {formatCurrencyArs(producto.precio_anterior)}
                  </Text>
                ) : null}
              </View>

              {producto.descripcion ? (
                <Text className="font-sans text-base leading-6 text-brand-muted">
                  {producto.descripcion}
                </Text>
              ) : null}

              {producto.tipo === "producto" && stock != null ? (
                <Text className="font-sans text-sm text-brand-muted">
                  Stock disponible: {stock}
                </Text>
              ) : null}

              <View className="flex-row items-center gap-4">
                <Text className="font-sans-semibold text-sm text-white">
                  Cantidad
                </Text>
                <View className="flex-row items-center gap-3 rounded-card border border-brand-border bg-brand-surface px-3 py-2">
                  <Pressable
                    onPress={() => setCantidad((c) => Math.max(1, c - 1))}
                  >
                    <FontAwesome name="minus" size={14} color="#FFFFFF" />
                  </Pressable>
                  <Text className="min-w-[24px] text-center font-sans-bold text-base text-white">
                    {cantidad}
                  </Text>
                  <Pressable
                    onPress={() =>
                      setCantidad((c) =>
                        stock != null ? Math.min(stock, c + 1) : c + 1,
                      )
                    }
                  >
                    <FontAwesome name="plus" size={14} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>

          <View
            className="absolute bottom-0 left-0 right-0 border-t border-brand-border bg-brand-black px-6 pt-4"
            style={{ paddingBottom: insets.bottom + 16 }}
          >
            <Button
              label={sinStock ? "Sin stock" : "Agregar al carrito"}
              disabled={sinStock}
              onPress={onAgregarCarrito}
            />
          </View>
        </>
      )}

      <ImageLightbox
        uri={lightboxUri}
        visible={Boolean(lightboxUri)}
        onClose={() => setLightboxUri(null)}
      />
    </View>
  );
}
