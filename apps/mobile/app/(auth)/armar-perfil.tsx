import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "@/src/components/ui/Button";
import { SelectField } from "@/src/components/ui/SelectField";
import {
  LADOS_PADEL,
  NIVELES_LIBRES_GRID,
  NIVELES_OTRAS,
  NIVEL_PARTIDO_DEFAULT,
} from "@/src/constants/padelConfig";
import { PerfilService } from "@/src/services/perfil";
import { useAuthStore } from "@/src/stores/authStore";

export default function ArmarPerfilScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setUsuario = useAuthStore((s) => s.setUsuario);
  const [categoria, setCategoria] = useState<string>(NIVEL_PARTIDO_DEFAULT);
  const [ladoPreferido, setLadoPreferido] = useState("Drive");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hint = useMemo(
    () => "Personalizamos torneos y ranking según tu nivel.",
    [],
  );

  const categoriaEnGrilla = NIVELES_LIBRES_GRID.includes(
    categoria as (typeof NIVELES_LIBRES_GRID)[number],
  );

  async function onContinue() {
    if (!categoria) {
      setError("Seleccioná tu categoría.");
      return;
    }
    if (!ladoPreferido) {
      setError("Seleccioná tu lado preferido.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const updated = await PerfilService.updateMe({
        categoria_padel: categoria,
        lado_preferido: ladoPreferido,
      });
      setUsuario(updated);
      router.replace("/(tabs)");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "No se pudo guardar el perfil.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View
      className="flex-1 bg-brand-black"
      style={{ paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
    >
      <ScrollView
        className="flex-1 px-6"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text className="font-sans-bold text-3xl text-white">Armá tu perfil</Text>
        <Text className="mt-2 font-sans text-base text-brand-muted">{hint}</Text>

        <Text className="mb-3 mt-10 font-sans-semibold text-xs tracking-widest text-brand-muted">
          TU CATEGORÍA
        </Text>
        <View className="flex-row flex-wrap gap-3">
          {NIVELES_LIBRES_GRID.map((item) => {
            const selected = item === categoria;
            return (
              <Pressable
                key={item}
                onPress={() => setCategoria(item)}
                className={`h-16 w-[22%] items-center justify-center rounded-card border ${
                  selected
                    ? "border-brand-chartreuse bg-brand-chartreuse"
                    : "border-brand-border bg-brand-elevated"
                }`}
              >
                <Text
                  className={`font-sans-bold text-lg ${
                    selected ? "text-black" : "text-white"
                  }`}
                >
                  {item}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View className="mt-6">
          <SelectField
            label="Otras categorías"
            value={categoriaEnGrilla ? "" : categoria}
            onChange={setCategoria}
            options={NIVELES_OTRAS}
            placeholder="Menores, Ladies, Seniors..."
            icon="trophy"
          />
        </View>

        <Text className="mb-3 mt-8 font-sans-semibold text-xs tracking-widest text-brand-muted">
          LADO PREFERIDO
        </Text>
        <View className="flex-row gap-3">
          {LADOS_PADEL.map((lado) => {
            const selected = lado.value === ladoPreferido;
            return (
              <Pressable
                key={lado.value}
                onPress={() => setLadoPreferido(lado.value)}
                className={`flex-1 items-center justify-center rounded-card border py-4 ${
                  selected
                    ? "border-brand-chartreuse bg-brand-chartreuse"
                    : "border-brand-border bg-brand-elevated"
                }`}
              >
                <Text
                  className={`font-sans-semibold text-base ${
                    selected ? "text-black" : "text-white"
                  }`}
                >
                  {lado.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text className="mt-8 font-sans text-sm text-brand-muted">
          La búsqueda de club favorito se conecta en el próximo bloque de vistas
          generales.
        </Text>

        {error ? (
          <Text className="mt-4 font-sans text-sm text-red-400">{error}</Text>
        ) : null}

        <View className="mt-auto pt-8">
          <Button
            label="Continuar"
            loading={loading}
            onPress={() => void onContinue()}
          />
        </View>
      </ScrollView>
    </View>
  );
}
