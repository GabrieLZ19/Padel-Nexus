import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthFormScroll } from "@/src/components/ui/AuthFormScroll";
import { BrandMark } from "@/src/components/ui/BrandMark";
import { Button } from "@/src/components/ui/Button";
import { TextField } from "@/src/components/ui/TextField";
import { useAuthStore } from "@/src/stores/authStore";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const login = useAuthStore((s) => s.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Completá email y contraseña.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/(tabs)");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-brand-black">
      <AuthFormScroll topInset={insets.top + 24} bottomInset={insets.bottom}>
        <Animated.View entering={FadeInDown.delay(40).duration(400)}>
          <BrandMark size={56} />
          <Text className="mt-8 font-sans-bold text-4xl text-white">
            Bienvenido
          </Text>
          <Text className="mt-2 font-sans text-base text-brand-muted">
            Ingresá para competir, reservar y comprar.
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(120).duration(400)}
          className="mt-10 gap-5"
        >
          <TextField
            label="Email"
            icon="envelope"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            placeholder="tucorreo@email.com"
            value={email}
            onChangeText={setEmail}
          />
          <TextField
            label="Contraseña"
            icon="lock"
            secureToggle
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
          />
          <Link href="/(auth)/recuperar" asChild>
            <Pressable>
              <Text className="font-sans-semibold text-sm text-brand-chartreuse">
                ¿Olvidaste tu contraseña?
              </Text>
            </Pressable>
          </Link>
          {error ? (
            <Text className="font-sans text-sm text-red-400">{error}</Text>
          ) : null}
          <Button
            label="Iniciar sesión"
            loading={loading}
            onPress={() => void onSubmit()}
          />
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(220).duration(400)}
          className="mt-8"
        >
          <View className="mb-6 flex-row items-center gap-3">
            <View className="h-px flex-1 bg-brand-border" />
            <Text className="font-sans text-sm text-brand-muted">
              o continuá con
            </Text>
            <View className="h-px flex-1 bg-brand-border" />
          </View>
          <View className="flex-row justify-center gap-3">
            {(["globe", "apple", "facebook"] as const).map((icon) => (
              <Pressable
                key={icon}
                accessibilityRole="button"
                accessibilityState={{ disabled: true }}
                className="h-14 w-14 items-center justify-center rounded-field border border-brand-border bg-brand-elevated opacity-50"
              >
                <FontAwesome name={icon} size={20} color="#FFFFFF" />
              </Pressable>
            ))}
          </View>
        </Animated.View>

        <View className="mt-auto pt-10">
          <Text className="text-center font-sans text-base text-brand-muted">
            ¿No tenés cuenta?{" "}
            <Link
              href="/(auth)/registro"
              className="font-sans-bold text-brand-chartreuse"
            >
              Registrate
            </Link>
          </Text>
        </View>
      </AuthFormScroll>
    </View>
  );
}
