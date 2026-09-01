import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFocusEffect } from "@react-navigation/native";

import { AppScreen } from "@/src/components/layout/AppScreen";
import { Button } from "@/src/components/ui/Button";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { formatDateDisplay } from "@/src/lib/dateUtils";
import { PerfilService } from "@/src/services/perfil";
import { useAuthStore } from "@/src/stores/authStore";

function PerfilRow({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon: React.ComponentProps<typeof FontAwesome>["name"];
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-card border border-brand-border bg-brand-surface px-4 py-3">
      <View className="h-9 w-9 items-center justify-center rounded-xl bg-brand-chartreuse/10">
        <FontAwesome name={icon} size={16} color="#CBFE01" />
      </View>
      <View className="flex-1">
        <Text className="font-sans text-xs text-brand-muted">{label}</Text>
        <Text className="font-sans-semibold text-base text-white">
          {value || "—"}
        </Text>
      </View>
    </View>
  );
}

export default function PerfilTab() {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);
  const setUsuario = useAuthStore((s) => s.setUsuario);
  const logout = useAuthStore((s) => s.logout);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refreshPerfil = useCallback(async () => {
    const perfil = await PerfilService.getMe();
    if (perfil) setUsuario(perfil);
  }, [setUsuario]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void refreshPerfil()
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [refreshPerfil]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refreshPerfil();
    } finally {
      setRefreshing(false);
    }
  }, [refreshPerfil]);

  const nombreCompleto = [usuario?.nombre, usuario?.apellido]
    .filter(Boolean)
    .join(" ");

  return (
    <AppScreen
      title="Perfil"
      subtitle="Tu ficha de jugador"
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}
    >
      {loading && !usuario ? (
        <View className="gap-3">
          <Skeleton className="mx-auto h-24 w-24 rounded-full" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </View>
      ) : (
        <View className="gap-5">
          <View className="items-center gap-3">
            {usuario?.avatar_url ? (
              <Image
                source={{ uri: usuario.avatar_url }}
                style={{ width: 96, height: 96, borderRadius: 48 }}
                contentFit="cover"
              />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-full bg-brand-chartreuse/10">
                <FontAwesome name="user" size={36} color="#CBFE01" />
              </View>
            )}
            <View className="items-center">
              <Text className="font-sans-bold text-2xl text-white">
                {nombreCompleto || "Jugador"}
              </Text>
              <Text className="font-sans text-sm text-brand-muted">
                {usuario?.email}
              </Text>
            </View>
          </View>

          <View className="gap-2">
            <PerfilRow
              label="Categoría"
              value={usuario?.categoria_padel}
              icon="trophy"
            />
            <PerfilRow
              label="Lado preferido"
              value={usuario?.lado_preferido}
              icon="exchange"
            />
            <PerfilRow
              label="Provincia"
              value={usuario?.lugar_residencia}
              icon="map-marker"
            />
            <PerfilRow label="DNI" value={usuario?.dni} icon="id-card" />
            <PerfilRow
              label="Fecha de nacimiento"
              value={
                usuario?.fecha_nacimiento
                  ? formatDateDisplay(usuario.fecha_nacimiento)
                  : null
              }
              icon="birthday-cake"
            />
            <PerfilRow
              label="Ranking nacional"
              value={String(usuario?.ranking_nacional ?? 0)}
              icon="line-chart"
            />
          </View>

          <Button
            label="Cerrar sesión"
            variant="ghost"
            onPress={() => {
              void logout().then(() => router.replace("/(auth)/login"));
            }}
          />
        </View>
      )}
    </AppScreen>
  );
}
