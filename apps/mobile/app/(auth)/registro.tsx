import FontAwesome from "@expo/vector-icons/FontAwesome";
import * as Linking from "expo-linking";
import { Link, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Share, Text, View } from "react-native";
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

function calcularEsMenor(fechaIso: string): boolean {
  const nacimiento = parseIsoDate(fechaIso);
  if (!nacimiento) return false;
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad -= 1;
  return edad < 18;
}

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
  const [aceptaTyc, setAceptaTyc] = useState(false);
  const [aceptaPrivacidad, setAceptaPrivacidad] = useState(false);
  const [respNombre, setRespNombre] = useState("");
  const [respApellido, setRespApellido] = useState("");
  const [respDni, setRespDni] = useState("");
  const [respEmail, setRespEmail] = useState("");
  const [respTelefono, setRespTelefono] = useState("");
  const [respVinculo, setRespVinculo] = useState("");
  const [parentalUrl, setParentalUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const fechaIsoPreview = useMemo(() => {
    return formatIsoDate(parseIsoDate(fechaNacimiento)) || "";
  }, [fechaNacimiento]);

  const esMenor = fechaIsoPreview ? calcularEsMenor(fechaIsoPreview) : false;

  async function onSubmit() {
    setError(null);
    const nextFieldErrors: FieldErrors = {};

    if (!aceptaTyc || !aceptaPrivacidad) {
      setError("Debés aceptar Términos y Política de Privacidad.");
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
    if (!fechaIso || !birthDate || birthDate > new Date()) {
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

    const menor = calcularEsMenor(fechaIso);
    if (menor) {
      if (
        !respNombre.trim() ||
        !respApellido.trim() ||
        !respDni.trim() ||
        !respEmail.trim() ||
        !respTelefono.trim() ||
        !respVinculo.trim()
      ) {
        setError("Completá los datos del responsable parental.");
        return;
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setError("Por favor, corregí los errores en los campos marcados.");
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      const registro = await register({
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
        acepta_tyc: aceptaTyc,
        acepta_privacidad: aceptaPrivacidad,
        responsable: menor
          ? {
              nombre: respNombre.trim(),
              apellido: respApellido.trim(),
              dni: normalizeDni(respDni),
              email: respEmail.trim(),
              telefono: respTelefono.trim(),
              vinculo: respVinculo.trim(),
            }
          : undefined,
      });

      if (registro.data?.parental?.consent_url) {
        setParentalUrl(registro.data.parental.consent_url);
        return;
      }
      router.replace("/(auth)/armar-perfil");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo registrar.");
    } finally {
      setLoading(false);
    }
  }

  if (parentalUrl) {
    const deepLink = parentalUrl.includes("/consentimiento-parental/")
      ? `padelnexus://consentimiento-parental?token=${parentalUrl.split("/").pop()}`
      : parentalUrl;

    return (
      <View className="flex-1 bg-brand-black">
        <AuthFormScroll topInset={insets.top + 12} bottomInset={insets.bottom}>
          <Text className="font-sans-bold text-2xl uppercase text-white">
            Consentimiento parental
          </Text>
          <Text className="mt-3 font-sans text-base text-brand-muted">
            Compartí este enlace con el responsable parental. También podés
            abrirlo en el navegador.
          </Text>
          <Text className="mt-4 font-sans text-xs text-white">{parentalUrl}</Text>
          <View className="mt-6 gap-3">
            <Button
              label="Compartir enlace"
              onPress={() => void Share.share({ message: parentalUrl })}
            />
            <Button
              label="Abrir enlace web"
              variant="ghost"
              onPress={() => void Linking.openURL(parentalUrl)}
            />
            <Button
              label="Abrir en la app"
              variant="ghost"
              onPress={() => {
                const token = parentalUrl.split("/").pop() || "";
                router.push(
                  `/(auth)/consentimiento-parental?token=${encodeURIComponent(token)}` as never,
                );
              }}
            />
            <Button
              label="Continuar"
              onPress={() => router.replace("/(auth)/armar-perfil")}
            />
          </View>
          <Text className="mt-4 font-sans text-xs text-brand-muted">
            Deep link: {deepLink}
          </Text>
        </AuthFormScroll>
      </View>
    );
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
                label="Fecha de nacimiento *"
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

          {esMenor ? (
            <View className="gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
              <Text className="font-sans-bold text-sm text-amber-200">
                Cuenta de menor detectada
              </Text>
              <Text className="font-sans text-xs text-amber-100/80">
                Completá los datos del responsable parental.
              </Text>
              <TextField
                label="Nombre responsable"
                value={respNombre}
                onChangeText={setRespNombre}
              />
              <TextField
                label="Apellido responsable"
                value={respApellido}
                onChangeText={setRespApellido}
              />
              <TextField
                label="DNI responsable"
                keyboardType="number-pad"
                value={respDni}
                onChangeText={(v) => setRespDni(sanitizeDniInput(v))}
              />
              <TextField
                label="Vínculo"
                value={respVinculo}
                onChangeText={setRespVinculo}
                placeholder="Madre / Padre / Tutor"
              />
              <TextField
                label="Email responsable"
                autoCapitalize="none"
                keyboardType="email-address"
                value={respEmail}
                onChangeText={setRespEmail}
              />
              <TextField
                label="Teléfono responsable"
                keyboardType="phone-pad"
                value={respTelefono}
                onChangeText={(v) => setRespTelefono(sanitizeTelefonoInput(v))}
              />
            </View>
          ) : null}

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
          onPress={() => setAceptaTyc((v) => !v)}
          className="mt-6 flex-row items-start gap-3"
        >
          <View
            className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
              aceptaTyc
                ? "border-brand-chartreuse bg-brand-chartreuse"
                : "border-brand-border"
            }`}
          >
            {aceptaTyc ? (
              <FontAwesome name="check" size={11} color="#000" />
            ) : null}
          </View>
          <Text className="flex-1 font-sans text-sm leading-5 text-brand-muted">
            Acepto los Términos y Condiciones
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setAceptaPrivacidad((v) => !v)}
          className="mt-3 flex-row items-start gap-3"
        >
          <View
            className={`mt-0.5 h-5 w-5 items-center justify-center rounded border ${
              aceptaPrivacidad
                ? "border-brand-chartreuse bg-brand-chartreuse"
                : "border-brand-border"
            }`}
          >
            {aceptaPrivacidad ? (
              <FontAwesome name="check" size={11} color="#000" />
            ) : null}
          </View>
          <Text className="flex-1 font-sans text-sm leading-5 text-brand-muted">
            Acepto la Política de Privacidad
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
