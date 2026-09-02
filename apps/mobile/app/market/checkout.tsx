import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/src/components/ui/Button";
import { ScreenHeader } from "@/src/components/ui/ScreenHeader";
import { formatCurrencyArs } from "@/src/lib/format";
import { hrefMarketOrden } from "@/src/lib/navigation";
import {
  abrirCheckoutMercadoPago,
} from "@/src/services/pagos";
import { MarketplaceService } from "@/src/services/marketplace";
import { useAuthStore } from "@/src/stores/authStore";
import { useCartStore } from "@/src/stores/cartStore";

export default function MarketCheckoutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const usuario = useAuthStore((s) => s.usuario);
  const items = useCartStore((s) => s.items);
  const totalPrecio = useCartStore((s) => s.totalPrecio);
  const vaciar = useCartStore((s) => s.vaciar);
  const notasRef = useRef<TextInput>(null);

  const [nombre, setNombre] = useState(
    [usuario?.nombre, usuario?.apellido].filter(Boolean).join(" "),
  );
  const [direccion, setDireccion] = useState("");
  const [telefono, setTelefono] = useState(usuario?.telefono ?? "");
  const [notas, setNotas] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPagar() {
    if (items.length === 0) {
      setError("Tu carrito está vacío.");
      return;
    }
    if (!nombre.trim() || !direccion.trim() || !telefono.trim()) {
      setError("Completá nombre, dirección y teléfono.");
      return;
    }

    setProcesando(true);
    setError(null);

    try {
      const orden = await MarketplaceService.crearOrden({
        items: items.map((i) => ({
          productoId: i.productoId,
          cantidad: i.cantidad,
        })),
        datos_envio: {
          nombre: nombre.trim(),
          direccion: direccion.trim(),
          telefono: telefono.trim(),
          notas: notas.trim() || undefined,
        },
      });

      const preferencia = await MarketplaceService.pagarOrden(orden.id);
      const resultado = await abrirCheckoutMercadoPago(preferencia);

      if (resultado.tipo === "exito") {
        if (!preferencia.mockConfirmed) {
          await MarketplaceService.confirmarRetornoMp(
            orden.id,
            resultado.paymentId ?? `mobile-${Date.now()}`,
          );
        }
        vaciar();
        router.replace(hrefMarketOrden(orden.id));
        return;
      }

      if (resultado.tipo === "fallo") {
        setError("El pago no pudo completarse. Intentá nuevamente.");
        router.replace(hrefMarketOrden(orden.id));
        return;
      }

      // cerrado / pendiente: ir a la orden para poder completar pago
      vaciar();
      router.replace(hrefMarketOrden(orden.id));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al procesar la compra.");
    } finally {
      setProcesando(false);
    }
  }

  return (
    <View className="flex-1 bg-brand-black px-6">
      <ScreenHeader title="Checkout" />
      <KeyboardAwareScrollView
        bottomOffset={120}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120, gap: 16 }}
      >
        <View className="gap-3 rounded-card border border-brand-border bg-brand-surface p-4">
          <Text className="font-sans-semibold text-sm text-brand-muted">
            Resumen ({items.length} ítems)
          </Text>
          <Text className="font-sans-bold text-2xl text-brand-chartreuse">
            {formatCurrencyArs(totalPrecio())}
          </Text>
        </View>

        <View className="gap-3">
          <Text className="font-sans-semibold text-sm text-brand-muted">
            Datos de envío
          </Text>
          {(
            [
              { key: "nombre", label: "Nombre completo", value: nombre, set: setNombre },
              { key: "direccion", label: "Dirección", value: direccion, set: setDireccion },
              { key: "telefono", label: "Teléfono", value: telefono, set: setTelefono },
            ] as const
          ).map((field) => (
            <View key={field.key} className="gap-1.5">
              <Text className="font-sans-medium text-xs text-brand-muted">
                {field.label}
              </Text>
              <TextInput
                value={field.value}
                onChangeText={field.set}
                placeholderTextColor="#8A8A8A"
                className="rounded-card border border-brand-border bg-brand-elevated px-4 py-3 font-sans text-base text-white"
              />
            </View>
          ))}
          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-brand-muted">
              Notas (opcional)
            </Text>
            <TextInput
              ref={notasRef}
              value={notas}
              onChangeText={setNotas}
              multiline
              textAlignVertical="top"
              placeholder="Indicaciones de entrega, horarios, etc."
              placeholderTextColor="#8A8A8A"
              className="min-h-[100px] rounded-card border border-brand-border bg-brand-elevated px-4 py-3 font-sans text-base text-white"
            />
          </View>
        </View>

        <View className="flex-row items-start gap-3 rounded-card border border-brand-border bg-brand-elevated px-4 py-3">
          <FontAwesome name="credit-card" size={16} color="#CBFE01" />
          <Text className="flex-1 font-sans text-sm text-brand-muted">
            El pago se procesa con Mercado Pago de forma segura.
          </Text>
        </View>

        {error ? (
          <Text className="font-sans text-sm text-red-400">{error}</Text>
        ) : null}
      </KeyboardAwareScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 border-t border-brand-border bg-brand-black px-6 pt-4"
        style={{ paddingBottom: insets.bottom + 16 }}
      >
        <Button
          label="Pagar con Mercado Pago"
          loading={procesando}
          onPress={() => void onPagar()}
        />
      </View>
    </View>
  );
}
