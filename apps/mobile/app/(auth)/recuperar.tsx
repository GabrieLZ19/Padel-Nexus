import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthFormScroll } from "@/src/components/ui/AuthFormScroll";
import { Button } from "@/src/components/ui/Button";
import { TextField } from "@/src/components/ui/TextField";
import { PerfilService } from "@/src/services/perfil";

export default function RecuperarScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit() {
    setError(null);
    setMessage(null);
    if (!email.trim()) {
      setError("Ingresá tu email.");
      return;
    }
    setLoading(true);
    try {
      await PerfilService.recuperarPassword(email.trim());
      setMessage("Si el email existe, te enviamos el link de recuperación.");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "No se pudo enviar el correo.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-brand-black">
      <AuthFormScroll topInset={insets.top + 12} bottomInset={insets.bottom}>
        <Pressable
          onPress={() => router.back()}
          className="mb-8 h-10 w-10 items-center justify-center rounded-field border border-brand-border"
        >
          <FontAwesome name="chevron-left" size={14} color="#fff" />
        </Pressable>
        <Text className="font-sans-bold text-3xl text-white">Recuperar acceso</Text>
        <Text className="mt-2 font-sans text-base text-brand-muted">
          Te enviamos un correo para restablecer tu contraseña.
        </Text>
        <View className="mt-10 gap-5">
          <TextField
            label="Email"
            icon="envelope"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="tucorreo@email.com"
          />
          {error ? (
            <Text className="font-sans text-sm text-red-400">{error}</Text>
          ) : null}
          {message ? (
            <Text className="font-sans text-sm text-brand-chartreuse">
              {message}
            </Text>
          ) : null}
          <Button
            label="Enviar link"
            loading={loading}
            onPress={() => void onSubmit()}
          />
        </View>
      </AuthFormScroll>
    </View>
  );
}
