import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
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
import {
  formatCurrencyArs,
  formatDateShort,
  formatOrdenSlug,
} from "@/src/lib/format";
import { hrefMarketProducto } from "@/src/lib/navigation";
import { abrirCheckoutMercadoPago } from "@/src/services/pagos";
import { MarketplaceService } from "@/src/services/marketplace";
import type { OrdenMarketplace } from "@/src/types/marketplace.types";

function estadoOrdenLabel(estado: string): string {
  const e = estado.toLowerCase();
  if (e === "pagada") return "Pagada";
  if (e === "pendiente") return "Pendiente de pago";
  if (e === "entregada") return "Entregada";
  if (e === "cancelada") return "Cancelada";
  return estado;
}

function estadoColor(estado: string): string {
  const e = estado.toLowerCase();
  if (e === "pagada" || e === "entregada") return "#10B981";
  if (e === "pendiente") return "#F59E0B";
  if (e === "cancelada") return "#F87171";
  return "#8A8A8A";
}

export default function OrdenDetalleScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [orden, setOrden] = useState<OrdenMarketplace | null>(null);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const data = await MarketplaceService.getOrden(id);
    setOrden(data);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      setLoading(true);
      setError(null);
      void load()
        .catch((err: unknown) => {
          setError(
            err instanceof Error ? err.message : "No se encontró la orden.",
          );
        })
        .finally(() => setLoading(false));
    }, [id, load]),
  );

  async function onCompletarPago() {
    if (!orden || !id) return;
    setProcesando(true);
    setError(null);
    try {
      const preferencia = await MarketplaceService.pagarOrden(id);
      const resultado = await abrirCheckoutMercadoPago(preferencia);

      if (resultado.tipo === "exito") {
        if (!preferencia.mockConfirmed) {
          await MarketplaceService.confirmarRetornoMp(
            id,
            resultado.paymentId ?? `mobile-${Date.now()}`,
          );
        }
        await load();
        return;
      }

      if (resultado.tipo === "fallo") {
        setError("El pago no pudo completarse.");
        return;
      }

      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo completar el pago.");
    } finally {
      setProcesando(false);
    }
  }

  const pendiente = (orden?.estado || "").toLowerCase() === "pendiente";

  return (
    <View className="flex-1 bg-brand-black px-6">
      <ScreenHeader title="Detalle de orden" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100, gap: 16 }}
      >
        {loading ? (
          <View className="h-48 items-center justify-center">
            <ActivityIndicator color="#CBFE01" />
          </View>
        ) : error && !orden ? (
          <Text className="font-sans text-sm text-red-400">
            {error}
          </Text>
        ) : orden ? (
          <>
            <View className="gap-2 rounded-card border border-brand-border bg-brand-surface p-5">
              <Text className="font-sans-bold text-lg text-white">
                {formatOrdenSlug(orden.id)}
              </Text>
              <View className="flex-row items-center gap-2">
                <View
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: estadoColor(orden.estado) }}
                />
                <Text
                  className="font-sans-semibold text-sm"
                  style={{ color: estadoColor(orden.estado) }}
                >
                  {estadoOrdenLabel(orden.estado)}
                </Text>
              </View>
              <Text className="font-sans text-sm text-brand-muted">
                {orden.created_at
                  ? formatDateShort(orden.created_at.slice(0, 10))
                  : ""}
              </Text>
              <Text className="mt-2 font-sans-bold text-2xl text-brand-chartreuse">
                {formatCurrencyArs(orden.total)}
              </Text>
            </View>

            {orden.datos_envio ? (
              <View className="gap-2 rounded-card border border-brand-border bg-brand-surface p-4">
                <Text className="font-sans-semibold text-sm text-brand-muted">
                  Envío
                </Text>
                <Text className="font-sans text-base text-white">
                  {orden.datos_envio.nombre}
                </Text>
                <Text className="font-sans text-sm text-brand-muted">
                  {orden.datos_envio.direccion}
                </Text>
                <Text className="font-sans text-sm text-brand-muted">
                  {orden.datos_envio.telefono}
                </Text>
                {orden.datos_envio.notas ? (
                  <Text className="font-sans text-sm text-brand-muted">
                    Notas: {orden.datos_envio.notas}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {orden.items && orden.items.length > 0 ? (
              <View className="gap-3 rounded-card border border-brand-border bg-brand-surface p-4">
                <Text className="font-sans-semibold text-sm text-brand-muted">
                  Productos
                </Text>
                {orden.items.map((item) => {
                  const foto =
                    item.producto?.thumbnail_url ||
                    item.producto?.imagenes?.[0] ||
                    null;
                  return (
                    <Pressable
                      key={item.id}
                      onPress={() => {
                        if (item.producto?.id) {
                          router.push(hrefMarketProducto(item.producto.id));
                        }
                      }}
                      className="flex-row items-center gap-3 border-b border-brand-border py-3 last:border-b-0"
                    >
                      <Pressable
                        onPress={() => {
                          if (foto) setLightboxUri(foto);
                        }}
                      >
                        {foto ? (
                          <Image
                            source={{ uri: foto }}
                            style={{ width: 64, height: 64, borderRadius: 12 }}
                            contentFit="cover"
                          />
                        ) : (
                          <View className="h-16 w-16 items-center justify-center rounded-xl bg-brand-elevated">
                            <FontAwesome
                              name="shopping-bag"
                              size={18}
                              color="#CBFE01"
                            />
                          </View>
                        )}
                      </Pressable>
                      <View className="flex-1 pr-2">
                        <Text className="font-sans-medium text-sm text-white">
                          {item.producto?.nombre ?? "Producto"}
                        </Text>
                        <Text className="font-sans text-xs text-brand-muted">
                          x{item.cantidad} · {formatCurrencyArs(item.precio_unitario)}
                        </Text>
                      </View>
                      <Text className="font-sans-semibold text-sm text-white">
                        {formatCurrencyArs(item.precio_unitario * item.cantidad)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            {error ? (
              <Text className="font-sans text-sm text-red-400">{error}</Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>

      {pendiente ? (
        <View
          className="absolute bottom-0 left-0 right-0 border-t border-brand-border bg-brand-black px-6 pt-4"
          style={{ paddingBottom: insets.bottom + 16 }}
        >
          <Button
            label="Completar pago"
            loading={procesando}
            onPress={() => void onCompletarPago()}
          />
        </View>
      ) : null}

      <ImageLightbox
        uri={lightboxUri}
        visible={Boolean(lightboxUri)}
        onClose={() => setLightboxUri(null)}
      />
    </View>
  );
}
