import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AuthFormScroll } from "@/src/components/ui/AuthFormScroll";
import { AvatarPickerField } from "@/src/components/ui/AvatarPickerField";
import { Button } from "@/src/components/ui/Button";
import { DateField } from "@/src/components/ui/DateField";
import { SelectField } from "@/src/components/ui/SelectField";
import { TextField } from "@/src/components/ui/TextField";
import { NIVEL_PARTIDO_DEFAULT, SEXOS } from "@/src/constants/padelConfig";
import type { AvatarSelection } from "@/src/lib/avatarPicker";
import { formatIsoDate, parseIsoDate } from "@/src/lib/dateUtils";
import {
  normalizeDni,
  sanitizeDniInput,
  sanitizeTelefonoInput,
  validateDni,
  validateTelefono,
} from "@/src/lib/validation";
import { useAuthStore } from "@/src/stores/authStore";

type FieldErrors = {
  telefono?: string;
  dni?: string;
};

export default function RegistroScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const register = useAuthStore((s) => s.register);

  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [dni, setDni] = useState("");
  const [provincia, setProvincia] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [sexo, setSexo] = useState("masculino");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<AvatarSelection | null>(null);
  const [acepta, setAcepta] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  async function onSubmit() {
    setError(null);
    const nextFieldErrors: FieldErrors = {};

    if (!acepta) {
      setError("Debés aceptar el reglamento FAP.");
      return;
    }
    if (
      !nombre ||
      !apellido ||
      !email ||
      !dni ||
      !provincia ||
      !fechaNacimiento ||
      !password
    ) {
      setError("Completá los campos obligatorios.");
      return;
    }

    const fechaIso = formatIsoDate(parseIsoDate(fechaNacimiento));
    const birthDate = parseIsoDate(fechaIso);
    if (!fechaIso || birthDate > new Date()) {
      setError("Ingresá una fecha de nacimiento válida.");
      return;
    }

    if (!validateDni(dni)) {
      nextFieldErrors.dni = "El DNI debe tener 7 u 8 dígitos (ej: 40234567).";
    }
    if (telefono.trim() && !validateTelefono(telefono)) {
      nextFieldErrors.telefono =
        "El teléfono debe ser válido (mín. 10 dígitos, ej: +54 9 351...).";
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("Por favor, corregí los errores en los campos marcados.");
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        telefono: telefono.trim(),
        dni: normalizeDni(dni),
        lugar_residencia: provincia,
        fecha_nacimiento: fechaIso,
        sexo,
        categoria_padel: NIVEL_PARTIDO_DEFAULT,
        lado_preferido: "Drive",
        avatar_base64: avatar?.base64,
      });
      router.replace("/(auth)/armar-perfil");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo registrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-brand-black">
      <AuthFormScroll topInset={insets.top + 12} bottomInset={insets.bottom}>
        <Pressable
          onPress={() => router.back()}
          className="mb-6 h-10 w-10 items-center justify-center rounded-field border border-brand-border"
        >
          <FontAwesome name="chevron-left" size={14} color="#fff" />
        </Pressable>

        <Animated.View entering={FadeInDown.duration(350)}>
          <Text className="font-sans-bold text-3xl uppercase text-white">
            Creá tu cuenta
          </Text>
          <Text className="mt-2 font-sans text-base text-brand-muted">
            Completá tus datos como jugador para empezar a competir.
          </Text>
        </Animated.View>

        <View className="mt-8 gap-4">
          <AvatarPickerField value={avatar} onChange={setAvatar} />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <TextField
                label="Nombre"
                value={nombre}
                onChangeText={setNombre}
                placeholder="Tomás"
              />
            </View>
            <View className="flex-1">
              <TextField
                label="Apellido"
                value={apellido}
                onChangeText={setApellido}
                placeholder="García"
              />
            </View>
          </View>
          <TextField
            label="Email"
            icon="envelope"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            placeholder="jugador@email.com"
          />
          <TextField
            label="Teléfono"
            icon="phone"
            keyboardType="phone-pad"
            value={telefono}
            onChangeText={(value) => {
              setTelefono(sanitizeTelefonoInput(value));
              if (fieldErrors.telefono) {
                setFieldErrors((prev) => ({ ...prev, telefono: undefined }));
              }
            }}
            placeholder="+54 9 ..."
            error={fieldErrors.telefono}
          />
          <TextField
            label="DNI"
            icon="credit-card"
            keyboardType="number-pad"
            value={dni}
            onChangeText={(value) => {
              setDni(sanitizeDniInput(value));
              if (fieldErrors.dni) {
                setFieldErrors((prev) => ({ ...prev, dni: undefined }));
              }
            }}
            placeholder="30123456"
            error={fieldErrors.dni}
          />
          <SelectField
            label="Provincia"
            value={provincia}
            onChange={setProvincia}
            placeholder="Seleccioná"
          />
          <View className="flex-row gap-3">
            <View className="flex-1">
              <DateField
                label="Fecha de nacimiento"
                value={fechaNacimiento}
                onChange={setFechaNacimiento}
                placeholder="DD/MM/AAAA"
              />
            </View>
            <View className="flex-1">
              <SelectField
                label="Sexo"
                value={sexo}
                onChange={setSexo}
                options={SEXOS}
                placeholder="Seleccioná"
                icon="user"
              />
            </View>
          </View>
          <TextField
            label="Contraseña"
            icon="lock"
            secureToggle
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo 8 caracteres"
          />
        </View>

        <Pressable
          onPress={() => setAcepta((v) => !v)}
          className="mt-6 flex-row items-start gap-3"
        >
          <View
            className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
              acepta
                ? "border-brand-chartreuse bg-brand-chartreuse"
                : "border-brand-border"
            }`}
          >
            {acepta ? <FontAwesome name="check" size={11} color="#000" /> : null}
          </View>
          <Text className="flex-1 font-sans text-sm leading-5 text-brand-muted">
            Acepto los términos y el reglamento de competencia FAP
          </Text>
        </Pressable>

        {error ? (
          <Text className="mt-4 font-sans text-sm text-red-400">{error}</Text>
        ) : null}

        <View className="mt-6">
          <Button
            label="Crear cuenta"
            loading={loading}
            onPress={() => void onSubmit()}
          />
        </View>

        <Text className="mt-6 text-center font-sans text-base text-brand-muted">
          Ya tengo cuenta ·{" "}
          <Link
            href="/(auth)/login"
            className="font-sans-bold text-brand-chartreuse"
          >
            Iniciar sesión
          </Link>
        </Text>
      </AuthFormScroll>
    </View>
  );
}
