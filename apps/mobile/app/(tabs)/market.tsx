import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ProductCard } from "@/src/components/cards/ProductCard";
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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [cats, productosPage] = await Promise.all([
      MarketplaceService.getCategorias().catch(() => []),
      MarketplaceService.getProductos({
        categoria_id: categoriaActiva || undefined,
        por_pagina: 24,
      }),
    ]);
    setCategorias(cats);
    setProductos(productosPage.data || []);
  }, [categoriaActiva]);

  useEffect(() => {
    setLoading(true);
    void loadData()
      .catch(() => setProductos([]))
      .finally(() => setLoading(false));
  }, [loadData]);

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
          <View className="gap-1">
            <Text className="font-sans-bold text-3xl text-white">Market</Text>
            <Text className="font-sans text-base text-brand-muted">
              Productos y servicios de la comunidad
            </Text>
          </View>

          {categorias.length > 0 ? (
            <FlatList
              horizontal
              data={[{ id: "all", nombre: "Todos" }, ...categorias]}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item }) => {
                const active =
                  item.id === "all"
                    ? categoriaActiva === null
                    : categoriaActiva === item.id;
                return (
                  <Pressable
                    onPress={() =>
                      setCategoriaActiva(item.id === "all" ? null : item.id)
                    }
                    className={`rounded-full px-4 py-2 ${
                      active
                        ? "bg-brand-chartreuse"
                        : "border border-brand-border bg-brand-surface"
                    }`}
                  >
                    <Text
                      className={`font-sans-semibold text-sm ${
                        active ? "text-black" : "text-white"
                      }`}
                    >
                      {item.nombre}
                    </Text>
                  </Pressable>
                );
              }}
            />
          ) : null}
        </View>
      }
      renderItem={({ item }) => <ProductCard producto={item} />}
      ListEmptyComponent={
        loading ? (
          <View className="flex-row flex-wrap gap-3">
            <Skeleton className="h-44 flex-1" />
            <Skeleton className="h-44 flex-1" />
            <Skeleton className="h-44 flex-1" />
            <Skeleton className="h-44 flex-1" />
          </View>
        ) : (
          <View className="flex-1 items-center justify-center rounded-card border border-brand-border bg-brand-surface p-6">
            <Text className="text-center font-sans text-base text-brand-muted">
              No hay productos publicados todavía.
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
