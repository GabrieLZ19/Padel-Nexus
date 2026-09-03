import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFocusEffect } from "@react-navigation/native";

import {
  SettingsNavRow,
  SettingsSection,
  SettingsToggleRow,
} from "@/src/components/perfil/SettingsList";
import { AppScreen } from "@/src/components/layout/AppScreen";
import { Skeleton } from "@/src/components/ui/Skeleton";
import { PerfilService } from "@/src/services/perfil";
import { useAuthStore } from "@/src/stores/authStore";
import type { PreferenciasNotificacion } from "@/src/types/user.types";

const DEFAULT_PREFS: PreferenciasNotificacion = {
  push: true,
  email: true,
  whatsapp: false,
};

function initialsFromName(nombre?: string | null, apellido?: string | null) {
  const first = (nombre || "").trim().charAt(0);
  const last = (apellido || "").trim().charAt(0);
  const value = `${first}${last}`.toUpperCase();
  return value || "J";
}

function normalizePrefs(
  value?: PreferenciasNotificacion | null,
): PreferenciasNotificacion {
  return {
    push: value?.push ?? DEFAULT_PREFS.push,
    email: value?.email ?? DEFAULT_PREFS.email,
    whatsapp: value?.whatsapp ?? DEFAULT_PREFS.whatsapp,
  };
}

export default function PerfilTab() {
  const router = useRouter();
  const usuario = useAuthStore((s) => s.usuario);
  const setUsuario = useAuthStore((s) => s.setUsuario);
  const logout = useAuthStore((s) => s.logout);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [prefs, setPrefs] = useState<PreferenciasNotificacion>(DEFAULT_PREFS);
  const [prefError, setPrefError] = useState<string | null>(null);
  const [prefSaved, setPrefSaved] = useState(false);
  const [prefSaving, setPrefSaving] = useState(false);

  const refreshPerfil = useCallback(async () => {
    const perfil = await PerfilService.getMe();
    if (perfil) {
      setUsuario(perfil);
      setPrefs(normalizePrefs(perfil.preferencias_notificacion));
    }
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

  useEffect(() => {
    if (!prefSaved) return;
    const timer = setTimeout(() => setPrefSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [prefSaved]);

  const updatePref = useCallback(
    async (key: keyof PreferenciasNotificacion, value: boolean) => {
      const previous = prefs;
      const next = { ...prefs, [key]: value };
      setPrefs(next);
      setPrefError(null);
      setPrefSaved(false);
      setPrefSaving(true);
      try {
        const updated = await PerfilService.updateMe({
          preferencias_notificacion: next,
        });
        setUsuario(updated);
        setPrefs(normalizePrefs(updated.preferencias_notificacion));
        setPrefSaved(true);
      } catch (err: unknown) {
        setPrefs(previous);
        setPrefError(
          err instanceof Error
            ? err.message
            : "No se pudieron guardar las preferencias.",
        );
      } finally {
        setPrefSaving(false);
      }
    },
    [prefs, setUsuario],
  );

  const nombreCompleto = [usuario?.nombre, usuario?.apellido]
    .filter(Boolean)
    .join(" ");
  const initial = initialsFromName(usuario?.nombre, usuario?.apellido);

  return (
    <AppScreen
      title="Perfil"
      refreshing={refreshing}
      onRefresh={() => void onRefresh()}
    >
      {loading && !usuario ? (
        <View className="gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </View>
      ) : (
        <View className="gap-6">
          <View className="flex-row items-center gap-3 rounded-card border border-brand-border bg-brand-surface p-4">
            {usuario?.avatar_url ? (
              <Image
                source={{ uri: usuario.avatar_url }}
                style={{ width: 56, height: 56, borderRadius: 28 }}
                contentFit="cover"
                cachePolicy="memory-disk"
                priority="high"
                transition={120}
              />
            ) : (
              <View className="h-14 w-14 items-center justify-center rounded-full bg-brand-chartreuse">
                <Text className="font-sans-bold text-xl text-black">
                  {initial}
                </Text>
              </View>
            )}

            <View className="min-w-0 flex-1">
              <Text
                className="font-sans-bold text-lg text-white"
                numberOfLines={1}
              >
                {nombreCompleto || "Jugador"}
              </Text>
              <Text
                className="font-sans text-sm text-brand-muted"
                numberOfLines={1}
              >
                {usuario?.email || "Sin email"}
              </Text>
            </View>

            <Pressable
              onPress={() => router.push("/perfil/datos-personales")}
              className="rounded-full border border-brand-border bg-brand-elevated px-4 py-2 active:opacity-80"
            >
              <Text className="font-sans-semibold text-sm text-brand-chartreuse">
                Editar
              </Text>
            </Pressable>
          </View>

          <SettingsSection title="CUENTA">
            <SettingsNavRow
              label="Datos personales"
              icon={{ set: "fa", name: "user-o" }}
              onPress={() => router.push("/perfil/datos-personales")}
            />
            <SettingsNavRow
              label="Mi licencia"
              icon={{ set: "mci", name: "shield-check-outline" }}
              onPress={() => router.push("/perfil/licencia")}
            />
            <SettingsNavRow
              label="Métodos de pago"
              icon={{ set: "fa", name: "credit-card" }}
              onPress={() => router.push("/perfil/metodos-pago")}
              isLast
            />
          </SettingsSection>

          <SettingsSection title="NOTIFICACIONES">
            <SettingsToggleRow
              label="Notificaciones push"
              icon={{ set: "fa", name: "bell-o" }}
              value={prefs.push}
              onValueChange={(value) => void updatePref("push", value)}
            />
            <SettingsToggleRow
              label="Email"
              icon={{ set: "fa", name: "envelope-o" }}
              value={prefs.email}
              onValueChange={(value) => void updatePref("email", value)}
            />
            <SettingsToggleRow
              label="WhatsApp"
              icon={{ set: "mci", name: "whatsapp" }}
              value={prefs.whatsapp}
              onValueChange={(value) => void updatePref("whatsapp", value)}
              isLast
            />
          </SettingsSection>

          {prefSaving ? (
            <Text className="font-sans text-sm text-brand-muted">
              Guardando preferencias...
            </Text>
          ) : null}
          {prefSaved && !prefError && !prefSaving ? (
            <View className="self-start rounded-full border border-brand-chartreuse/30 bg-brand-chartreuse/10 px-3 py-1.5">
              <Text className="font-sans text-xs text-brand-chartreuse">
                Preferencias guardadas
              </Text>
            </View>
          ) : null}
          {prefError ? (
            <Text className="font-sans text-sm text-red-400">{prefError}</Text>
          ) : null}

          <Pressable
            onPress={() => {
              void logout().then(() => router.replace("/(auth)/login"));
            }}
            className="mt-2 h-14 flex-row items-center justify-center gap-3 rounded-card border border-red-900/70 bg-red-950/40 active:opacity-80"
          >
            <FontAwesome name="sign-out" size={18} color="#F87171" />
            <Text className="font-sans-semibold text-base text-red-400">
              Cerrar sesión
            </Text>
          </Pressable>
        </View>
      )}
    </AppScreen>
  );
}
