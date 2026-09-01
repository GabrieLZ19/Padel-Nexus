import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProductCard } from "@/src/components/cards/ProductCard";
import { MarketCategoryIcon } from "@/src/components/market/MarketCategoryIcon";
import { SearchField } from "@/src/components/ui/SearchField";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { MarketplaceService } from "@/src/services/marketplace";
import type {
  CategoriaMarketplace,
  ProductoMarketplace,
} from "@/src/types/marketplace.types";

export default function MarketTab() {
  const insets = useSafeAreaInsets();
  const [productos, setProductos] = useState<ProductoMarketplace[]>([]);
  const [categorias, setCategorias] = useState<CategoriaMarketplace[]>([]);
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [cats, productosPage] = await Promise.all([
      MarketplaceService.getCategorias().catch(() => []),
      MarketplaceService.getProductos({
        categoria_id: categoriaActiva || undefined,
        busqueda: busqueda.trim() || undefined,
        por_pagina: 24,
      }),
    ]);
    setCategorias(cats);
    setProductos(productosPage.data);
  }, [categoriaActiva, busqueda]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      void loadData()
        .catch(() => setProductos([]))
        .finally(() => setLoading(false));
    }, busqueda ? 300 : 0);
    return () => clearTimeout(timer);
  }, [loadData, busqueda]);

  const destacados = useMemo(
    () => productos.filter((p) => p.destacado).slice(0, 4),
    [productos],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  return (
    <FlatList
      className="flex-1 bg-brand-black"
      data={loading ? [] : productos}
      keyExtractor={(item) => item.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 12 }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 24,
        paddingHorizontal: 24,
        gap: 12,
        flexGrow: 1,
      }}
      ListHeaderComponent={
        <View className="mb-2 gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-sans-bold text-3xl text-white">Market</Text>
            <Pressable className="relative h-11 w-11 items-center justify-center rounded-full border border-brand-border bg-brand-surface">
              <FontAwesome name="shopping-cart" size={18} color="#FFFFFF" />
              <View className="absolute -right-0.5 -top-0.5 h-4 w-4 items-center justify-center rounded-full bg-brand-chartreuse">
                <Text className="font-sans-bold text-[10px] text-black">0</Text>
              </View>
            </Pressable>
          </View>

          <SearchField
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar palas, pelotas, indumentaria"
          />

          {categorias.length > 0 ? (
            <View className="flex-row justify-between gap-2">
              {categorias.slice(0, 4).map((cat) => {
                const active = categoriaActiva === cat.id;
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() =>
                      setCategoriaActiva(active ? null : cat.id)
                    }
                    className={`flex-1 items-center gap-2 rounded-card border px-2 py-3 ${
                      active
                        ? "border-brand-chartreuse bg-brand-chartreuse"
                        : "border-brand-border bg-brand-surface"
                    }`}
                  >
                    <MarketCategoryIcon
                      slug={cat.slug}
                      nombre={cat.nombre}
                      color={active ? "#000000" : "#CBFE01"}
                    />
                    <Text
                      className={`text-center font-sans-medium text-xs ${
                        active ? "text-black" : "text-white"
                      }`}
                      numberOfLines={1}
                    >
                      {cat.nombre}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          ) : null}

          {destacados.length > 0 ? (
            <View className="gap-2">
              <View className="flex-row items-center justify-between">
                <Text className="font-sans-bold text-lg text-white">Destacados</Text>
                <Text className="font-sans-semibold text-sm text-brand-chartreuse">
                  Ver todo
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      }
      renderItem={({ item }) => <ProductCard producto={item} />}
      ListEmptyComponent={
        loading ? (
          <View className="flex-row flex-wrap gap-3">
            <Skeleton className="h-48 flex-1" />
            <Skeleton className="h-48 flex-1" />
          </View>
        ) : (
          <View className="flex-1 items-center justify-center rounded-card border border-brand-border bg-brand-surface p-6">
            <Text className="text-center font-sans text-base text-brand-muted">
              No hay productos para mostrar.
            </Text>
          </View>
        )
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void onRefresh()}
          tintColor="#CBFE01"
        />
      }
      showsVerticalScrollIndicator={false}
    />
  );
}
