import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";

import type { Perfil } from "@/src/types/user.types";

interface HomeHeaderProps {
  usuario: Perfil | null;
  unreadCount?: number;
  onNotificationsPress?: () => void;
  onAvatarPress?: () => void;
}

function getInitials(usuario: Perfil | null): string {
  const first = usuario?.nombre?.trim().charAt(0) || "";
  const last = usuario?.apellido?.trim().charAt(0) || "";
  return (first + last).toUpperCase() || "J";
}

export function HomeHeader({
  usuario,
  unreadCount = 0,
  onNotificationsPress,
  onAvatarPress,
}: HomeHeaderProps) {
  const nombre = usuario?.nombre || "Jugador";
  const subtitle = [usuario?.categoria_padel, usuario?.lugar_residencia]
    .filter(Boolean)
    .join(" · ");

  return (
    <View className="flex-row items-start justify-between gap-4">
      <View className="flex-1 gap-1">
        <Text className="font-sans-bold text-[28px] leading-8 text-white">
          Hola,{" "}
          <Text className="text-brand-chartreuse">{nombre}</Text>
        </Text>
        {subtitle ? (
          <Text className="font-sans text-sm text-brand-muted">{subtitle}</Text>
        ) : null}
      </View>

      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={onNotificationsPress}
          accessibilityRole="button"
          accessibilityLabel="Notificaciones"
          className="relative h-11 w-11 items-center justify-center rounded-full border border-brand-border bg-brand-surface active:opacity-80"
        >
          <FontAwesome name="bell-o" size={18} color="#FFFFFF" />
          {unreadCount > 0 ? (
            <View className="absolute -right-0.5 -top-0.5 h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-chartreuse px-1">
              <Text className="font-sans-bold text-[10px] text-black">
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          onPress={onAvatarPress}
          accessibilityRole="button"
          accessibilityLabel="Ir al perfil"
          className="h-11 w-11 overflow-hidden rounded-full active:opacity-80"
        >
          {usuario?.avatar_url ? (
            <Image
              source={{ uri: usuario.avatar_url }}
              style={{ width: 44, height: 44 }}
              contentFit="cover"
            />
          ) : (
            <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-chartreuse">
              <Text className="font-sans-bold text-base text-black">
                {getInitials(usuario)}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}
