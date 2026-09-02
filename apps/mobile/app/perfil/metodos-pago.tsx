import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ScreenHeader } from "@/src/components/ui/ScreenHeader";

const METODOS = [
  {
    icon: "credit-card" as const,
    titulo: "Mercado Pago",
    descripcion:
      "Usado en reservas de cancha y compras del marketplace. Se abre el checkout seguro de MP sin guardar tarjetas en la app.",
  },
  {
    icon: "money" as const,
    titulo: "Efectivo en el club",
    descripcion:
      "Disponible al reservar turnos. La reserva queda pendiente hasta que abones en recepción.",
  },
  {
    icon: "id-card" as const,
    titulo: "Licencia FAP",
    descripcion:
      "La solicitud de carnet es gratuita desde la app. La habilitación y renovación anual la confirma la federación.",
  },
];

export default function MetodosPagoScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-brand-black px-6">
      <ScreenHeader title="Métodos de pago" />
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: insets.bottom + 28, gap: 16 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-sans text-base text-brand-muted">
          Padel Nexus no almacena datos de tarjetas. Los pagos online se procesan
          con Mercado Pago en cada operación.
        </Text>

        {METODOS.map((metodo) => (
          <View
            key={metodo.titulo}
            className="flex-row gap-3 rounded-card border border-brand-border bg-brand-surface p-4"
          >
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand-chartreuse/10">
              <FontAwesome name={metodo.icon} size={18} color="#CBFE01" />
            </View>
            <View className="flex-1 gap-1">
              <Text className="font-sans-semibold text-base text-white">
                {metodo.titulo}
              </Text>
              <Text className="font-sans text-sm text-brand-muted">
                {metodo.descripcion}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
